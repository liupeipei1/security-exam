const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接配置（支持环境变量）
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
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

// 会员验证中间件
async function checkVipStatus(openid) {
  console.log('checkVipStatus called with openid:', openid);
  if (!openid) {
    return { is_vip: false, message: '请先登录' };
  }
  
  // 测试账号直接通过VIP验证
  if (openid === 'test_openid' || openid === 'dev_openid') {
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
  const { openid } = req.query;
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
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions ORDER BY RAND() LIMIT 1'
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
app.get('/api/questions', async (req, res) => {
  const { openid } = req.query;
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
    const [rows] = await connection.execute('SELECT * FROM bank_medium_questions');
    await connection.end();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 根据类型获取题目列表（需要会员）
app.get('/api/questions/type/:type', async (req, res) => {
  const { openid } = req.query;
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
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions WHERE type = ?',
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
  const { openid } = req.query;
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
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions ORDER BY RAND() LIMIT ?',
      [count]
    );
    await connection.end();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目类型列表（免费）
app.get('/api/questions/types', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT DISTINCT type FROM bank_medium_questions WHERE type IS NOT NULL'
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
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [total] = await connection.execute(
      'SELECT COUNT(*) as total FROM bank_medium_questions'
    );
    const [types] = await connection.execute(
      'SELECT type as question_type, COUNT(*) as count FROM bank_medium_questions WHERE type IS NOT NULL GROUP BY type'
    );
    await connection.end();
    res.json({ 
      success: true, 
      data: {
        total: total[0].total,
        types: types
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
    
    // 查询或创建用户
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    );
    
    let user;
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
    
    // 测试账号默认设置为VIP
    const isVip = (code === 'test' || code === 'dev') ? true : (user.is_vip || false);
    const vipExpire = (code === 'test' || code === 'dev') ? '2099-12-31 23:59:59' : user.vip_expire;
    
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

// 启动服务器
function startServer() {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();