const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios'); // 引入gtts模块，用于语音合成

// 导入考试配置管理
const { getAllExams, getExamByCode, getDefaultExam } = require('./config/exams');

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
  console.log('========== checkVipStatus 被调用 ==========');
  console.log('接收到的 openid:', JSON.stringify(openid));
  console.log('openid 类型:', typeof openid);
  console.log('openid 长度:', openid ? openid.length : 0);
  
  if (!openid) {
    console.log('openid 为空，返回未登录');
    return { is_vip: false, message: '请先登录' };
  }
  
  // 测试账号直接通过VIP验证
  console.log('测试账号列表:', ['test_openid', 'dev_openid', 'o0lS55o_tDbDXQ2rg-Y_XvLikI_U']);
  console.log('是否匹配 test_openid:', openid === 'test_openid');
  console.log('是否匹配 dev_openid:', openid === 'dev_openid');
  
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
  const { openid, exam_code } = req.query;
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
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} ORDER BY RAND() LIMIT 1`
    );
    await connection.end();
    
    if (rows.length > 0) {
      const question = rows[0];
      question.explanation = question.analysis || question.explanation || '';
      res.json({ success: true, data: question });
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
      // 尝试解析竖线分隔的字符串格式（如 "A. 选项1|B. 选项2|C. 选项3|D. 选项4"）
      if (str.includes('|')) {
        return str.split('|').map(item => item.trim()).filter(item => item !== '');
      }
      // 尝试解析换行符分隔的字符串格式（如 "A. 选项1\nB. 选项2\nC. 选项3\nD. 选项4"）
      if (str.includes('\n')) {
        return str.split('\n').map(item => item.trim()).filter(item => item !== '');
      }
      // 处理单个字符的情况（如answer字段存储的是单个字母"A"、"B"等）
      if (str.length === 1 && /^[A-Da-d]$/.test(str)) {
        return [str.toUpperCase()];
      }
      // 处理多选题多字母答案格式（如 "ABCDE" -> ["A", "B", "C", "D", "E"]）
      if (/^[A-Za-z]+$/.test(str)) {
        return str.split('').map(char => char.toUpperCase());
      }
      return [];
    } catch {
      // 最后的兜底：尝试解析竖线分隔或换行符分隔的字符串格式
      if (str.includes('|')) {
        return str.split('|').map(item => item.trim()).filter(item => item !== '');
      }
      if (str.includes('\n')) {
        return str.split('\n').map(item => item.trim()).filter(item => item !== '');
      }
      // 处理单个字符的情况（如answer字段存储的是单个字母"A"、"B"等）
      if (str.length === 1 && /^[A-Da-d]$/.test(str)) {
        return [str.toUpperCase()];
      }
      return [];
    }
  }
}

app.get('/api/questions', async (req, res) => {
  try {
    console.log('========== /api/questions 接口被调用 ==========');
    const { openid, exam_code } = req.query;
    console.log('请求参数 openid:', openid, ', exam_code:', exam_code);
    console.log('openid类型:', typeof openid);
    
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
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    // 使用考试表名，如果没有则使用默认表名 security_exam_3
    const tableName = (exam && exam.table_name) || 'security_exam_3';
    console.log('使用考试:', exam_code || '默认考试', ', 表名:', tableName);
    
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
          // 检查答案是否已经是字母格式（A-E，支持多选题5个选项）
          if (/^[A-Ea-e]$/.test(answerText)) {
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
      
      // 类型转换：将中文类型转换为英文类型
      const typeMap = {
        '单选题': 'single',
        '多选题': 'multiple',
        '判断题': 'judgment',
        '单选': 'single',
        '多选': 'multiple',
        '判断': 'judgment'
      };
      
      // 获取标准化类型
      let normalizedType = typeMap[row.type] || row.type;
      
      // 强制规则：如果答案有多个选项，一定是多选题
      if (answerArray && answerArray.length > 1) {
        normalizedType = 'multiple';
      }
      // 强制规则：如果选项数量 >= 5，通常是多选题（有E选项）
      else if (optionsArray.length >= 5) {
        normalizedType = 'multiple';
      }
      // 强制规则：只有AB两个选项的是判断题
      else if (optionsArray.length === 2) {
        normalizedType = 'judgment';
      }
      // 如果类型仍无法确定，默认为单选题
      else if (!normalizedType || normalizedType === '') {
        normalizedType = 'single';
      }
      
      return {
        ...row,
        options: optionsArray,
        answer: answer,
        type: normalizedType,
        explanation: row.analysis || row.explanation || ''
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
  const { openid, exam_code } = req.query;
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
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} WHERE type = ?`,
      [questionType]
    );
    await connection.end();
    
    // 处理数据，添加explanation字段映射
    const processedData = rows.map(row => ({
      ...row,
      explanation: row.analysis || row.explanation || ''
    }));
    
    res.json({ success: true, data: processedData });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取随机题目（指定数量，需要会员）
