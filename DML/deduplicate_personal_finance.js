/**
 * 个人理财题库去重脚本
 * 检测并去除bank_personal_finance表中的重复题目
 */

const fs = require('fs');
const path = require('path');

// SQL文件路径
const sqlFilePath = path.join(__dirname, 'personal_finance.sql');
const outputFilePath = path.join(__dirname, 'personal_finance_dedup.sql');

// 读取SQL文件
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// 按行分割
const lines = sqlContent.split('\n');

// 找到INSERT语句开始的位置
let insertStartIndex = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('INSERT INTO bank_personal_finance')) {
    insertStartIndex = i;
    break;
  }
}

// 提取非INSERT部分（表结构等）
const headerContent = lines.slice(0, insertStartIndex).join('\n');

// 提取所有INSERT语句
const insertLines = lines.slice(insertStartIndex);

// 解析INSERT语句，提取题目内容作为去重键
const questions = [];
let currentInsert = '';

for (const line of insertLines) {
  currentInsert += line;
  
  // 找到完整的INSERT语句（以分号结尾）
  if (currentInsert.trim().endsWith(');')) {
    // 提取题目内容
    // 格式: INSERT INTO ... VALUES ('single', '题目内容', ...);
    const match = currentInsert.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/);
    if (match) {
      const type = match[1];
      const question = match[2];
      
      questions.push({
        type,
        question,
        fullSql: currentInsert.trim()
      });
    }
    currentInsert = '';
  }
}

console.log(`\n=== 题库统计 ===`);
console.log(`总题目数: ${questions.length}`);

// 按题型统计
const typeStats = {};
questions.forEach(q => {
  typeStats[q.type] = (typeStats[q.type] || 0) + 1;
});
console.log(`题型分布:`, typeStats);

// 检测重复题目（基于题目内容）
const questionMap = new Map();
const duplicates = [];
const uniqueQuestions = [];

questions.forEach((q, index) => {
  const key = q.question.trim();
  
  if (questionMap.has(key)) {
    duplicates.push({
      originalIndex: questionMap.get(key).index,
      duplicateIndex: index,
      question: q.question.substring(0, 50) + (q.question.length > 50 ? '...' : '')
    });
  } else {
    questionMap.set(key, { index, question: q });
    uniqueQuestions.push(q);
  }
});

console.log(`\n=== 去重结果 ===`);
console.log(`重复题目数: ${duplicates.length}`);
console.log(`去重后题目数: ${uniqueQuestions.length}`);

if (duplicates.length > 0) {
  console.log(`\n=== 重复题目详情 ===`);
  duplicates.forEach((dup, i) => {
    console.log(`${i + 1}. 题目: ${dup.question}`);
    console.log(`   - 原始行: ${dup.originalIndex + 1}`);
    console.log(`   - 重复行: ${dup.duplicateIndex + 1}`);
  });
}

// 生成去重后的SQL文件
let outputSql = `-- 个人理财题库 - 去重后
-- 生成时间: ${new Date().toLocaleString('zh-CN')}
-- 原题目数: ${questions.length}
-- 去重后: ${uniqueQuestions.length}
-- 去除重复: ${duplicates.length}

USE exam-db;

-- 删除原有数据（如需）
-- TRUNCATE TABLE bank_personal_finance;

`;

// 添加表结构
outputSql += headerContent + '\n\n';

// 添加去重后的INSERT语句
uniqueQuestions.forEach(q => {
  outputSql += q.fullSql + '\n';
});

// 写入去重后的SQL文件
fs.writeFileSync(outputFilePath, outputSql, 'utf8');
console.log(`\n=== 输出文件 ===`);
console.log(`已生成去重后SQL文件: ${outputFilePath}`);

// 输出统计信息
const finalTypeStats = {};
uniqueQuestions.forEach(q => {
  finalTypeStats[q.type] = (finalTypeStats[q.type] || 0) + 1;
});
console.log(`\n=== 去重后题型分布 ===`);
console.log(finalTypeStats);