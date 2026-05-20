const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios'); // 引入gtts模块，用于语音合成

// 导入题库配置管理
const { getAllBanks, getBankByCode, getDefaultBank } = require('./config/banks');

// 导入Redis缓存服务
const {
  saveExamRecord,
  getExamRecords,
  deleteExamRecords,
  cacheQuestions,
  getCachedQuestions,
  saveUserProgress,
  getUserProgress,
  saveExamSession,
  getExamSession,
  deleteExamSession
} = require('./config/redis');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接配置（支持环境变量）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'exam-db',
  charset: 'utf8mb4'
};

// 微信配置（从环境变量读取）
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APPID || 'wxbbfc83572c7db218',
  appSecret: process.env.WECHAT_APPSECRET || '58fa649790458708aa941492f5c15b66',
  // 小程序登录接口
  miniLoginUrl: 'https://api.weixin.qq.com/sns/jscode2session',
  // H5网页授权接口
  h5AccessTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  h5UserInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
  // 扫码登录接口
  qrConnectUrl: 'https://open.weixin.qq.com/connect/qrconnect',
  qrAccessTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token'
};

// 存储扫码登录状态（内存存储，生产环境建议使用Redis）
const qrCodeStore = {};

// 测试模式下的内存用户存储
const mockUsers = {
  'test_openid': { id: 1, openid: 'test_openid', nickname: '测试用户', avatar: '', vip_expire: null, last_login: new Date().toISOString(), createdAt: new Date().toISOString() },
  'dev_openid': { id: 2, openid: 'dev_openid', nickname: '开发用户', avatar: '', vip_expire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), last_login: new Date().toISOString(), createdAt: new Date().toISOString() }
};


// 会员验证中间件
async function checkVipStatus(openid) {
  console.log('checkVipStatus called with openid:', openid);
  if (!openid) {
    return { is_vip: false, message: '请先登录' };
  }
  
  // 测试账号直接通过VIP验证
  if (openid === 'test_openid' || openid === 'dev_openid' || openid === 'o0lS55o_tDbDXQ2rg-Y_XvLikI_U') {
    console.log('测试账号通过VIP验证');
    return { is_vip: true, message: '测试账号' };
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute(
      'SELECT is_vip, vip_expire FROM users WHERE openid = ?',
      [openid]
    );
    await connection.end();
    
    if (users.length === 0) {
      return { is_vip: false, message: '用户不存在' };
    }
    
    const user = users[0];
    const now = new Date();
    const isVipValid = user.is_vip && user.vip_expire && new Date(user.vip_expire) > now;
    
    return {
      is_vip: isVipValid,
      message: isVipValid ? '会员有效' : '会员已过期或未开通'
    };
  } catch (error) {
    console.error('验证会员状态失败:', error);
    return { is_vip: false, message: '验证失败' };
  }
}

