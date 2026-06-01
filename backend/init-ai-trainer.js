const mysql = require('mysql2/promise');
const fs = require('fs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'exam-db',
  charset: 'utf8mb4'
};

async function executeSqlFile(filePath) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    // 按分号分割SQL语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    
    console.log('SQL文件执行成功');
  } catch (error) {
    console.error('SQL文件执行失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行 ai_trainer_3.sql 文件
executeSqlFile('../DML/ai_trainer_3.sql')
  .then(() => process.exit(0))
  .catch(() => process.exit(1));