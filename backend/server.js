const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'), false);
    }
  }
});

// 导入考试配置管理
const { getAllExams, getExamByCode, getDefaultExam, createExam, createQuestionTable, updateExamStats } = require('./config/exams');

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
app.use(express.json({ limit: '10MB' }));

// 数据库连接配置（支持环境变量）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'peipei',
  password: process.env.DB_PASSWORD || '298280',
  database: process.env.DB_NAME || 'exam-db',
  charset: 'utf8mb4',
  connectTimeout: 10000
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

// 获取随机题目
app.get('/api/questions/random', async (req, res) => {
  const { openid, exam_code } = req.query;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam.table_name;
    
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
    
    console.log('开始查询数据库...');
    let rows;
    const connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    // 使用考试表名，如果没有则使用默认表名 security_exam_3
    const tableName = (exam && exam.table_name) || 'security_exam_3';
    console.log('使用考试:', exam_code || '默认考试', ', 表名:', tableName);
    
    // 检查表是否存在
    const [tableExists] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'exam-db' AND table_name = ?`,
      [tableName]
    );
    
    if (tableExists[0].count === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: `题库表 '${tableName}' 不存在，请先导入题目数据`
      });
    }
    
    [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
    console.log(`查询到 ${rows.length} 条题目`);
    
    await connection.end();
    console.log('数据库连接已关闭');
    
    // 处理options和answer字段，将字符串转换为数组
    console.log('开始处理数据...');
    const processedData = rows.map(row => {
      const options = parseArrayString(row.options);
      let answerArray = parseArrayString(row.answer);
      
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
      
      // 提取解析内容（以"选项："开头的行）并合并到analysis
      let extractedAnalysis = '';
      const filteredOptions = [];
      optionsArray.forEach(opt => {
        const optStr = String(opt).trim();
        if (optStr.includes('选项：')) {
          // 这是解析内容，提取出来
          extractedAnalysis += optStr + '\n';
        } else {
          // 这是真正的选项
          filteredOptions.push(opt);
        }
      });
      optionsArray = filteredOptions;
      
      // 如果原始analysis为空，但提取到了解析内容，使用提取的内容
      if (!row.analysis && extractedAnalysis) {
        row.analysis = extractedAnalysis.trim();
      } else if (row.analysis && extractedAnalysis) {
        // 如果都有内容，合并它们
        row.analysis = row.analysis + '\n' + extractedAnalysis.trim();
      }
      
      // 将答案数组转换为字母格式（如 ["正确"] -> "A"，["选项1", "选项3"] -> "AC"）
      // 确保answerArray是数组类型
      if (!Array.isArray(answerArray)) {
        console.warn('answerArray不是数组类型:', typeof answerArray, answerArray);
        answerArray = [];
      }
      
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
      
      // 获取标准化类型：优先使用数据库中的type字段
      let normalizedType = typeMap[row.type] || row.type;
      
      // 如果答案有多个选项，一定是多选题（覆盖数据库类型，因为答案格式更可靠）
      if (answerArray && answerArray.length > 1) {
        normalizedType = 'multiple';
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
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam.table_name;
    
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

// 获取随机题目（指定数量）
app.get('/api/questions/random/:count', async (req, res) => {
  const { openid, exam_code } = req.query;
  const count = parseInt(req.params.count) || 10;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = exam_code ? await getExamByCode(connection, exam_code) : await getDefaultExam(connection);
    const tableName = exam.table_name;
    
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
    exam_description = '', 
    exam_desc_detail = '', 
    description = '', 
    icon = '📚', 
    table_name, 
    total_questions = 0, 
    judgment_count = 0, 
    single_count = 0, 
    multiple_count = 0, 
    enabled = 1, 
    sort_order = 999 
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
    
    // 同时在exam_guide表中创建对应的指南记录
    await connection.execute(
      'INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [exam_code, exam_name, '', '[]', '[]', '[]', '']
    );
    
    // 同时在knowledge_points表中创建默认的知识要点记录
    await connection.execute(
      'INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES (?, ?, ?, ?)',
      [exam_code, '1. 考试概述', '该题库的考试概述信息将在这里显示。', 1]
    );
    await connection.execute(
      'INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES (?, ?, ?, ?)',
      [exam_code, '2. 核心知识点', '该题库的核心知识点将在这里列出。', 2]
    );
    await connection.execute(
      'INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES (?, ?, ?, ?)',
      [exam_code, '3. 备考建议', '针对该考试的备考建议将在这里提供。', 3]
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

// 软删除题库（管理接口）
app.delete('/api/exams/:examCode', async (req, res) => {
  const { examCode } = req.params;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 先检查题库是否存在
    const [examConfigs] = await connection.execute(
      'SELECT * FROM exam_config WHERE exam_code = ?',
      [examCode]
    );
    
    if (examConfigs.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, message: '考试配置不存在' });
    }
    
    // 1. 删除题目笔记表中相关数据
    await connection.execute(
      'DELETE FROM question_notes WHERE exam_code = ?',
      [examCode]
    );
    
    // 2. 删除收藏表中相关数据
    await connection.execute(
      'DELETE FROM favorites WHERE exam_code = ?',
      [examCode]
    );
    
    // 3. 删除知识点表中相关数据
    await connection.execute(
      'DELETE FROM knowledge_points WHERE exam_code = ?',
      [examCode]
    );
    
    // 4. 删除考试指南表中相关数据
    await connection.execute(
      'DELETE FROM exam_guide WHERE exam_code = ?',
      [examCode]
    );
    
    // 5. 软删除：将 exam_config 表中的 enabled 设为 0
    const [result] = await connection.execute(
      'UPDATE exam_config SET enabled = 0 WHERE exam_code = ?',
      [examCode]
    );
    
    await connection.end();
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: '题库软删除成功' });
    } else {
      res.status(404).json({ success: false, message: '考试配置不存在' });
    }
  } catch (error) {
    console.error('软删除题库失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取题目类型列表（免费）
app.get('/api/questions/types', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 从question_types表获取所有题型
    const [rows] = await connection.execute(
      'SELECT type_code, type_name, type_description, type_icon FROM question_types WHERE enabled = 1 ORDER BY sort_order'
    );
    await connection.end();
    res.json({ success: true, data: rows });
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

// 静态文件服务：提供上传的图片
app.use('/uploads', express.static(uploadsDir));

// multer错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer错误:', error.message);
    return res.status(500).json({ success: false, message: '文件上传失败: ' + error.message });
  } else if (error) {
    console.error('上传错误:', error.message);
    return res.status(500).json({ success: false, message: '上传失败: ' + error.message });
  }
  next();
});

/**
 * 图片上传接口
 * POST /api/upload/image
 * @param {string} openid - 用户openid（可选，预留字段）
 * @param {string} exam_code - 考试编码（可选，与openid配合使用）
 */
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  console.log('========== /api/upload/image 接口被调用 ==========');
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    }
    
    // 将图片文件转为base64编码
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imageData = `data:${mimeType};base64,${base64Image}`;
    
    // 删除临时文件（因为已经将内容存储到数据库，不再需要文件）
    fs.unlinkSync(req.file.path);
    
    console.log('图片转换为base64成功，大小:', fileBuffer.length, 'bytes');
    
    // 如果提供了exam_code，将图片base64数据保存到exam_guide的content字段
    const { exam_code } = req.body;
    if (exam_code) {
      const connection = await mysql.createConnection(dbConfig);
      
      // 查询现有记录
      const [existing] = await connection.execute(
        'SELECT content FROM exam_guide WHERE exam_code = ?',
        [exam_code]
      );
      
      let content = existing.length > 0 && existing[0].content ? existing[0].content : '';
      
      // 将图片添加到content中（作为img标签）
      const imgTag = `<img src="${imageData}" />`;
      content += imgTag;
      
      // 更新记录
      await connection.execute(
        'UPDATE exam_guide SET content = ?, updated_at = NOW() WHERE exam_code = ?',
        [content, exam_code]
      );
      
      await connection.end();
      console.log('图片base64数据已保存到exam_guide表的content字段');
    }
    
    res.json({ 
      success: true, 
      message: '图片上传成功',
      data: { url: imageData }  // 返回base64图片数据
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ success: false, message: '图片上传失败: ' + error.message });
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
    console.log('========== /api/notes 接口被调用 ==========');
    const { openid, exam_code, question_id } = req.query;
    console.log('请求参数 openid:', openid, ', exam_code:', exam_code, ', question_id:', question_id);
    
    if (!openid || !exam_code) {
      console.log('缺少必要参数');
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

// ==================== 考试指南备注API（已合并到 /api/guide） ====================
// 备考备注功能已合并到 PUT /api/guide 接口中，通过 content 字段更新
// 获取考试指南API
app.get('/api/guide', async (req, res) => {
  console.log('========== /api/guide 接口被调用 ==========');
  console.log('请求参数 exam_code:', req.query.exam_code);
  try {
    let { exam_code } = req.query;
    
    if (!exam_code) {
      return res.status(400).json({ success: false, message: '缺少必要参数 exam_code' });
    }
    
    // 首先从数据库查询考试指南
    const connection = await mysql.createConnection(dbConfig);
    
    // 先查询考试配置，获取正确的 exam_code（处理别名情况）
    const exam = await getExamByCode(connection, exam_code);
    if (exam) {
      // 使用配置中的 exam_code 查询指南
      exam_code = exam.exam_code;
      console.log('解析后的 exam_code:', exam_code);
    }
    
    let [rows] = await connection.execute(
      'SELECT * FROM exam_guide WHERE exam_code = ?',
      [exam_code]
    );
    await connection.end();
    
    if (rows.length > 0) {
      const guide = rows[0];
      // 将字段解析为数组格式
      const parseJsonField = (field) => {
        if (!field) return [];
        try {
          // 尝试解析为JSON
          const parsed = JSON.parse(field);
          // 如果是数组直接返回，否则转换为数组
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // 如果不是有效的JSON，按换行符分割成数组
          console.warn(`字段解析JSON失败，按换行分割: ${field.substring(0, 50)}...`);
          return field.split('\n').filter(item => item.trim());
        }
      };
      
      // 解析题型分布，转换为前端期望的格式
      const parseQuestionTypeDistribution = (field) => {
        if (!field) return [];
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // 不是JSON，按换行分割
          const lines = field.split('\n').filter(item => item.trim());
          return lines.map(line => {
            // 解析格式：判断题：40题，每题0.5分，共20分
            const typeMatch = line.match(/(.+?)：/);
            const countMatch = line.match(/(\d+)题/);
            const scoreMatch = line.match(/共(\d+)分/);
            return {
              type: typeMatch ? typeMatch[1] : line,
              count: countMatch ? parseInt(countMatch[1]) : 0,
              score: scoreMatch ? parseInt(scoreMatch[1]) : 0
            };
          }).filter(item => item.type && item.type !== '合计');
        }
        return [];
      };
      
      const parsedGuide = {
        examCode: guide.exam_code,
        title: guide.title,
        examOverview: guide.exam_overview,
        examContent: parseJsonField(guide.exam_content),
        questionTypeDistribution: parseQuestionTypeDistribution(guide.question_type_distribution),
        preparationTips: parseJsonField(guide.preparation_tips),
            content: guide.content,
        createdAt: guide.created_at,
        updatedAt: guide.updated_at
      };
      console.log('从数据库查询到考试指南:', guide.title);
      res.json({ success: true, data: parsedGuide });
    } else {
      console.log('未找到对应考试指南:', exam_code);
      res.status(404).json({ success: false, message: '未找到对应的考试指南' });
    }
  } catch (error) {
    console.error('获取考试指南失败:', error);
    res.status(500).json({ success: false, message: '获取考试指南失败' });
  }
});



// ==================== 获取考试指南列表接口 ====================
app.get('/api/guide/list', async (req, res) => {
  console.log('========== /api/guide/list 接口被调用 ==========');
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT id, exam_code, title FROM exam_guide ORDER BY id DESC',
      []
    );
    
    await connection.end();
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取考试指南列表失败:', error);
    res.status(500).json({ success: false, message: '获取考试指南列表失败' });
  }
});

// ==================== 获取知识要点列表接口 ====================
app.get('/api/knowledge/list', async (req, res) => {
  console.log('========== /api/knowledge/list 接口被调用 ==========');
  console.log('请求参数 exam_code:', req.query.exam_code);
  try {
    const { exam_code } = req.query;
    
    const connection = await mysql.createConnection(dbConfig);
    
    let rows;
    if (exam_code) {
      [rows] = await connection.execute(
        'SELECT id, title, content FROM knowledge_points WHERE exam_code = ? ORDER BY sort_order',
        [exam_code]
      );
    } else {
      [rows] = await connection.execute(
        'SELECT id, exam_code, title, content FROM knowledge_points ORDER BY exam_code, sort_order',
        []
      );
    }
    
    await connection.end();
    
    console.log('查询到知识要点数量:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取知识要点列表失败:', error);
    res.status(500).json({ success: false, message: '获取知识要点列表失败' });
  }
});

// ==================== 考试指南更新接口 ====================
// 支持更新考试指南的所有字段，包括备考备注(content字段)
app.put('/api/guide', async (req, res) => {
  console.log('========== PUT /api/guide 接口被调用 ==========');
  console.log('请求体:', JSON.stringify(req.body));
  
  try {
    const { exam_code, examOverview, examContent, questionTypeDistribution, preparationTips, content } = req.body;
    
    if (!exam_code) {
      return res.status(400).json({ success: false, message: '缺少必要参数 exam_code' });
    }
    
    // 获取正确的exam_code
    const connection = await mysql.createConnection(dbConfig);
    
    const exam = await getExamByCode(connection, exam_code);
    const finalExamCode = exam ? exam.exam_code : exam_code;
    
    // 检查是否已存在该考试指南
    let [rows] = await connection.execute(
      'SELECT id FROM exam_guide WHERE exam_code = ?',
      [finalExamCode]
    );
    
    let result;
    if (rows.length > 0) {
      // 更新现有记录 - 只更新请求中提供的字段
      const updateFields = [];
      const updateValues = [];
      
      if (examOverview !== undefined) {
        updateFields.push('exam_overview = ?');
        updateValues.push(examOverview);
      }
      if (examContent !== undefined) {
        updateFields.push('exam_content = ?');
        updateValues.push(Array.isArray(examContent) ? JSON.stringify(examContent) : JSON.stringify([]));
      }
      if (questionTypeDistribution !== undefined) {
        updateFields.push('question_type_distribution = ?');
        updateValues.push(Array.isArray(questionTypeDistribution) ? JSON.stringify(questionTypeDistribution) : JSON.stringify([]));
      }
      if (preparationTips !== undefined) {
        updateFields.push('preparation_tips = ?');
        updateValues.push(Array.isArray(preparationTips) ? JSON.stringify(preparationTips) : JSON.stringify([]));
      }
      if (content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(content);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: '没有提供任何要更新的字段' });
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(finalExamCode);
      
      [result] = await connection.execute(
        `UPDATE exam_guide SET ${updateFields.join(', ')} WHERE exam_code = ?`,
        updateValues
      );
      console.log('考试指南更新成功');
    } else {
        // 创建新记录 - 只插入提供了值的字段
        const insertFields = ['exam_code', 'title'];
        const insertValues = [finalExamCode, '']; // title字段需要默认值
        
        if (examOverview !== undefined) {
          insertFields.push('exam_overview');
          insertValues.push(examOverview);
        }
        if (examContent !== undefined) {
          insertFields.push('exam_content');
          insertValues.push(Array.isArray(examContent) ? JSON.stringify(examContent) : JSON.stringify([]));
        }
        if (questionTypeDistribution !== undefined) {
          insertFields.push('question_type_distribution');
          insertValues.push(Array.isArray(questionTypeDistribution) ? JSON.stringify(questionTypeDistribution) : JSON.stringify([]));
        }
        if (preparationTips !== undefined) {
          insertFields.push('preparation_tips');
          insertValues.push(Array.isArray(preparationTips) ? JSON.stringify(preparationTips) : JSON.stringify([]));
        }
        if (content !== undefined) {
          insertFields.push('content');
          insertValues.push(content);
        }
        
        [result] = await connection.execute(
          `INSERT INTO exam_guide (${insertFields.join(', ')}) VALUES (${insertValues.map(() => '?').join(', ')})`,
          insertValues
        );
        console.log('考试指南创建成功');
      }
    
    await connection.end();
    
    res.json({ success: true, message: '保存成功', data: result });
  } catch (error) {
    console.error('保存考试指南失败:', error);
    res.status(500).json({ success: false, message: '保存考试指南失败: ' + error.message });
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
    const tableName = exam.table_name;
    
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
app.get('/api/knowledge/list', async (req, res) => {
  console.log('========== /api/knowledge/list 接口被调用 ==========');
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

// 收藏表已通过SQL脚本创建
// 添加收藏
app.post('/api/favorites/add', async (req, res) => {
  console.log('========== /api/favorites/add 接口被调用 ==========');
  try {
    // 兼容 bank_code 和 exam_code 两种参数名
    const { openid, exam_code, bank_code, question_id } = req.body;
    const examCode = exam_code || bank_code;
    
    if (!openid || !examCode || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    try {
      await connection.execute(
        'INSERT INTO favorites (openid, exam_code, question_id) VALUES (?, ?, ?)',
        [openid, examCode, question_id]
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
    // 兼容 bank_code 和 exam_code 两种参数名
    const { openid, exam_code, bank_code, question_id } = req.body;
    const examCode = exam_code || bank_code;
    
    if (!openid || !examCode || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'DELETE FROM favorites WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, examCode, question_id]
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
    // 兼容 bank_code 和 exam_code 两种参数名
    const { openid, exam_code, bank_code } = req.query;
    const examCode = exam_code || bank_code;
    
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
    if (examCode) {
      const exam = await getExamByCode(connection, examCode);
      if (exam) {
        tableName = exam.table_name;
      }
    }
    
    query += `${tableName} q ON f.question_id = q.id 
      WHERE f.openid = ?`;
    
    const params = [openid];
    
    if (examCode) {
      query += ' AND f.exam_code = ?';
      params.push(examCode);
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
    // 兼容 bank_code 和 exam_code 两种参数名
    const { openid, exam_code, bank_code, question_id } = req.query;
    const examCode = exam_code || bank_code;
    
    if (!openid || !examCode || question_id === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT id FROM favorites WHERE openid = ? AND exam_code = ? AND question_id = ?',
      [openid, examCode, question_id]
    );
    await connection.end();
    
    res.json({ success: true, data: { is_favorite: rows.length > 0 } });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.status(500).json({ success: false, message: '检查收藏状态失败' });
  }
});

// 导入题库API - 支持解析文本格式的题目，支持自动创建新题库
// 创建支持多文件上传的multer配置
const importUpload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'), false);
    }
  }
});

app.post('/api/questions/import', importUpload.array('images', 10), async (req, res) => {
  console.log('========== /api/questions/import 接口被调用 ==========');
  try {
    // 支持两种格式：multipart/form-data 和 application/json
    const content = req.body.content || (req.body && typeof req.body === 'string' ? req.body : '');
    const exam_code = req.body.exam_code;
    const table_name = req.body.table_name;
    const exam_name = req.body.exam_name;
    const question_type = req.body.question_type;
    const source_set = req.body.source_set;
    
    console.log('收到的content内容:', content);
    console.log('content长度:', content.length);
    console.log('上传的图片数量:', req.files ? req.files.length : 0);
    
    if (!content) {
      return res.status(400).json({ success: false, message: '请提供题库内容' });
    }
    
    // 确定要插入的表名
    let targetTable = table_name;
    let createdNewExam = false;
    
    // 如果提供了exam_code，尝试获取对应的表名
    if (exam_code) {
      const connection = await mysql.createConnection(dbConfig);
      const exam = await getExamByCode(connection, exam_code);
      
      if (exam && exam.table_name) {
        // 题库已存在，使用已有的表名
        targetTable = exam.table_name;
        
        // 检查表是否存在，如果不存在则重新创建
        const [tables] = await connection.execute(
          `SHOW TABLES LIKE '${targetTable}'`
        );
        if (tables.length === 0) {
          console.log(`表 ${targetTable} 不存在，正在重新创建...`);
          await createQuestionTable(connection, targetTable);
        }
      } else if (exam_name) {
        // 题库不存在，但提供了题库名称，自动创建新题库
        console.log(`题库 ${exam_code} 不存在，正在创建新题库...`);
        const result = await createExam(connection, {
          exam_code,
          exam_name,
          description: '通过导入功能创建的题库',
          icon: '📚'
        });
        
        if (result.success) {
          targetTable = result.table_name;
          createdNewExam = true;
          console.log(`新题库创建成功，表名: ${targetTable}`);
        } else {
          await connection.end();
          return res.status(400).json({ success: false, message: result.message });
        }
      } else {
        await connection.end();
        return res.status(400).json({ success: false, message: `题库 ${exam_code} 不存在，请提供题库名称(exam_name)以创建新题库` });
      }
      
      await connection.end();
    }
    
    console.log('目标表:', targetTable);
    
    // 不保存Base64图片到服务器，直接保留在内容中
    let finalContent = content;
    const savedImages = [];
    
    // 处理上传的图片文件：将其转换为Base64格式并嵌入到内容中
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        // 读取文件并转换为Base64
        const fileBuffer = await fs.promises.readFile(file.path);
        const base64Data = fileBuffer.toString('base64');
        const mimeType = file.mimetype;
        const base64Image = `data:${mimeType};base64,${base64Data}`;
        const imgTag = `<img src="${base64Image}" />`;
        
        // 替换内容中的图片占位符
        // 支持多种占位符格式：[图片1], [image1], <img src="blob:xxx">, <img src="data:image/xxx">
        const blobRegex = /<img[^>]+src=["']blob:[^"']+["'][^>]*>/i;
        const placeholderRegex = new RegExp(`[\\[（](图片|image)\\s*${i + 1}[\\]）]`, 'gi');
        
        // 优先替换blob格式的图片
        if (blobRegex.test(finalContent)) {
          finalContent = finalContent.replace(blobRegex, imgTag);
        } else if (placeholderRegex.test(finalContent)) {
          // 替换[图片1]或（image1）格式的占位符
          finalContent = finalContent.replace(placeholderRegex, imgTag);
        } else {
          // 如果没有找到对应占位符，在内容末尾添加图片
          finalContent += imgTag;
        }
        
        savedImages.push(base64Image);
        console.log(`将上传的图片转换为Base64并嵌入到内容中`);
        
        // 删除临时上传的文件
        try {
          await fs.promises.unlink(file.path);
        } catch (unlinkErr) {
          console.warn('删除临时文件失败:', unlinkErr.message);
        }
      }
    }
    console.log(`处理了 ${savedImages.length} 张图片（直接嵌入到内容中）`);
    
    // 解析题目内容
    const questions = parseQuestionContent(finalContent);
    console.log(`解析出 ${questions.length} 道题目`);
    console.log('解析的题目详情:', JSON.stringify(questions, null, 2));
    
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: '未能解析出题目，请检查格式' });
    }
    
    // 插入数据库
    const connection = await mysql.createConnection(dbConfig);
    let successCount = 0;
    const errors = [];
    
    // 动态获取 question_types 表中的有效题型编码
    //let validTypes = ['single', 'multiple', 'judgment']; // 默认值（防止查询失败）
    try {
      const [typeRows] = await connection.execute('SELECT type_code FROM question_types WHERE enabled = 1');
      validTypes = typeRows.map(row => row.type_code);
      console.log('从 question_types 表获取的有效题型:', validTypes);
    } catch (e) {
      console.warn('获取题型列表失败!', e.message);
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        // 判断题目类型：优先使用用户指定的题型（必须是有效值），否则自动识别
        let type = 'single'; // 默认值
        
        // 检查用户传入的 question_type 是否有效
        if (question_type && validTypes.includes(question_type)) {
          type = question_type;
        } else {
          // 自动识别题型
          if (q.options && q.options.length === 2) {
            type = 'judgment';
          } else if (q.options && q.options.length >= 5) {
            type = 'multiple';
          } else if (q.answer && q.answer.length > 1) {
            type = 'multiple';
          }
        }
        
        // 将答案转换为JSON数组格式
        const answerArray = Array.isArray(q.answer) ? q.answer : [q.answer];
        
        await connection.execute(
          `INSERT INTO ${targetTable} (question, options, answer, analysis, type, exam_code, source_set) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            q.question_text,
            JSON.stringify(q.options),
            JSON.stringify(answerArray),
            q.analysis || '',
            type,
            exam_code || 'default',
            source_set || 0
          ]
        );
        successCount++;
      } catch (err) {
        errors.push({ index: i + 1, question: q.question_text, error: err.message });
        console.error(`第 ${i + 1} 题导入失败:`, err.message);
      }
    }
    
    await connection.end();
    
    // 更新题库统计信息
    if (exam_code) {
      await updateExamStats(exam_code, targetTable);
    }
    
    if (errors.length === 0) {
      res.json({ 
        success: true, 
        message: `成功导入 ${successCount} 道题目`,
        count: successCount 
      });
    } else {
      res.json({ 
        success: true, 
        message: `成功导入 ${successCount} 道题目，${errors.length} 道失败`,
        count: successCount,
        errors: errors.slice(0, 10) // 最多返回10个错误
      });
    }
    
  } catch (error) {
    console.error('导入题库失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误: ' + error.message });
  }
});

