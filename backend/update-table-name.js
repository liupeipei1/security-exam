const mysql = require('mysql2/promise');

async function updateTableName() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'exam-db'
  });
  
  try {
    await connection.execute(
      "UPDATE exam_config SET table_name = 'ai_trainer_3' WHERE exam_code = 'ai_trainer_3'"
    );
    console.log('table_name 更新成功');
  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateTableName();