const mysql = require('mysql2/promise');
const fs = require('fs');

async function initBankConfig() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'exam-db'
  });

  try {
    const sql = fs.readFileSync('DML/bank_config.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ 题库配置表初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  } finally {
    await connection.end();
  }
}

initBankConfig();