// 从内容中提取并保存Base64图片，返回处理后的内容和图片列表
// 解析题目内容的函数（支持HTML img标签）
function parseQuestionContent(content) {
  const questions = [];
  
  // 预处理：在连续的选项之间插入换行符
  // 匹配多种选项格式：A、 B、 C、 D、 E、 或 A. B. C. D. E. 或 A． B． C． D． E．
  // 使用更宽松的正则，确保能匹配到选项
  content = content.replace(/([A-Ea-e])([．.、])/g, '\n$1$2');
  
  // 在答案前插入换行（注意顺序：先处理"正确答案"再处理"答案"）
  content = content.replace(/([^\n])(正确答案)\s*[：:]/g, '$1\n$2：');
  
  // 在解析前插入换行（先处理"名师解析"，再处理单独的"解析"）
  // 使用更宽松的正则，确保即使"名师"和"解析"之间有空格或换行也能正确处理
  content = content.replace(/([^\n])(名师\s*解析)\s*[：:]/g, '$1\n$2：');
  content = content.replace(/([^\n])(解析)\s*[：:]/g, '$1\n$2：');
  
  // 在"回答错误"、"我的答案"前插入换行（使用负向前瞻，避免重复匹配"正确答案"中的"答案"）
  content = content.replace(/([^\n])(回答错误|我的答案)/g, '$1\n$2');
  
  // 处理开头可能缺少换行的情况
  content = content.replace(/^\s*/, '');
  
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('预处理后的行数:', lines.length);
  console.log('预处理后的内容:', lines);
  
  let currentQuestion = null;
  let inAnalysis = false;
  let materials = [];  // 收集题目开始前的材料内容
  let isFirstQuestion = true;  // 标记是否是第一个题目
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 检测是否是新题目开始的条件
    // 1. 匹配题号格式：第 * 题
    // 2. 匹配新格式：单选 1、多选 1、判断 1 等
    // 3. 匹配括号格式：(1)、(2)、(3) 等
    // 4. 遇到答案行且已经有题目内容
    // 5. 遇到选项A且已经有题目内容且没有当前题目
    // 支持多种格式："第61题"、"61题"、"61 题"、"第 61 题"、"(1)"、"(123)"
const questionMatch = line.match(/^(第)?\s*(\d+)\s*题/);
    const newFormatMatch = line.match(/^(单选|多选|判断|判断题|单选题|多选题)\s*\d+/);
    const bracketMatch = line.match(/^\((\d+)\)/);
    const isAnswerLine = line.match(/^(正确答案|答案)\s*[：:]/);
    const isOptionA = line.match(/^A[．.、]\s*/);
    
    // 只有明确识别到题目开始标记时才创建新题目
    if (questionMatch || newFormatMatch || bracketMatch) {
      // 如果有当前题目，先保存
      if (currentQuestion && currentQuestion.question_text) {
        questions.push(currentQuestion);
      }
      
      // 开始新题目
      currentQuestion = {
        question_text: '',
        options: [],
        answer: '',
        analysis: ''
      };
      inAnalysis = false;
      
      // 如果是第一个题目，将之前收集的材料内容添加到题目文本中
      if (isFirstQuestion && materials.length > 0) {
        currentQuestion.question_text = materials.join('\n');
        isFirstQuestion = false;
      }
      
      // 如果是题号格式，提取题号后面的内容作为题目文本的开始
      if (questionMatch) {
        const remainingText = line.replace(/^(第)?\s*\d+\s*题\s*/, '');
        if (remainingText && remainingText.length > 0) {
          currentQuestion.question_text += (currentQuestion.question_text ? '\n' : '') + remainingText;
        }
      }
      
      // 如果是括号格式，提取括号后面的内容作为题目文本的开始
      if (bracketMatch) {
        const remainingText = line.replace(/^\(\d+\)\s*/, '');
        if (remainingText && remainingText.length > 0) {
          currentQuestion.question_text += (currentQuestion.question_text ? '\n' : '') + remainingText;
        }
      }
      
      continue;
    }
    
    // 如果遇到选项A但还没有当前题目，说明前面可能缺少题号，创建新题目
    if (isOptionA && !currentQuestion) {
      currentQuestion = {
        question_text: '',
        options: [],
        answer: '',
        analysis: ''
      };
      // 如果之前有收集的材料内容，将其作为题目文本
      if (materials.length > 0) {
        currentQuestion.question_text = materials.join('\n');
        materials = [];
        isFirstQuestion = false;
      }
    }
    
    // 如果没有当前题目，收集材料内容（图片、描述等）
    if (!currentQuestion) {
      materials.push(line);
      continue;
    }
    
    // 匹配选项格式：支持 A. A、 A． 三种格式
    // 但如果行中包含<img标签，则不视为选项（可能是题目内容的延续）
    const optionMatch = line.match(/^([A-Ea-e])[．.、]\s*(.+)/);
    if (optionMatch && !line.includes('<img')) {
      inAnalysis = false;
      currentQuestion.options.push(optionMatch[2]); // 只存选项内容，不存"A. "前缀
      continue;
    }
    
    // 匹配答案：支持"正确答案："或"答案："格式
    const answerMatch = line.match(/^(正确答案|答案)\s*[：:]\s*([A-Ea-e]+)/);
    if (answerMatch) {
      currentQuestion.answer = answerMatch[2].toUpperCase();
      continue;
    }
    
    // 跳过"回答错误"、"我的答案：xxx"等无用行
    if (line.startsWith('回答错误') || line.startsWith('我的答案') || line === '未作答') {
      continue;
    }
    
    // 匹配解析
    if (line.startsWith('名师解析') || line.startsWith('解析')) {
      inAnalysis = true;
      // 提取解析内容
      const analysisContent = line.replace(/^名师解析\s*[：:]\s*/, '').replace(/^解析\s*[：:]\s*/, '');
      if (analysisContent) {
        currentQuestion.analysis = analysisContent;
      }
      continue;
    }
    
    // 如果在解析部分，继续添加解析内容
    if (inAnalysis) {
      currentQuestion.analysis += (currentQuestion.analysis ? '\n' : '') + line;
      continue;
    }
    
    // 如果有答案了，后面的内容可能是解析（即使没有"解析"开头）
    if (currentQuestion.answer) {
      inAnalysis = true;
      currentQuestion.analysis += (currentQuestion.analysis ? '\n' : '') + line;
      continue;
    }
    
    // 否则是题目内容的一部分（保留HTML img标签）
    currentQuestion.question_text += (currentQuestion.question_text ? '\n' : '') + line;
  }
  
  // 添加最后一道题目
  if (currentQuestion && currentQuestion.question_text && currentQuestion.options.length > 0) {
    questions.push(currentQuestion);
  }
  
  // 过滤不完整的题目（至少需要有题目内容和选项）
  const validQuestions = questions.filter(q => q.question_text && q.options && q.options.length > 0);
  
  console.log(`过滤后有效题目数: ${validQuestions.length}（原始解析: ${questions.length}）`);
  
  return validQuestions;
}

