
// 补充缺失的字段
function completeExamFields(exam) {
  return {
    ...exam,
    description: exam.description || exam.bank_desc_detail || '',
    total_questions: exam.total_questions || 0,
    judgment_count: exam.judgment_count || 0,
    single_count: exam.single_count || 0,
    multiple_count: exam.multiple_count || 0
  };
}

// 获取所有考试配置
async function getAllExams(connection) {
  const [rows] = await connection.execute(
    'SELECT * FROM exam_config WHERE enabled = 1 ORDER BY sort_order ASC'
  );
  return rows.map(exam => completeExamFields(exam));
}

// 根据代码获取考试配置
async function getExamByCode(connection, examCode) {
  const [rows] = await connection.execute(
    'SELECT * FROM exam_config WHERE exam_code = ? AND enabled = 1',
    [examCode]
  );
  if (rows.length > 0) {
    return completeExamFields(rows[0]);
  }
  return null;
}

// 获取默认考试
async function getDefaultExam(connection) {
  const [rows] = await connection.execute(
    'SELECT * FROM exam_config WHERE enabled = 1 ORDER BY sort_order ASC LIMIT 1'
  );
  if (rows.length > 0) {
    return completeExamFields(rows[0]);
  }
  return null;
}

// 创建新的题库配置
async function createExam(connection, examData) {
  const { exam_code, exam_name, description, icon, table_name } = examData;
  
  // 检查是否已存在
  const existing = await getExamByCode(connection, exam_code);
  if (existing) {
    return { success: false, message: '题库代码已存在' };
  }
  
  // 如果没有指定表名，自动生成（直接使用exam_code作为表名）
    const targetTableName = table_name || exam_code;
  
  try {
    await connection.execute(
      'INSERT INTO exam_config (exam_code, exam_name, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [exam_code, exam_name, description || '', icon || '📚', targetTableName, 0, 0, 0, 0, 1, 999]
    );
    
    // 创建对应的数据表
    await createQuestionTable(connection, targetTableName);
    
    // 同时在exam_guide表中创建对应的指南记录（使用题库名称作为指南标题）
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
    
    return { success: true, message: '题库创建成功', exam_code, table_name: targetTableName };
  } catch (error) {
    return { success: false, message: '创建失败: ' + error.message };
  }
}

// 创建题目数据表
async function createQuestionTable(connection, tableName) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT PRIMARY KEY AUTO_INCREMENT,
      type ENUM('judgment', 'single', 'multiple') NOT NULL COMMENT '题型',
      question LONGTEXT NOT NULL COMMENT '题目内容（支持HTML格式，可包含图片标签）',
      options JSON NOT NULL COMMENT '选项列表',
      answer JSON NOT NULL COMMENT '正确答案',
      analysis LONGTEXT COMMENT '题目分析（支持HTML格式，可包含图片标签）',
      exam_code VARCHAR(50) COMMENT '考试代码',
      source_set TINYINT DEFAULT 0 COMMENT '来源套卷编号',
      tags VARCHAR(500) DEFAULT '' COMMENT '自定义标签，逗号分隔',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目表'
  `;
  
  await connection.execute(createTableSQL);
}

// 更新题库统计信息
async function updateExamStats(examCode, tableName) {
  const mysql = require('mysql2/promise');
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'peipei',
    password: process.env.DB_PASSWORD || '298280',
    database: process.env.DB_NAME || 'exam-db',
    charset: 'utf8mb4'
  };
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 统计各类题型数量
    const [judgmentResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE type = 'judgment'`
    );
    const judgmentCount = judgmentResult[0].count || 0;
    
    const [singleResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE type = 'single'`
    );
    const singleCount = singleResult[0].count || 0;
    
    const [multipleResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE type = 'multiple'`
    );
    const multipleCount = multipleResult[0].count || 0;
    
    const totalQuestions = judgmentCount + singleCount + multipleCount;
    
    // 更新 exam_config 表
    await connection.execute(
      'UPDATE exam_config SET total_questions = ?, judgment_count = ?, single_count = ?, multiple_count = ? WHERE exam_code = ?',
      [totalQuestions, judgmentCount, singleCount, multipleCount, examCode]
    );
    
    console.log(`题库 ${examCode} 统计已更新: 总计 ${totalQuestions} 题 (判断: ${judgmentCount}, 单选: ${singleCount}, 多选: ${multipleCount})`);
    
    return { success: true, totalQuestions, judgmentCount, singleCount, multipleCount };
  } catch (error) {
    console.error('更新题库统计失败:', error.message);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

module.exports = {
  getAllExams,
  getExamByCode,
  getDefaultExam,
  createExam,
  createQuestionTable,
  updateExamStats
};