/**
 * 更新数据库脚本 - 将去重后的个人理财题库导入数据库
 */

const fs = require('fs');
const path = require('path');

// 动态require mysql2（支持从不同目录运行）
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  // 如果当前目录没有mysql2，尝试从backend目录加载
  const backendPath = path.join(__dirname, '..', 'backend');
  process.chdir(backendPath);
  mysql = require('mysql2/promise');
}

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'exam-db',
  charset: 'utf8mb4'
};

// 去重后的SQL文件路径
const sqlFilePath = path.join(__dirname, 'personal_finance_dedup.sql');

async function updateDatabase() {
  let connection;
  
  try {
    // 连接数据库
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 读取去重后的SQL文件
    console.log('\n读取去重后的SQL文件...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 解析SQL语句（按分号分割）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('USE'));
    
    console.log(`解析到 ${sqlStatements.length} 条SQL语句`);
    
    // 开始事务
    await connection.beginTransaction();
    console.log('开始事务');
    
    try {
      // 清空原有数据
      console.log('\n清空原有个人理财题库数据...');
      await connection.execute('TRUNCATE TABLE bank_personal_finance');
      console.log('原有数据已清空');
      
      // 执行所有INSERT语句
      console.log('\n开始导入新数据...');
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < sqlStatements.length; i++) {
        try {
          await connection.execute(sqlStatements[i]);
          successCount++;
          
          // 每50条输出一次进度
          if ((i + 1) % 50 === 0) {
            console.log(`已导入 ${i + 1}/${sqlStatements.length} 条记录`);
          }
        } catch (e) {
          failCount++;
          console.log(`导入第 ${i + 1} 条记录失败: ${e.message}`);
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n事务提交成功');
      
      console.log(`\n=== 导入结果 ===`);
      console.log(`成功导入: ${successCount} 条`);
      console.log(`导入失败: ${failCount} 条`);
      
      // 验证导入结果
      const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM bank_personal_finance');
      console.log(`\n数据库中当前题目总数: ${countResult[0].total}`);
      
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.error('\n事务回滚:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('数据库操作失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行更新
updateDatabase().then(() => {
  console.log('\n✅ 数据库更新完成！');
}).catch((error) => {
  console.error('\n❌ 数据库更新失败:', error.message);
  process.exit(1);
});