// 删除题目接口
app.delete('/api/questions/:exam_code/:id', async (req, res) => {
  const { exam_code, id } = req.params;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = await getExamByCode(connection, exam_code);
    if (!exam) {
      await connection.end();
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    
    const tableName = exam.table_name;
    
    // 删除题目
    await connection.execute(
      `DELETE FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    // 同时删除该题目的所有用户备注
    await connection.execute(
      'DELETE FROM question_notes WHERE exam_code = ? AND question_id = ?',
      [exam_code, id]
    );
    
    await connection.end();
    
    // 清除缓存
    await cacheQuestions(exam_code, null);
    
    res.json({ success: true, message: '题目删除成功' });
  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({ success: false, message: '删除题目失败' });
  }
});

// 更新题目接口
app.put('/api/questions/:exam_code/:id', async (req, res) => {
  const { exam_code, id } = req.params;
  const { question, options, answer, explanation, analysis, type, knowledgePoint } = req.body;

  // 支持 analysis 和 explanation 两个字段名
  const finalAnalysis = explanation || analysis || '';
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 获取考试配置
    const exam = await getExamByCode(connection, exam_code);
    if (!exam) {
      await connection.end();
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    
    const tableName = exam.table_name;
    
    // 查询表结构，获取存在的字段
    const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
    const columnNames = columns.map(col => col.Field);
    
    // 动态构建更新语句
    const updateFields = [];
    const updateValues = [];
    
    updateFields.push('question = ?');
    updateValues.push(question);
    
    updateFields.push('options = ?');
    updateValues.push(JSON.stringify(options));
    
    // 将答案转换为JSON数组格式存储
    let answerArray;
    if (typeof answer === 'string') {
      try {
        // 尝试解析为JSON数组
        answerArray = JSON.parse(answer);
      } catch {
        // 如果解析失败，说明是单个字符或字符串，转为数组
        answerArray = answer.split('');
      }
    } else {
      answerArray = answer;
    }
    const answerJson = Array.isArray(answerArray) ? JSON.stringify(answerArray) : JSON.stringify([answerArray]);

    updateFields.push('answer = ?');
    updateValues.push(answerJson);
    
    updateFields.push('analysis = ?');
    updateValues.push(finalAnalysis);
    
    updateFields.push('type = ?');
    updateValues.push(type || 'single');
    
    // 如果有知识点字段且传入了知识点，添加更新
    if (knowledgePoint && columnNames.includes('knowledge_point')) {
      updateFields.push('knowledge_point = ?');
      updateValues.push(knowledgePoint);
    }
    
    // 更新题目
    await connection.execute(
      `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, id]
    );
    
    await connection.end();
    
    // 清除缓存
    await cacheQuestions(exam_code, null);
    
    res.json({ success: true, message: '题目更新成功' });
  } catch (error) {
    console.error('更新题目失败:', error);
    res.status(500).json({ success: false, message: '更新题目失败' });
  }
});

// 全局未处理的Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('========== 未处理的Promise拒绝 ==========');
  console.error('原因:', reason);
  console.error('Promise:', promise);
  console.error('堆栈:', reason ? reason.stack : '无');
});

// 全局未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('========== 未捕获的异常 ==========');
  console.error('错误类型:', typeof error);
  console.error('错误消息:', error.message);
  console.error('错误堆栈:', error.stack);
  
  // 记录错误后，延迟退出，让请求完成
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// 启动服务器
async function startServer() {
  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
