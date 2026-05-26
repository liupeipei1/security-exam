/**
 * 个人理财题库更新脚本
 * 将去重后的题库数据导入数据库
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'exam-db',
  charset: 'utf8mb4'
};

// SQL文件路径
const sqlFilePath = path.join(__dirname, '../DML/personal_finance_dedup.sql');

async function main() {
  console.log('=== 个人理财题库更新脚本 ===');
  
  // 读取SQL文件
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 按分号分割，但要注意JSON中的分号
  const insertStatements = [];
  let currentStatement = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let braceDepth = 0;
  
  for (let i = 0; i < sqlContent.length; i++) {
    const char = sqlContent[i];
    
    // 处理转义字符
    if (char === '\\') {
      currentStatement += char;
      i++; // 跳过下一个字符
      currentStatement += sqlContent[i];
      continue;
    }
    
    // 处理单引号
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    }
    
    // 处理双引号（在JSON中）
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }
    
    // 处理花括号和方括号
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '{' || char === '[') {
        braceDepth++;
      } else if (char === '}' || char === ']') {
        braceDepth--;
      }
    }
    
    // 只有不在引号内且花括号深度为0时，分号才表示语句结束
    if (char === ';' && !inSingleQuote && !inDoubleQuote && braceDepth === 0) {
      const trimmed = currentStatement.trim();
      if (trimmed.startsWith('INSERT INTO bank_personal_finance')) {
        insertStatements.push(trimmed + ';');
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  console.log(`共读取到 ${insertStatements.length} 条INSERT语句`);
  
  // 连接数据库
  const connection = await mysql.createConnection(dbConfig);
  console.log('数据库连接成功');
  
  try {
    // 开始事务
    await connection.beginTransaction();
    console.log('开始事务');
    
    // 清空旧数据
    console.log('清空旧数据...');
    await connection.execute('DELETE FROM bank_personal_finance');
    
    // 解析并插入数据
    let successCount = 0;
    let failCount = 0;
    const failedItems = [];
    
    for (let i = 0; i < insertStatements.length; i++) {
      const sql = insertStatements[i];
      
      try {
        // 提取VALUES部分
        const match = sql.match(/VALUES\s*\((.*)\)/);
        if (match) {
          const valuesStr = match[1];
          // 解析VALUES中的值
          const values = parseValues(valuesStr);
          
          if (values && values.length >= 6) {
            // 使用参数化查询
            const [type, question, options, answer, analysis, sourceSet] = values;
            await connection.execute(
              'INSERT INTO bank_personal_finance (type, question, options, answer, analysis, source_set) VALUES (?, ?, ?, ?, ?, ?)',
              [type, question, options, answer, analysis, sourceSet === '' ? null : sourceSet]
            );
            successCount++;
          } else {
            throw new Error('解析VALUES失败');
          }
        } else {
          throw new Error('未找到VALUES部分');
        }
      } catch (error) {
        failCount++;
        if (failedItems.length < 10) {
          failedItems.push({ index: i + 1, error: error.message });
        }
      }
      
      // 进度显示
      if ((i + 1) % 100 === 0) {
        console.log(`已处理 ${i + 1} 条，成功 ${successCount}，失败 ${failCount}`);
      }
    }
    
    // 提交事务
    await connection.commit();
    console.log('事务提交成功');
    
    // 验证结果
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM bank_personal_finance');
    const finalCount = result[0].count;
    
    console.log('\n=== 更新结果 ===');
    console.log(`尝试插入: ${insertStatements.length} 条`);
    console.log(`成功插入: ${successCount} 条`);
    console.log(`失败: ${failCount} 条`);
    console.log(`数据库中当前题目总数: ${finalCount} 条`);
    
    if (failedItems.length > 0) {
      console.log('\n=== 失败记录（前10条）===');
      failedItems.forEach(item => {
        console.log(`第 ${item.index} 条: ${item.error}`);
      });
    }
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error('事务回滚:', error.message);
    throw error;
  } finally {
    // 关闭连接
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

/**
 * 解析VALUES中的值
 */
function parseValues(valuesStr) {
  const values = [];
  let currentValue = '';
  let inQuotes = false;
  let escaped = false;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    if (escaped) {
      currentValue += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inQuotes) {
      currentValue += char;
      escaped = true;
      continue;
    }
    
    if (char === "'") {
      inQuotes = !inQuotes;
      continue;
    }
    
    if (!inQuotes && char === ',') {
      values.push(currentValue.trim());
      currentValue = '';
      continue;
    }
    
    currentValue += char;
  }
  
  // 添加最后一个值
  values.push(currentValue.trim());
  
  return values;
}

// 运行脚本
main().catch(console.error);