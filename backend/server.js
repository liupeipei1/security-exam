const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

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

// 获取随机题目
app.get('/api/questions/random', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions ORDER BY RAND() LIMIT 1'
    );
    await connection.end();
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: '没有找到题目' });
    }
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取题目列表
app.get('/api/questions', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM bank_medium_questions');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 根据类型获取题目列表
app.get('/api/questions/type/:type', async (req, res) => {
  const questionType = req.params.type;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions WHERE question_type = ?',
      [questionType]
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取随机题目（指定数量）
app.get('/api/questions/random/:count', async (req, res) => {
  const count = parseInt(req.params.count) || 10;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM bank_medium_questions ORDER BY RAND() LIMIT ?',
      [count]
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 创建表结构（如果不存在）
async function initDatabase() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS bank_medium_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question TEXT NOT NULL,
      option_a VARCHAR(500) DEFAULT NULL,
      option_b VARCHAR(500) DEFAULT NULL,
      option_c VARCHAR(500) DEFAULT NULL,
      option_d VARCHAR(500) DEFAULT NULL,
      answer VARCHAR(10) NOT NULL,
      analysis TEXT DEFAULT NULL,
      question_type VARCHAR(50) DEFAULT NULL,
      source VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(createTableSql);
    await connection.end();
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 启动服务器（先初始化数据库）
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();