app.get('/api/questions/random/:count', async (req, res) => {
  const { openid, exam_code } = req.query;
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
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} ORDER BY RAND() LIMIT ?`,
      [count]
    );
    await connection.end();
    
    // 处理数据，添加explanation字段映射
    const processedData = rows.map(row => ({
      ...row,
      explanation: row.analysis || row.explanation || ''
    }));
    
    res.json({ success: true, data: processedData });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取考试配置列表（免费）
app.get('/api/exams', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const exams = await getAllExams(connection);
    await connection.end();
    res.json({ success: true, data: exams });
  } catch (error) {
    console.error('获取考试配置列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取考试配置详情（免费）
app.get('/api/exams/:examCode', async (req, res) => {
  const { examCode } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const exam = await getExamByCode(connection, examCode);
    await connection.end();
    
    if (exam) {
      res.json({ success: true, data: exam });
    } else {
      res.status(404).json({ success: false, message: '考试配置不存在' });
    }
  } catch (error) {
    console.error('获取考试配置详情失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 新增考试配置（管理接口）
app.post('/api/exams', async (req, res) => {
  const { 
    exam_code, 
    exam_name, 
    exam_description, 
    exam_desc_detail, 
    description, 
    icon, 
    table_name, 
    total_questions = 0, 
    judgment_count = 0, 
    single_count = 0, 
    multiple_count = 0, 
    enabled = 1, 
    sort_order = 0 
  } = req.body;
  
  // 验证必填字段
  if (!exam_code || !exam_name || !table_name) {
    return res.status(400).json({ success: false, message: '缺少必填字段：exam_code、exam_name、table_name' });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 检查exam_code是否已存在
    const [existing] = await connection.execute(
      'SELECT id FROM exam_config WHERE exam_code = ?',
      [exam_code]
    );
    
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({ success: false, message: '考试代码已存在' });
    }
    
    // 插入新考试配置
    const [result] = await connection.execute(
      `INSERT INTO exam_config 
        (exam_code, exam_name, exam_description, exam_desc_detail, icon, table_name, 
         total_questions, judgment_count, single_count, multiple_count, enabled, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exam_code, exam_name, exam_description, exam_desc_detail, icon, table_name,
       total_questions, judgment_count, single_count, multiple_count, enabled, sort_order]
    );
    
    await connection.end();
    res.json({ success: true, data: { id: result.insertId, exam_code }, message: '考试配置添加成功' });
  } catch (error) {
    console.error('添加考试配置失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 更新考试配置（管理接口）
app.put('/api/exams/:examCode', async (req, res) => {
  const { examCode } = req.params;
  const { 
    exam_name, 
    exam_description, 
    exam_desc_detail, 
    description, 
    icon, 
    table_name, 
    total_questions, 
    judgment_count, 
    single_count, 
    multiple_count, 
    enabled, 
    sort_order 
  } = req.body;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 构建更新语句和参数
    const updates = [];
    const params = [];
    
    if (exam_name !== undefined) { updates.push('exam_name = ?'); params.push(exam_name); }
    if (exam_description !== undefined) { updates.push('exam_description = ?'); params.push(exam_description); }
    if (exam_desc_detail !== undefined) { updates.push('exam_desc_detail = ?'); params.push(exam_desc_detail); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
    if (table_name !== undefined) { updates.push('table_name = ?'); params.push(table_name); }
    if (total_questions !== undefined) { updates.push('total_questions = ?'); params.push(total_questions); }
    if (judgment_count !== undefined) { updates.push('judgment_count = ?'); params.push(judgment_count); }
    if (single_count !== undefined) { updates.push('single_count = ?'); params.push(single_count); }
    if (multiple_count !== undefined) { updates.push('multiple_count = ?'); params.push(multiple_count); }
    if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    
    if (updates.length === 0) {
      await connection.end();
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }
    
    params.push(examCode);
    
    const [result] = await connection.execute(
      `UPDATE exam_config SET ${updates.join(', ')} WHERE exam_code = ?`,
      params
    );
    
    await connection.end();
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '考试配置更新成功' });
    } else {
      res.status(404).json({ success: false, message: '考试不存在' });
    }
  } catch (error) {
    console.error('更新考试配置失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 删除考试配置（管理接口）
app.delete('/api/exams/:examCode', async (req, res) => {
  const { examCode } = req.params;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'DELETE FROM exam_config WHERE exam_code = ?',
      [examCode]
    );
    
    await connection.end();
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '考试配置删除成功' });
    } else {
      res.status(404).json({ success: false, message: '考试配置不存在' });
    }
  } catch (error) {
    console.error('删除考试配置失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目类型列表（免费）
app.get('/api/questions/types', async (req, res) => {
  const { exam_code } = req.query;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
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
  const { exam_code } = req.query;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
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
        exam_code: exam_code || 'default'
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
  
  // 测试账号直接通过VIP验证
  if (openid === 'test_openid' || openid === 'dev_openid' || openid === 'o0lS55o_tDbDXQ2rg-Y_XvLikI_U') {
    console.log('测试账号通过VIP验证');
    return res.json({
      success: true,
      data: {
        is_vip: true,
        vip_expire: '2099-12-31 23:59:59'
      }
    });
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
// 统一下单接口（小程序支付）
app.post('/api/user/pay/create', async (req, res) => {
  const { openid, package_type } = req.body;
  
  console.log('========== /api/user/pay/create 接口被调用 ==========');
  console.log('请求参数:', req.body);
  
  if (!openid || !package_type) {
    return res.status(400).json({ success: false, message: '缺少参数' });
  }
  
  // 套餐配置
  const packages = {
    monthly: { days: 30, price: 9.9 },
    quarterly: { days: 90, price: 25 },
    yearly: { days: 365, price: 88 }
  };
  
  const pkg = packages[package_type];
  if (!pkg) {
    return res.status(400).json({ success: false, message: '无效的套餐类型' });
  }
  
  // 开发模式：直接开通VIP，不调用微信支付
  console.log('开发模式：直接开通VIP');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 查询用户当前会员到期时间
    const [users] = await connection.execute(
      'SELECT vip_expire FROM users WHERE openid = ?',
      [openid]
    );
    
    let newExpire;
    
    if (users.length > 0 && users[0].vip_expire && new Date(users[0].vip_expire) > new Date()) {
      // 如果会员未过期，延长有效期
      const expireDate = new Date(users[0].vip_expire);
      expireDate.setDate(expireDate.getDate() + pkg.days);
      newExpire = expireDate;
    } else {
      // 否则从当前时间开始计算
      newExpire = new Date();
      newExpire.setDate(newExpire.getDate() + pkg.days);
    }
    
    // 更新会员状态
    if (users.length > 0) {
      await connection.execute(
        'UPDATE users SET is_vip = ?, vip_expire = ? WHERE openid = ?',
        [true, newExpire.toISOString().slice(0, 19).replace('T', ' '), openid]
      );
    }
    
    await connection.end();
    
    // 返回模拟的支付参数（开发模式）
    res.json({
      success: true,
      data: {
        // 模拟微信支付参数
        timeStamp: Date.now().toString(),
        nonceStr: Math.random().toString(36).substr(2, 15),
        package: 'prepay_id=mock_prepay_id',
        signType: 'MD5',
        paySign: 'mock_pay_sign',
        // VIP信息
        is_vip: true,
        vip_expire: newExpire.toISOString(),
        package_type,
        days: pkg.days
      },
      message: '开发模式：已直接开通VIP'
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

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
 * @param {string} exam_code - 考试代码（可选）
 */
app.get('/api/exam/progress', async (req, res) => {
  const { openid, exam_code } = req.query;
  
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少openid参数' });
  }
  
  try {
    const progress = await getUserProgress(openid, exam_code || 'default');
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
 * @param {string} exam_code - 考试代码
 * @param {object} progress - 进度数据
 */
app.post('/api/exam/progress', async (req, res) => {
  const { openid, exam_code, progress } = req.body;
  
  if (!openid || !progress) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const result = await saveUserProgress(openid, exam_code || 'default', progress);
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

// ==================== 题目备注相关接口 ====================

// 获取题目备注
app.get('/api/notes', async (req, res) => {
  try {
    const { openid, exam_code, question_id } = req.query;
    
    if (!openid || !exam_code) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    let sql = 'SELECT * FROM question_notes WHERE openid = ? AND exam_code = ?';
    let params = [openid, exam_code];
    
    if (question_id) {
      sql += ' AND question_id = ?';
      params.push(question_id);
    }
    
    const [rows] = await connection.execute(sql, params);
    await connection.end();
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取备注失败:', error);
    res.status(500).json({ success: false, message: '获取备注失败' });
  }
});

// 保存或更新题目备注
app.post('/api/notes', async (req, res) => {
  try {
    const { openid, exam_code, question_id, note } = req.body;
    
    if (!openid || !exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 检查是否已存在备注
    const [existing] = await connection.execute(
      'SELECT id FROM question_notes WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, exam_code, question_id]
    );
    
    if (existing.length > 0) {
      // 更新备注
      if (note && note.trim()) {
        await connection.execute(
          'UPDATE question_notes SET note = ? WHERE openid = ? AND exam_code = ? AND question_id = ?',
          [note, openid, exam_code, question_id]
        );
      } else {
        // 如果备注为空，删除记录
        await connection.execute(
          'DELETE FROM question_notes WHERE openid = ? AND exam_code = ? AND question_id = ?',
          [openid, exam_code, question_id]
        );
      }
    } else {
      // 插入新备注
      if (note && note.trim()) {
        await connection.execute(
          'INSERT INTO question_notes (openid, exam_code, question_id, note) VALUES (?, ?, ?, ?)',
          [openid, exam_code, question_id, note]
        );
      }
    }
    
    await connection.end();
    res.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('保存备注失败:', error);
    res.status(500).json({ success: false, message: '保存备注失败' });
  }
});

// 删除题目备注
app.delete('/api/notes', async (req, res) => {
  try {
    const { openid, exam_code, question_id } = req.query;
    
    if (!openid || !exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    await connection.execute(
      'DELETE FROM question_notes WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, exam_code, question_id]
    );
    
    await connection.end();
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除备注失败:', error);
    res.status(500).json({ success: false, message: '删除备注失败' });
  }
});

// 初始化知识要点表
async function initKnowledgeTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // 创建知识要点表
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id INT PRIMARY KEY AUTO_INCREMENT,
        exam_code VARCHAR(50) NOT NULL COMMENT '所属考试代码',
        title VARCHAR(200) NOT NULL COMMENT '知识要点标题',
        content TEXT COMMENT '知识要点内容（支持HTML）',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_exam_code (exam_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识要点表'
    `;
    
    await connection.execute(createTableSql);
    console.log('知识要点表初始化完成');
    
    // 检查是否已有数据
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM knowledge_points');
    if (existing[0].count === 0) {
      // 插入初始数据
      const insertSql = `
        INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES
        ('security_level3', '1. 信息安全基础概念', '信息安全是指保护信息系统的硬件、软件及相关数据，使其不受到偶然的或者恶意的原因而遭到破坏、更改、泄露，保证信息系统能够连续、可靠、正常地运行。<ul><li><strong>保密性</strong>：确保信息不被未授权的个人、实体或过程访问或披露</li><li><strong>完整性</strong>：保护信息的准确性和完整性，防止未经授权的修改</li><li><strong>可用性</strong>：确保授权用户在需要时能够访问所需的信息</li><li><strong>可控性</strong>：对信息的传播及内容具有控制能力</li><li><strong>不可否认性</strong>：确保信息的发送者和接收者无法否认其行为</li></ul>', 1),
        ('security_level3', '2. 网络安全威胁类型', '网络安全威胁是指对网络系统造成危害的各种潜在因素，主要包括以下类型：<ul><li><strong>恶意软件</strong>：病毒、蠕虫、木马、勒索软件等</li><li><strong>网络攻击</strong>：DDoS攻击、SQL注入、跨站脚本攻击(XSS)等</li><li><strong>社会工程学</strong>：钓鱼攻击、 pretexting、肩窥等</li><li><strong>内部威胁</strong>：员工误操作、恶意内部人员</li><li><strong>物理攻击</strong>：设备盗窃、未授权访问机房等</li></ul>', 2),
        ('security_level3', '3. 访问控制技术', '访问控制是信息安全的重要组成部分，用于限制对系统资源的访问。<ul><li><strong>自主访问控制(DAC)</strong>：资源所有者决定谁可以访问</li><li><strong>强制访问控制(MAC)</strong>：基于安全标签的强制性控制</li><li><strong>基于角色的访问控制(RBAC)</strong>：根据角色分配权限</li><li><strong>最小权限原则</strong>：只授予完成工作所需的最小权限</li></ul>', 3),
        ('security_level3', '4. 加密技术基础', '加密技术是保护数据安全的核心手段，分为对称加密和非对称加密。<ul><li><strong>对称加密</strong>：加密和解密使用相同密钥，如AES、DES</li><li><strong>非对称加密</strong>：使用公钥和私钥配对，如RSA、ECC</li><li><strong>哈希函数</strong>：生成固定长度的消息摘要，如MD5、SHA-256</li><li><strong>数字签名</strong>：用于验证数据完整性和身份认证</li></ul>', 4),
        ('security_level3', '5. 安全管理体系', '信息安全管理体系(ISMS)是组织整体管理体系的一部分，基于业务风险方法建立、实施、运行、监视、评审、维护和改进信息安全。<ul><li><strong>ISO 27001</strong>：信息安全管理体系国际标准</li><li><strong>风险评估</strong>：识别、分析和评价信息安全风险</li><li><strong>安全策略</strong>：组织信息安全的方针和原则</li><li><strong>安全审计</strong>：定期检查安全措施的有效性</li></ul>', 5),
        ('ai_trainer_3', '1. 人工智能基础概念', '人工智能(AI)是计算机科学的一个分支，旨在研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统。<ul><li><strong>机器学习</strong>：让计算机从数据中学习规律</li><li><strong>深度学习</strong>：基于多层神经网络的学习方法</li><li><strong>自然语言处理</strong>：让计算机理解和处理人类语言</li><li><strong>计算机视觉</strong>：让计算机看见和理解图像</li></ul>', 1),
        ('ai_trainer_3', '2. 数据标注技术', '数据标注是人工智能训练的基础工作，为机器学习模型提供训练数据。<ul><li><strong>分类标注</strong>：为数据打上类别标签</li><li><strong>实体标注</strong>：识别并标注文本中的实体</li><li><strong>语义分割</strong>：对图像进行像素级标注</li><li><strong>关键点标注</strong>：标注图像中的关键坐标点</li></ul>', 2),
        ('ai_trainer_3', '3. 模型训练流程', '模型训练是将标注数据输入算法，让模型学习数据规律的过程。<ul><li><strong>数据准备</strong>：数据收集、清洗、标注</li><li><strong>模型选择</strong>：根据任务选择合适的模型架构</li><li><strong>训练调优</strong>：调整参数优化模型性能</li><li><strong>评估验证</strong>：验证模型效果和泛化能力</li></ul>', 3),
        ('ai_trainer_3', '4. 人工智能伦理', '人工智能的发展需要遵循伦理原则，确保技术向善。<ul><li><strong>公平性</strong>：避免算法偏见和歧视</li><li><strong>透明度</strong>：算法决策过程可解释</li><li><strong>隐私保护</strong>：保护用户数据安全</li><li><strong>责任归属</strong>：明确AI决策的责任主体</li></ul>', 4),
        ('ai_trainer_3', '5. 工具与平台使用', '掌握主流AI开发工具和平台是训练师的必备技能。<ul><li><strong>TensorFlow/PyTorch</strong>：主流深度学习框架</li><li><strong>LabelImg/LabelMe</strong>：图像标注工具</li><li><strong>Hugging Face</strong>：预训练模型平台</li><li><strong>云服务平台</strong>：阿里云、腾讯云AI服务</li></ul>', 5),
        ('personal_finance', '1. 个人理财基础', '个人理财是指根据个人或家庭的财务状况，制定合理的财务规划，实现资产增值和风险控制。<ul><li><strong>财务规划</strong>：制定长期财务目标和计划</li><li><strong>资产配置</strong>：合理分配资金到不同资产类别</li><li><strong>风险管理</strong>：识别和控制财务风险</li><li><strong>税务筹划</strong>：合法优化税务支出</li></ul>', 1),
        ('personal_finance', '2. 投资工具', '了解各类投资工具的特点和风险收益特征。<ul><li><strong>银行存款</strong>：低风险、低收益的储蓄方式</li><li><strong>基金投资</strong>：专业管理的集合投资工具</li><li><strong>股票投资</strong>：高风险、高收益的权益投资</li><li><strong>保险产品</strong>：风险保障和理财双重功能</li></ul>', 2),
        ('personal_finance', '3. 家庭财务报表', '掌握家庭财务报表的编制和分析方法。<ul><li><strong>资产负债表</strong>：反映家庭资产和负债状况</li><li><strong>现金流量表</strong>：记录收入和支出情况</li><li><strong>预算管理</strong>：制定和执行家庭预算</li><li><strong>财务比率分析</strong>：评估财务健康状况</li></ul>', 3),
        ('personal_finance', '4. 退休规划', '提前规划退休生活，确保晚年财务安全。<ul><li><strong>退休目标设定</strong>：确定退休后的生活标准</li><li><strong>养老金计算</strong>：估算养老金需求和缺口</li><li><strong>投资积累</strong>：选择合适的退休投资工具</li><li><strong>风险保障</strong>：配置适当的保险产品</li></ul>', 4),
        ('personal_finance', '5. 税务与遗产规划', '了解个人税务和遗产规划的基本知识。<ul><li><strong>个人所得税</strong>：计算和申报个人所得税</li><li><strong>税收优惠</strong>：利用税收优惠政策</li><li><strong>遗产规划</strong>：合理安排财产传承</li><li><strong>信托工具</strong>：利用信托进行财富管理</li></ul>', 5),
        ('banking_law', '1. 银行业监管体系', '我国银行业实行分业监管体制，主要监管机构包括中国人民银行和银保监会。<ul><li><strong>中国人民银行</strong>：制定和执行货币政策</li><li><strong>银保监会</strong>：监管银行和保险机构</li><li><strong>外汇管理局</strong>：管理外汇收支和国际结算</li><li><strong>行业自律组织</strong>：中国银行业协会</li></ul>', 1),
        ('banking_law', '2. 商业银行法', '《商业银行法》是规范商业银行经营活动的基本法律。<ul><li><strong>业务范围</strong>：存款、贷款、结算等业务</li><li><strong>资本充足率</strong>：确保银行资本充足</li><li><strong>风险管理</strong>：信用风险、市场风险、操作风险</li><li><strong>内部控制</strong>：建立健全内部管理制度</li></ul>', 2),
        ('banking_law', '3. 反洗钱法规', '商业银行必须履行反洗钱义务，防范洗钱风险。<ul><li><strong>客户身份识别</strong>：了解你的客户(KYC)</li><li><strong>大额交易报告</strong>：报告大额资金流动</li><li><strong>可疑交易报告</strong>：报告可疑交易行为</li><li><strong>客户身份资料保存</strong>：保存客户身份信息</li></ul>', 3),
        ('banking_law', '4. 消费者权益保护', '银行应当保护金融消费者的合法权益。<ul><li><strong>信息披露</strong>：充分披露产品信息</li><li><strong>公平交易</strong>：不得误导和欺诈消费者</li><li><strong>隐私保护</strong>：保护客户个人信息</li><li><strong>投诉处理</strong>：建立投诉处理机制</li></ul>', 4),
        ('banking_law', '5. 贷款业务规则', '商业银行贷款业务必须遵守相关法律法规。<ul><li><strong>贷款审查</strong>：审查借款人资质和用途</li><li><strong>贷款利率</strong>：遵守利率政策</li><li><strong>贷款担保</strong>：要求适当的担保措施</li><li><strong>不良贷款处置</strong>：依法处置不良贷款</li></ul>', 5)
      `;
      
      await connection.execute(insertSql);
      console.log('知识要点初始数据插入完成');
    }
    
    await connection.end();
  } catch (error) {
    console.error('初始化知识要点表失败:', error);
    if (connection) {
      await connection.end();
    }
  }
}

// 考试指南配置
const EXAM_GUIDES = {
  'personal_finance': {
    title: '银行从业资格中级-个人理财',
    examOverview: '银行从业资格中级考试分为《银行业法律法规与综合能力》和《银行业专业实务》两个科目，其中《银行业专业实务》下设个人理财、风险管理、公司信贷、个人贷款、银行管理五个专业类别。',
    examContent: [
      '个人理财业务概述：个人理财业务的定义、分类、发展现状',
      '个人理财业务管理：业务流程、风险管理、合规管理',
      '个人理财业务规范：职业道德规范、从业准则、反洗钱',
      '个人理财业务相关法律法规：民法通则、物权法、合同法、证券法、商业银行法等',
      '个人理财业务风险管理：市场风险、信用风险、操作风险、流动性风险',
      '个人理财业务营销：客户开发、客户关系维护、产品推广',
      '个人理财业务操作：理财产品销售、客户信息管理、业务档案管理',
      '个人理财业务创新：互联网金融、移动金融、智能理财'
    ],
    questionTypeDistribution: [
       { type: '单选题', count: 90, score: 40 },
       { type: '多选题', count: 40, score: 35 },
       { type: '判断题', count: 15, score: 15 },
       { type: '案例分析题', count: 3, score: 10 }
     ],
     preparationTips: [
       '系统学习个人理财业务基础知识',
      '熟悉相关法律法规和监管要求',
      '掌握理财产品的特点和风险特征',
      '多做练习题，熟悉考试题型',
      '关注行业最新动态和政策变化',
      '制定合理的学习计划，循序渐进'
    ]
  },
  'banking_law': {
    title: '银行从业资格中级-法律法规',
    examOverview: '银行业法律法规与综合能力是银行从业资格考试的必考科目，主要考察考生对银行业相关法律法规、金融监管、银行业务等知识的掌握程度。',
    examContent: [
      '银行业监管体系：中国人民银行、银保监会、外汇管理局的职责',
      '银行业法律法规：商业银行法、银行业监督管理法、票据法、证券法',
      '金融监管框架：审慎监管、合规监管、风险监管',
      '银行业务规则：存款业务、贷款业务、支付结算业务、外汇业务',
      '消费者权益保护：金融消费者权益保护法、产品宣传规范',
      '反洗钱与反恐怖融资：反洗钱法、客户身份识别、可疑交易报告',
      '银行业从业人员职业操守：职业道德、行为规范、从业准则'
    ],
    questionTypeDistribution: [
       { type: '单选题', count: 90, score: 43.24 },
       { type: '多选题', count: 40, score: 43.24 },
       { type: '判断题', count: 15, score: 13.52 }
     ],
     preparationTips: [
       '系统学习银行业法律法规体系',
       '理解金融监管的基本原则',
       '掌握主要银行业务的操作规范',
       '关注最新监管政策变化',
       '结合实际案例理解法律条文',
       '通过模拟考试检验学习效果'
     ]
   },
   'security_admin_3': {
    title: '网络与信息安全管理员（三级）理论知识',
    examOverview: '网络与信息安全管理员（三级）理论知识考试采用闭卷机考方式，考核时间为90分钟，满分100分，60分及格。共计190道题目。',
    examContent: [
      '【信息安全基础】信息安全概念、安全模型、安全框架',
      '【信息安全技术】信息安全协议、防火墙、入侵检测、VPN',
      '【网络安全技术】网络协议、防火墙、入侵检测、VPN',
      '【操作系统安全】Windows、Linux安全配置',
      '【数据安全】数据分类、数据加密、数据备份',
      '【安全管理】安全策略、风险评估、安全审计',
      '【法律法规】网络安全法、个人信息保护法等'
    ],
    questionTypeDistribution: '判断题：40题，每题0.5分，共20分\n单选题：140题，每题0.5分，共70分\n多选题：10题，每题1分，共10分\n合计：190题，总分100分',
    preparationTips: [
      '【学习建议】系统学习信息安全基础知识',
      '【技能提升】熟悉常见安全工具和技术',
      '【练习方法】多做模拟练习题',
      '【知识更新】关注最新安全动态和威胁趋势',
      '【学习技巧】理解安全原理而非死记硬背'
    ]
  },
  'security_admin_3_practice': {
    title: '网络与信息安全管理员（三级）操作技能',
    examOverview: '网络与信息安全管理员（三级）操作技能考核采用现场操作方式，考核时间为120分钟，满分100分，60分及格。考核项目分为三大模块，共计考核6道实操题。',
    examContent: [
      '【项目一：网络与信息安全防护】',
      '1. 网络安全防护（必考）：考核网络设备配置、防火墙规则设置等技能',
      '2. 系统安全防护（抽考）：考核操作系统安全配置、漏洞修复等技能',
      '3. 应用安全防护：考核应用系统安全加固、访问控制等技能',
      '【项目二：网络与信息安全管理】',
      '1. 网络安全管理（必考）：考核安全策略制定、日志审计等技能',
      '2. 系统安全管理（抽考）：考核系统安全监控、权限管理等技能',
      '3. 应用安全管理：考核应用安全审计、数据保护等技能',
      '【项目三：网络与信息安全处置】',
      '1. 网络安全事件监控和处置（必考）：考核安全事件识别、应急响应等技能',
      '2. 系统安全事件监控和处置（抽考）：考核系统安全事件处理、恢复等技能',
      '3. 应用安全事件监控和处置：考核应用安全事件分析、处置等技能'
    ],
    questionTypeDistribution: '【考核项目及分值分布】\n项目一：网络与信息安全防护（共60分）\n  - 网络安全防护：20分钟，20分，从5道题库中抽取1题\n  - 系统安全防护：20分钟，20分，从5道题库中抽取1题\n  - 应用安全防护：20分钟，20分，从5道题库中抽取1题\n\n项目二：网络与信息安全管理（共30分）\n  - 网络安全管理：20分钟，15分，从5道题库中抽取1题\n  - 系统安全管理/应用安全管理（抽考其一）：20分钟，15分，从5道题库中抽取1题\n\n项目三：网络与信息安全处置（共10分）\n  - 网络安全事件监控和处置：20分钟，10分，从5道题库中抽取1题\n\n【总计】考核时长120分钟，总分100分，共考核6题，题库总量45题',
    preparationTips: [
      '【实操准备】熟悉主流操作系统（Windows/Linux）的安全配置',
      '【工具掌握】掌握常见安全工具的使用方法',
      '【实践经验】积累实际安全运维经验',
      '【流程规范】熟悉安全事件处置流程',
      '【模拟练习】多进行实操模拟训练',
      '【安全意识】强化安全操作规范意识'
    ]
  },
  'security_admin_4': {
    title: '网络与信息安全管理员（四级）',
    examOverview: '网络与信息安全管理员（四级）考试分为理论知识考试和操作技能考核两部分。',
    examContent: [
      '信息安全基础：信息安全概念、安全模型、安全框架',
      '信息安全技术：信息安全协议、防火墙、入侵检测、VPN',
      '网络安全技术：网络协议、防火墙、入侵检测、VPN',
      '操作系统安全：Windows、Linux安全配置',
      '数据安全：数据分类、数据加密、数据备份',
      '安全管理：安全策略、风险评估、安全审计',
      '法律法规：网络安全法、个人信息保护法等'
    ],
    questionTypeDistribution: [
        { type: '单选题', count: 110, score: 73.33 },
        { type: '判断题', count: 30, score: 20 },
        { type: '多选题', count: 10, score: 6.67 }
      ],
     preparationTips: [
       '系统学习信息安全基础知识',
       '熟悉常见安全工具和技术',
       '多做模拟练习题',
       '关注最新安全动态和威胁趋势',
       '理解安全原理而非死记硬背'
     ]
   },
   'ai_trainer_3': {
    title: '人工智能训练师（三级）',
    examOverview: '人工智能训练师（三级）考试分为理论知识考试和操作技能考核两部分，主要考察考生对人工智能基础、数据标注、模型训练等知识的掌握程度。',
    examContent: [
      '人工智能基础：人工智能概念、发展历程、应用场景',
      '机器学习基础：监督学习、无监督学习、强化学习',
      '数据标注：标注工具、标注规范、质量控制',
      '模型训练：训练流程、参数调优、模型评估',
      '数据安全与隐私：数据保护、隐私计算、合规要求',
      '职业道德：职业操守、数据伦理、社会责任'
    ],
    questionTypeDistribution: [
      { type: '单选题', count: 300, score: 25 },
      { type: '判断题', count: 300, score: 25 },
      { type: '多选题', count: 300, score: 50 }
    ],
    preparationTips: [
      '系统学习人工智能基础知识',
      '熟悉数据标注工具和流程',
      '掌握机器学习基本原理',
      '多做模拟练习题',
      '关注人工智能行业最新发展'
    ]
  },
  // 银行从业中级考试指南
  'banking_medium': {
    title: '银行从业资格中级（2026）',
    examOverview: '银行从业资格中级考试为机考形式，总分100分，考试时长120分钟。合格线为60分。多选题错选不得分，少选按比例给分。案例题以情境+小题组合，侧重实务应用。',
    examContent: [
      '必考科目：法律法规与综合能力',
      '选考科目：个人理财、个人贷款、公司信贷、风险管理、银行管理',
      '考试形式：计算机考试',
      '考试时长：120分钟',
      '总分：100分',
      '合格线：60分'
    ],
    questionTypeDistribution: [
      { type: '单选题', count: 80, score: 40, detail: '每题0.5分' },
      { type: '多选题', count: 25, score: 50, detail: '每题2分' },
      { type: '判断题', count: 10, score: 10, detail: '每题1分' }
    ],
    preparationTips: [
      '系统学习银行业法律法规体系',
      '理解金融监管的基本原则',
      '掌握主要银行业务的操作规范',
      '关注最新监管政策变化',
      '结合实际案例理解法律条文',
      '通过模拟考试检验学习效果'
    ]
  },
  'banking_law': {
    title: '法律法规与综合能力（必考）',
    examOverview: '法律法规与综合能力为银行从业资格中级考试的必考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '银行业法律法规体系',
      '金融监管框架',
      '商业银行经营规则',
      '银行业消费者权益保护',
      '反洗钱与合规管理',
      '银行业从业人员职业操守'
    ],
    questionTypeDistribution: [
      { type: '单选题', count: 80, score: 40, detail: '每题0.5分' },
      { type: '多选题', count: 25, score: 50, detail: '每题2分' },
      { type: '判断题', count: 10, score: 10, detail: '每题1分' }
    ],
    preparationTips: [
      '系统学习银行业法律法规体系',
      '理解金融监管的基本原则',
      '掌握主要银行业务的操作规范',
      '关注最新监管政策变化',
      '结合实际案例理解法律条文',
      '通过模拟考试检验学习效果'
    ]
  },
  'personal_finance': {
    title: '个人理财',
    examOverview: '个人理财为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '个人理财业务概述',
      '个人理财业务管理',
      '个人理财业务风险管理',
      '个人理财业务合规与法律约束',
      '个人理财业务发展趋势',
      '理财规划实务'
    ],
    questionTypeDistribution: [
       { type: '单选题', count: 40, score: 28.57, detail: '每题0.71分' },
       { type: '多选题', count: 20, score: 28.57, detail: '每题1.43分' },
       { type: '单项规划题', count: 15, score: 21.43, detail: '共21.43分' },
       { type: '案例分析题', count: 3, score: 21.43, detail: '共21.43分' }
     ],
    preparationTips: [
      '掌握个人理财基本理论和方法',
      '熟悉各类理财产品特点',
      '学习理财规划流程和技巧',
      '分析典型理财案例',
      '通过模拟题提高解题能力',
      '关注金融市场动态'
    ]
  },
  'personal_loan': {
    title: '个人贷款',
    examOverview: '个人贷款为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '个人贷款业务概述',
      '个人贷款业务流程',
      '个人贷款风险管理',
      '个人贷款产品分类',
      '个人贷款合规管理',
      '个人贷款发展趋势'
    ],
    questionTypeDistribution: [
        { type: '单选题', count: 60, score: 37.5, detail: '每题0.63分' },
        { type: '多选题', count: 20, score: 25, detail: '每题1.25分' },
        { type: '判断题', count: 10, score: 12.5, detail: '每题1.25分' },
        { type: '综合案例题', count: 5, score: 25, detail: '共25分' }
      ],
    preparationTips: [
      '掌握个人贷款基本概念和分类',
      '熟悉贷款业务流程',
      '理解风险管理要点',
      '学习贷款审批要点',
      '分析典型案例',
      '关注监管政策变化'
    ]
  },
  'corporate_credit': {
    title: '公司信贷',
    examOverview: '公司信贷为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '公司信贷业务概述',
      '公司信贷业务流程',
      '公司信贷风险管理',
      '贷款担保管理',
      '信贷审批与发放',
      '贷后管理'
    ],
    questionTypeDistribution: [
      { type: '单选题', count: 70, score: 35, detail: '每题0.5分' },
      { type: '多选题', count: 30, score: 30, detail: '每题1分' },
      { type: '判断题', count: 10, score: 5, detail: '每题0.5分' },
      { type: '综合案例题', count: 5, score: 30, detail: '共30分' }
    ],
    preparationTips: [
      '掌握公司信贷基本理论',
      '熟悉信贷业务全流程',
      '理解授信审批要点',
      '学习风险评估方法',
      '分析典型信贷案例',
      '关注宏观经济形势'
    ]
  },
  'risk_management': {
    title: '风险管理',
    examOverview: '风险管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '风险管理基础',
      '信用风险管理',
      '市场风险管理',
      '操作风险管理',
      '流动性风险管理',
      '风险计量与监测'
    ],
    questionTypeDistribution: [
      { type: '单选题', count: 80, score: 40, detail: '每题0.5分' },
      { type: '多选题', count: 30, score: 45, detail: '每题1.5分' },
      { type: '综合案例题', count: 14, score: 15, detail: '共15分' }
    ],
    preparationTips: [
      '系统学习风险管理理论',
      '掌握各类风险识别方法',
      '理解风险计量模型',
      '学习风险控制策略',
      '分析典型风险案例',
      '关注行业风险管理动态'
    ]
  },
  'bank_management': {
    title: '银行管理',
    examOverview: '银行管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。',
    examContent: [
      '商业银行经营管理',
      '银行内部控制',
      '银行合规管理',
      '银行风险管理',
      '银行业务创新',
      '银行业监管'
    ],
    questionTypeDistribution: [
       { type: '单选题', count: 80, score: 33.33, detail: '每题0.42分' },
       { type: '多选题', count: 20, score: 16.67, detail: '每题0.83分' },
       { type: '单项规划题', count: 25, score: 25, detail: '共25分' },
       { type: '综合案例题', count: 20, score: 25, detail: '共25分' }
     ],
    preparationTips: [
      '掌握商业银行经营管理理论',
      '熟悉银行内部控制体系',
      '理解合规管理要求',
      '学习风险管理框架',
      '关注银行业监管政策',
      '分析银行经营案例'
    ]
  }
};

// 获取考试指南API
app.get('/api/guide', async (req, res) => {
  console.log('========== /api/guide 接口被调用 ==========');
  console.log('请求参数 exam_code:', req.query.exam_code);
  try {
    const { exam_code } = req.query;
    
    if (!exam_code) {
      return res.status(400).json({ success: false, message: '缺少必要参数 exam_code' });
    }
    
    // 首先从数据库查询考试指南
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM exam_guide WHERE exam_code = ?',
      [exam_code]
    );
    await connection.end();
    
    if (rows.length > 0) {
      const guide = rows[0];
      // 将JSON字符串解析为对象
      const parsedGuide = {
        exam_code: guide.exam_code,
        title: guide.title,
        exam_overview: guide.exam_overview,
        exam_content: guide.exam_content ? JSON.parse(guide.exam_content) : [],
        question_type_distribution: guide.question_type_distribution ? JSON.parse(guide.question_type_distribution) : [],
        preparation_tips: guide.preparation_tips ? JSON.parse(guide.preparation_tips) : [],
        created_at: guide.created_at,
        updated_at: guide.updated_at
      };
      console.log('从数据库查询到考试指南:', guide.title);
      res.json({ success: true, data: parsedGuide });
    } else {
      // 如果数据库中没有找到，从常量中获取
      const guide = EXAM_GUIDES[exam_code];
      if (guide) {
        console.log('从常量查询到考试指南:', guide.title);
        res.json({ success: true, data: guide });
      } else {
        // 如果没有找到对应指南，返回默认指南（网络与信息安全管理员三级）
        console.log('未找到对应指南，返回默认指南');
        res.json({ success: true, data: EXAM_GUIDES['security_admin_3'] });
      }
    }
  } catch (error) {
    console.error('获取考试指南失败:', error);
    // 如果数据库查询失败，尝试从常量中获取
    try {
      const guide = EXAM_GUIDES[exam_code] || EXAM_GUIDES['security_admin_3'];
      res.json({ success: true, data: guide });
    } catch (e) {
      res.status(500).json({ success: false, message: '获取考试指南失败' });
    }
  }
});

// ==================== 题目解析相关接口 ====================

// 保存题目解析
app.post('/api/question/explanation', async (req, res) => {
  console.log('========== /api/question/explanation 接口被调用 ==========');
  try {
    const { exam_code, question_id, explanation } = req.body;
    
    if (!exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取对应的表名
    const exam = await getExamByCode(connection, exam_code);
    const tableName = exam ? exam.table_name : 'security_exam_3';
    
    // 更新题目解析（使用analysis字段存储）
    const [result] = await connection.execute(
      `UPDATE ${tableName} SET analysis = ? WHERE id = ?`,
      [explanation || '', question_id]
    );
    
    await connection.end();
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '保存成功' });
    } else {
      res.status(404).json({ success: false, message: '题目不存在' });
    }
  } catch (error) {
    console.error('保存解析失败:', error);
    res.status(500).json({ success: false, message: '保存解析失败' });
  }
});

// 获取知识要点API
app.get('/api/knowledge', async (req, res) => {
  console.log('========== /api/knowledge 接口被调用 ==========');
  console.log('请求参数 exam_code:', req.query.exam_code);
  try {
    const { exam_code } = req.query;
    
    if (!exam_code) {
      return res.status(400).json({ success: false, message: '缺少必要参数 exam_code' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT id, title, content FROM knowledge_points WHERE exam_code = ? ORDER BY sort_order',
      [exam_code]
    );
    
    await connection.end();
    
    console.log('查询到知识要点数量:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取知识要点失败:', error);
    res.status(500).json({ success: false, message: '获取知识要点失败' });
  }
});

// 初始化收藏表
async function initFavoritesTable() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(100) NOT NULL,
        exam_code VARCHAR(50) NOT NULL,
        question_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_favorite (openid, exam_code, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await connection.end();
    console.log('收藏表初始化完成');
  } catch (error) {
    console.error('初始化收藏表失败:', error);
  }
}

// 添加收藏
app.post('/api/favorites/add', async (req, res) => {
  console.log('========== /api/favorites/add 接口被调用 ==========');
  try {
    const { openid, exam_code, question_id } = req.body;
    
    if (!openid || !exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    try {
      await connection.execute(
        'INSERT INTO favorites (openid, exam_code, question_id) VALUES (?, ?, ?)',
        [openid, exam_code, question_id]
      );
      await connection.end();
      res.json({ success: true, message: '收藏成功' });
    } catch (error) {
      await connection.end();
      // 如果是唯一键冲突，说明已经收藏过
      if (error.code === 'ER_DUP_ENTRY') {
        return res.json({ success: true, message: '已经收藏过' });
      }
      throw error;
    }
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ success: false, message: '添加收藏失败' });
  }
});

// 取消收藏
app.post('/api/favorites/remove', async (req, res) => {
  console.log('========== /api/favorites/remove 接口被调用 ==========');
  try {
    const { openid, exam_code, question_id } = req.body;
    
    if (!openid || !exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'DELETE FROM favorites WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, exam_code, question_id]
    );
    await connection.end();
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '取消收藏成功' });
    } else {
      res.json({ success: true, message: '未找到收藏记录' });
    }
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ success: false, message: '取消收藏失败' });
  }
});

// 获取收藏列表
app.get('/api/favorites', async (req, res) => {
  console.log('========== /api/favorites 接口被调用 ==========');
  try {
    const { openid, exam_code } = req.query;
    
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少必要参数 openid' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT f.*, q.* 
      FROM favorites f
      JOIN `;
    
    // 根据exam_code获取对应的考试表名
    let tableName = 'security_exam_3';
    if (exam_code) {
      const exam = await getExamByCode(connection, exam_code);
      if (exam) {
        tableName = exam.table_name;
      }
    }
    
    query += `${tableName} q ON f.question_id = q.id 
      WHERE f.openid = ?`;
    
    const params = [openid];
    
    if (exam_code) {
      query += ' AND f.exam_code = ?';
      params.push(exam_code);
    }
    
    query += ' ORDER BY f.created_at DESC';
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    // 处理题目数据
    const processedData = rows.map(row => {
      const options = parseArrayString(row.options);
      const answerArray = parseArrayString(row.answer);
      
      let optionsArray;
      let optionsObject = null;
      if (Array.isArray(options)) {
        optionsArray = options;
      } else if (typeof options === 'object' && options !== null) {
        optionsObject = options;
        optionsArray = Object.values(options);
      } else {
        optionsArray = [];
      }
      
      const answer = answerArray
        .map(answerText => {
          if (/^[A-Ea-e]$/.test(answerText)) {
            return answerText.toUpperCase();
          }
          let index = optionsArray.indexOf(answerText);
          if (index === -1 && optionsObject) {
            const key = Object.keys(optionsObject).find(k => k === answerText || optionsObject[k] === answerText);
            if (key) {
              index = optionsArray.indexOf(optionsObject[key]);
            }
          }
          return index >= 0 ? String.fromCharCode(65 + index) : '';
        })
        .join('');
      
      const typeMap = {
        '单选题': 'single',
        '多选题': 'multiple',
        '判断题': 'judgment',
        '单选': 'single',
        '多选': 'multiple',
        '判断': 'judgment'
      };
      
      let normalizedType = typeMap[row.type] || row.type;
      
      if (answerArray && answerArray.length > 1) {
        normalizedType = 'multiple';
      } else if (optionsArray.length >= 5) {
        normalizedType = 'multiple';
      } else if (optionsArray.length === 2) {
        normalizedType = 'judgment';
      } else if (!normalizedType || normalizedType === '') {
        normalizedType = 'single';
      }
      
      return {
        ...row,
        options: optionsArray,
        answer: answer,
        type: normalizedType,
        explanation: row.analysis || row.explanation || '',
        is_favorite: true
      };
    });
    
    res.json({ success: true, data: processedData });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ success: false, message: '获取收藏列表失败' });
  }
});

// 检查题目是否已收藏
app.get('/api/favorites/check', async (req, res) => {
  console.log('========== /api/favorites/check 接口被调用 ==========');
  try {
    const { openid, exam_code, question_id } = req.query;
    
    if (!openid || !exam_code || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT id FROM favorites WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, exam_code, question_id]
    );
    await connection.end();
    
    res.json({ success: true, data: { is_favorite: rows.length > 0 } });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.status(500).json({ success: false, message: '检查收藏状态失败' });
  }
});

// 启动服务器
async function startServer() {
  await initKnowledgeTable();
  await initFavoritesTable();
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();