// 获取随机题目（需要会员）
app.get('/api/questions/random', async (req, res) => {
  const { openid, bank_code } = req.query;
  const vipStatus = await checkVipStatus(openid);
  
  if (!vipStatus.is_vip) {
    return res.status(403).json({ 
      success: false, 
      message: vipStatus.message,
      need_vip: true 
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    const tableName = bank ? bank.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} ORDER BY RAND() LIMIT 1`
    );
    await connection.end();
    
    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      res.status(404).json({ success: false, message: '没有找到题目' });
    }
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目列表（需要会员）
// 解析字符串形式的数组
function parseArrayString(str) {
  // 如果已经是数组，直接返回
  if (Array.isArray(str)) {
    return str;
  }
  if (!str) return [];
  try {
    // 尝试JSON解析（双引号格式）
    return JSON.parse(str);
  } catch {
    try {
      // 尝试解析单引号格式的数组字符串
      const arrStr = str.trim();
      if (arrStr.startsWith('[') && arrStr.endsWith(']')) {
        const content = arrStr.slice(1, -1);
        const items = content.split(',').map(item => {
          const trimmed = item.trim();
          if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return trimmed.slice(1, -1);
          }
          return trimmed;
        }).filter(item => item !== '');
        return items;
      }
      return [];
    } catch {
      return [];
    }
  }
}

app.get('/api/questions', async (req, res) => {
  try {
    console.log('========== /api/questions 接口被调用 ==========');
    const { openid, bank_code } = req.query;
    console.log('请求参数 openid:', openid, ', bank_code:', bank_code);
    
    const vipStatus = await checkVipStatus(openid);
    console.log('VIP状态:', JSON.stringify(vipStatus));
    
    if (!vipStatus.is_vip) {
      console.log('用户不是会员，返回403');
      return res.status(403).json({ 
        success: false, 
        message: vipStatus.message,
        need_vip: true 
      });
    }
    
    console.log('开始查询数据库...');
    let rows;
    const connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    // 使用题库表名，如果没有则使用默认表名 security_exam_3
    const tableName = (bank && bank.table_name) || 'security_exam_3';
    console.log('使用题库:', bank_code || '默认题库', ', 表名:', tableName);
    
    [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
    console.log(`查询到 ${rows.length} 条题目`);
    
    await connection.end();
    console.log('数据库连接已关闭');
    
    // 处理options和answer字段，将字符串转换为数组
    console.log('开始处理数据...');
    const processedData = rows.map(row => {
      const options = parseArrayString(row.options);
      const answerArray = parseArrayString(row.answer);
      
      // 处理options：如果是对象，转换为值数组；确保是数组
      let optionsArray;
      let optionsObject = null;
      if (Array.isArray(options)) {
        optionsArray = options;
      } else if (typeof options === 'object' && options !== null) {
        // 如果是对象格式 {"对": "正确", "错": "错误"}，转换为数组
        optionsObject = options;
        optionsArray = Object.values(options);
      } else {
        optionsArray = [];
      }
      
      // 将答案数组转换为字母格式（如 ["正确"] -> "A"，["选项1", "选项3"] -> "AC"）
      const answer = answerArray
        .map(answerText => {
          // 检查答案是否已经是字母格式（A-D）
          if (/^[A-Da-d]$/.test(answerText)) {
            return answerText.toUpperCase();
          }
          // 否则在options中查找答案文本对应的索引
          let index = optionsArray.indexOf(answerText);
          // 如果没找到，尝试在对象的键中查找（判断题可能用"对"/"错"作为答案）
          if (index === -1 && optionsObject) {
            const key = Object.keys(optionsObject).find(k => k === answerText || optionsObject[k] === answerText);
            if (key) {
              index = optionsArray.indexOf(optionsObject[key]);
            }
          }
          return index >= 0 ? String.fromCharCode(65 + index) : '';
        })
        .join('');
      
      return {
        ...row,
        options: optionsArray,
        answer: answer
      };
    });
    console.log('数据处理完成');
    
    console.log('准备发送响应...');
    res.json({ success: true, data: processedData });
    console.log('响应发送成功');
  } catch (error) {
    console.error('========== 错误发生 ==========');
    console.error('错误类型:', typeof error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('错误对象:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 根据类型获取题目列表（需要会员）
app.get('/api/questions/type/:type', async (req, res) => {
  const { openid, bank_code } = req.query;
  const questionType = req.params.type;
  const vipStatus = await checkVipStatus(openid);
  
  if (!vipStatus.is_vip) {
    return res.status(403).json({ 
      success: false, 
      message: vipStatus.message,
      need_vip: true 
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    const tableName = bank ? bank.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} WHERE type = ?`,
      [questionType]
    );
    await connection.end();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取随机题目（指定数量，需要会员）
app.get('/api/questions/random/:count', async (req, res) => {
  const { openid, bank_code } = req.query;
  const count = parseInt(req.params.count) || 10;
  const vipStatus = await checkVipStatus(openid);
  
  if (!vipStatus.is_vip) {
    return res.status(403).json({ 
      success: false, 
      message: vipStatus.message,
      need_vip: true 
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    const tableName = bank ? bank.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} ORDER BY RAND() LIMIT ?`,
      [count]
    );
    await connection.end();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题库列表（免费）
app.get('/api/banks', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const banks = await getAllBanks(connection);
    await connection.end();
    res.json({ success: true, data: banks });
  } catch (error) {
    console.error('获取题库列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题库详情（免费）
app.get('/api/banks/:bankCode', async (req, res) => {
  const { bankCode } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const bank = await getBankByCode(connection, bankCode);
    await connection.end();
    
    if (bank) {
      res.json({ success: true, data: bank });
    } else {
      res.status(404).json({ success: false, message: '题库不存在' });
    }
  } catch (error) {
    console.error('获取题库详情失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目类型列表（免费）
app.get('/api/questions/types', async (req, res) => {
  const { bank_code } = req.query;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    const tableName = bank ? bank.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT DISTINCT type FROM ${tableName} WHERE type IS NOT NULL`
    );
    await connection.end();
    res.json({ success: true, data: rows.map(r => r.type) });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目数量统计（免费）
app.get('/api/questions/count', async (req, res) => {
  const { bank_code } = req.query;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取题库配置
    const bank = bank_code ? await getBankByCode(connection, bank_code) : getDefaultBank();
    const tableName = bank ? bank.table_name : 'security_exam_3';
    
    const [total] = await connection.execute(
      `SELECT COUNT(*) as total FROM ${tableName}`
    );
    const [types] = await connection.execute(
      `SELECT type as question_type, COUNT(*) as count FROM ${tableName} WHERE type IS NOT NULL GROUP BY type`
    );
    await connection.end();
    res.json({ 
      success: true, 
      data: {
        total: total[0].total,
        types: types,
        bank_code: bank_code || 'default'
      }
    });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 微信登录API
app.post('/api/auth/login', async (req, res) => {
  const { code, loginType = 'mini' } = req.body;
  
  console.log('收到登录请求:', req.body);
  
  if (!code) {
    console.log('缺少code参数');
    return res.status(400).json({ message: '缺少code参数' });
  }
  
  try {
    let openid, session_key;
    
    // 开发测试模式：如果code为特定值，模拟登录
    if (code === 'test' || code === 'dev' || code.startsWith('mock_')) {
      console.log('使用测试模式登录');
      openid = code === 'test' ? 'test_openid' : (code === 'dev' ? 'dev_openid' : code);
      session_key = 'mock_session_key';
    } else if (loginType === 'h5') {
      // H5网页授权登录
      console.log('使用H5网页授权登录, code:', code);
      // 第一步：获取access_token和openid
      const tokenResponse = await axios.get(WECHAT_CONFIG.h5AccessTokenUrl, {
        params: {
          appid: WECHAT_CONFIG.appId,
          secret: WECHAT_CONFIG.appSecret,
          code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000
      });
      
      console.log('H5授权接口返回:', tokenResponse.data);
      const { access_token, openid: wxOpenid, errcode, errmsg } = tokenResponse.data;
      
      if (errcode) {
        console.log('H5授权接口错误:', errcode, errmsg);
        return res.status(400).json({ message: '微信H5登录失败: ' + errmsg });
      }
      
      if (!wxOpenid) {
        console.log('H5授权未获取到openid');
        return res.status(400).json({ message: '微信H5登录失败' });
      }
      
      openid = wxOpenid;
      session_key = access_token; // 使用access_token作为session_key存储
    } else {
      // 小程序登录
      console.log('使用小程序登录, code:', code);
      const response = await axios.get(WECHAT_CONFIG.miniLoginUrl, {
        params: {
          appid: WECHAT_CONFIG.appId,
          secret: WECHAT_CONFIG.appSecret,
          js_code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000
      });
      
      console.log('小程序登录接口返回:', response.data);
      const { openid: wxOpenid, session_key: wxSessionKey, errcode, errmsg } = response.data;
      
      if (errcode) {
        console.log('小程序登录接口错误:', errcode, errmsg);
        return res.status(400).json({ message: '微信登录失败: ' + errmsg });
      }
      
      if (!wxOpenid) {
        console.log('小程序登录未获取到openid');
        return res.status(400).json({ message: '微信登录失败' });
      }
      
      openid = wxOpenid;
      session_key = wxSessionKey;
    }
    
    let user;
    const isTestMode = code === 'test' || code === 'dev' || code.startsWith('mock_');
    
    if (isTestMode) {
      // 测试模式：使用内存用户存储
      if (mockUsers[openid]) {
        user = mockUsers[openid];
        user.last_login = new Date().toISOString();
      } else {
        // 创建新的测试用户
        const newId = Object.keys(mockUsers).length + 1;
        user = {
          id: newId,
          openid,
          nickname: `测试用户${newId}`,
          avatar: '',
          vip_expire: null,
          last_login: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        mockUsers[openid] = user;
      }
    } else {
      // 查询或创建用户
      try {
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE openid = ?',
          [openid]
        );
        
        if (users.length > 0) {
          // 更新登录时间
          await connection.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE openid = ?',
            [openid]
          );
          user = users[0];
        } else {
          // 创建新用户
          const [result] = await connection.execute(
            'INSERT INTO users (openid, session_key, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [openid, session_key]
          );
          user = {
            id: result.insertId,
            openid,
            session_key,
            is_vip: false,
            vip_expire: null,
            created_at: new Date()
          };
        }
        
        await connection.end();
      } catch (dbError) {
        // 数据库连接失败，使用Mock用户数据
        console.error('数据库连接失败，使用Mock用户数据:', dbError.message);
        if (mockUsers[openid]) {
          user = mockUsers[openid];
          user.last_login = new Date().toISOString();
        } else {
          // 创建新的mock用户
          const newId = Object.keys(mockUsers).length + 1;
          user = {
            id: newId,
            openid,
            nickname: `用户${newId}`,
            avatar: '',
            vip_expire: null,
            last_login: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          mockUsers[openid] = user;
        }
      }
    }
    
    // 测试账号默认设置为VIP
    const isVip = isTestMode ? true : (user.is_vip || false);
    const vipExpire = isTestMode ? '2099-12-31 23:59:59' : user.vip_expire;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        openid: user.openid,
        is_vip: isVip,
        vip_expire: vipExpire,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

// 获取用户会员状态
app.get('/api/user/vip-status', async (req, res) => {
  const { openid } = req.query;
  
  console.log('========== /api/user/vip-status 接口被调用 ==========');
  console.log('请求参数 openid:', openid);
  
  if (!openid) {
    return res.status(400).json({ message: '缺少openid参数' });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute(
      'SELECT is_vip, vip_expire FROM users WHERE openid = ?',
      [openid]
    );
    await connection.end();
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    const now = new Date();
    const isVipValid = user.is_vip && user.vip_expire && new Date(user.vip_expire) > now;
    
    console.log('VIP状态查询结果:', { is_vip: isVipValid, vip_expire: user.vip_expire });
    
    res.json({
      success: true,
      data: {
        is_vip: isVipValid,
        vip_expire: user.vip_expire
      }
    });
  } catch (error) {
    console.error('查询会员状态失败:', error);
    res.status(500).json({ message: '查询失败' });
  }
});

// 购买会员
app.post('/api/user/buy-vip', async (req, res) => {
  const { openid, package_type } = req.body;
  
  if (!openid || !package_type) {
    return res.status(400).json({ message: '缺少参数' });
  }
  
  // 套餐配置
  const packages = {
    monthly: { days: 30, price: 9.9 },
    quarterly: { days: 90, price: 25 },
    yearly: { days: 365, price: 88 }
  };
  
  const pkg = packages[package_type];
  if (!pkg) {
    return res.status(400).json({ message: '无效的套餐类型' });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 查询用户当前会员到期时间
    const [users] = await connection.execute(
      'SELECT vip_expire FROM users WHERE openid = ?',
      [openid]
    );
    
    if (users.length === 0) {
      await connection.end();
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const currentExpire = users[0].vip_expire;
    let newExpire;
    
    if (currentExpire && new Date(currentExpire) > new Date()) {
      // 如果会员未过期，延长有效期
      const expireDate = new Date(currentExpire);
      expireDate.setDate(expireDate.getDate() + pkg.days);
      newExpire = expireDate;
    } else {
      // 否则从当前时间开始计算
      newExpire = new Date();
      newExpire.setDate(newExpire.getDate() + pkg.days);
    }
    
    // 更新会员状态
    await connection.execute(
      'UPDATE users SET is_vip = ?, vip_expire = ? WHERE openid = ?',
      [true, newExpire.toISOString().slice(0, 19).replace('T', ' '), openid]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: {
        is_vip: true,
        vip_expire: newExpire,
        package_type,
        days: pkg.days
      }
    });
  } catch (error) {
    console.error('购买会员失败:', error);
    res.status(500).json({ message: '购买失败' });
  }
});

// 更新用户信息
app.post('/api/user/update', async (req, res) => {
  const { openid, nickname, avatar } = req.body;
  
  if (!openid) {
    return res.status(400).json({ message: '缺少openid参数' });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'UPDATE users SET nickname = ?, avatar = ? WHERE openid = ?',
      [nickname, avatar, openid]
    );
    await connection.end();
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ message: '更新失败' });
  }
});

// 扫码登录：生成二维码
app.get('/api/auth/qrcode', async (req, res) => {
  try {
    // 生成唯一ticket
    const ticket = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // 构建回调地址（需要在微信开发者后台配置授权回调域名）
    const redirectUri = encodeURIComponent('https://scary-lung-scabby.ngrok-free.dev/api/auth/qrcode/callback');
    
    // 构建二维码URL（使用snsapi_login scope）
    const qrcodeUrl = `${WECHAT_CONFIG.qrConnectUrl}?appid=${WECHAT_CONFIG.appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${ticket}#wechat_redirect`;
    
    // 存储扫码状态
    qrCodeStore[ticket] = {
      status: 'waiting', // waiting, scanned, confirmed, expired
      code: null,
      createdAt: Date.now()
    };
    
    console.log('生成扫码登录二维码:', ticket);
    
    res.json({
      success: true,
      data: {
        ticket,
        qrcode: qrcodeUrl
      }
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({ success: false, message: '生成二维码失败' });
  }
});

// 扫码登录：回调接口（微信服务器调用）
app.get('/api/auth/qrcode/callback', async (req, res) => {
  const { code, state } = req.query;
  const ticket = state;
  
  console.log('收到扫码回调:', { code, ticket });
  
  if (!code || !ticket) {
    return res.send('<script>alert("登录失败"); window.close();</script>');
  }
  
  try {
    // 使用code获取access_token和openid
    const tokenResponse = await axios.get(WECHAT_CONFIG.qrAccessTokenUrl, {
      params: {
        appid: WECHAT_CONFIG.appId,
        secret: WECHAT_CONFIG.appSecret,
        code: code,
        grant_type: 'authorization_code'
      },
      timeout: 10000
    });
    
    const { access_token, openid, errcode, errmsg } = tokenResponse.data;
    
    if (errcode) {
      console.log('扫码授权接口错误:', errcode, errmsg);
      return res.send('<script>alert("授权失败"); window.close();</script>');
    }
    
    // 更新扫码状态
    if (qrCodeStore[ticket]) {
      qrCodeStore[ticket].status = 'confirmed';
      qrCodeStore[ticket].code = code;
      qrCodeStore[ticket].openid = openid;
      qrCodeStore[ticket].accessToken = access_token;
    }
    
    // 返回成功页面
    res.send('<script>alert("登录成功"); window.close();</script>');
  } catch (error) {
    console.error('扫码回调处理失败:', error);
    res.send('<script>alert("登录失败"); window.close();</script>');
  }
});

// 扫码登录：检查扫码状态（前端轮询调用）
app.get('/api/auth/qrcode/check', async (req, res) => {
  const { ticket } = req.query;
  
  if (!ticket || !qrCodeStore[ticket]) {
    return res.json({
      success: true,
      data: {
        status: 'expired'
      }
    });
  }
  
  const qrState = qrCodeStore[ticket];
  
  // 检查是否过期（5分钟）
  if (Date.now() - qrState.createdAt > 5 * 60 * 1000) {
    delete qrCodeStore[ticket];
    return res.json({
      success: true,
      data: {
        status: 'expired'
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      status: qrState.status,
      code: qrState.status === 'confirmed' ? qrState.code : null
    }
  });
});

// ==================== 缓存相关API ====================

/**
 * 获取用户做题记录
 * GET /api/exam/records
 * @param {string} openid - 用户openid
 */
app.get('/api/exam/records', async (req, res) => {
  const { openid } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const records = await getExamRecords(openid);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取做题记录失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 保存做题记录
 * POST /api/exam/record
 * @param {string} openid - 用户openid
 * @param {object} record - 做题记录
 */
app.post('/api/exam/record', async (req, res) => {
  const { openid, record } = req.body;
  
  if (!openid || !record) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const result = await saveExamRecord(openid, record);
    if (result) {
      res.json({ success: true, message: '保存成功' });
    } else {
      res.status(500).json({ success: false, message: '保存失败' });
    }
  } catch (error) {
    console.error('保存做题记录失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 删除用户做题记录
 * DELETE /api/exam/records
 * @param {string} openid - 用户openid
 */
app.delete('/api/exam/records', async (req, res) => {
  const { openid } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const result = await deleteExamRecords(openid);
    if (result) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(500).json({ success: false, message: '删除失败' });
    }
  } catch (error) {
    console.error('删除做题记录失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 获取用户答题进度
 * GET /api/exam/progress
 * @param {string} openid - 用户openid
 * @param {string} bank_code - 题库代码（可选）
 */
app.get('/api/exam/progress', async (req, res) => {
  const { openid, bank_code } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const progress = await getUserProgress(openid, bank_code || 'default');
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('获取答题进度失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 保存用户答题进度
 * POST /api/exam/progress
 * @param {string} openid - 用户openid
 * @param {string} bank_code - 题库代码
 * @param {object} progress - 进度数据
 */
app.post('/api/exam/progress', async (req, res) => {
  const { openid, bank_code, progress } = req.body;
  
  if (!openid || !progress) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const result = await saveUserProgress(openid, bank_code || 'default', progress);
    if (result) {
      res.json({ success: true, message: '保存成功' });
    } else {
      res.status(500).json({ success: false, message: '保存失败' });
    }
  } catch (error) {
    console.error('保存答题进度失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 获取考试会话（继续上次考试）
 * GET /api/exam/session
 * @param {string} openid - 用户openid
 */
app.get('/api/exam/session', async (req, res) => {
  const { openid } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const session = await getExamSession(openid);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('获取考试会话失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 保存考试会话
 * POST /api/exam/session
 * @param {string} openid - 用户openid
 * @param {object} session - 会话数据
 */
app.post('/api/exam/session', async (req, res) => {
  const { openid, session } = req.body;
  
  if (!openid || !session) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const result = await saveExamSession(openid, session);
    if (result) {
      res.json({ success: true, message: '保存成功' });
    } else {
      res.status(500).json({ success: false, message: '保存失败' });
    }
  } catch (error) {
    console.error('保存考试会话失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 删除考试会话
 * DELETE /api/exam/session
 * @param {string} openid - 用户openid
 */
app.delete('/api/exam/session', async (req, res) => {
  const { openid } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const result = await deleteExamSession(openid);
    if (result) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(500).json({ success: false, message: '删除失败' });
    }
  } catch (error) {
    console.error('删除考试会话失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 语音合成接口
 * POST /api/speech
 * @param {string} text - 需要合成的文本
 */
app.post('/api/speech', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ success: false, message: '缺少text参数' });
  }
  
  // 当前环境网络受限，无法访问外部语音合成服务
  // 建议客户端使用各自平台的内置语音合成功能
  res.json({ 
    success: false, 
    message: '当前环境不支持语音合成服务，请使用客户端内置语音功能',
    useClientTTS: true,
    text: text
  });
});

// 启动服务器
function startServer() {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();