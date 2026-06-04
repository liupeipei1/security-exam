
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
  
  // 如果没有指定表名，自动生成
  const targetTableName = table_name || `bank_${exam_code}`;
  
  try {
    await connection.execute(
      'INSERT INTO exam_config (exam_code, exam_name, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [exam_code, exam_name, description || '', icon || '📚', targetTableName, 0, 0, 0, 0, 1, 999]
    );
    
    // 创建对应的数据表
    await createQuestionTable(connection, targetTableName);
    
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
      question TEXT NOT NULL COMMENT '题目内容',
      options JSON NOT NULL COMMENT '选项列表',
      answer JSON NOT NULL COMMENT '正确答案',
      explanation VARCHAR(500) COMMENT '解析说明',
      analysis VARCHAR(1000) COMMENT '题目分析',
      exam_code VARCHAR(50) COMMENT '考试代码',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目表'
  `;
  
  await connection.execute(createTableSQL);
}

module.exports = {
  getAllExams,
  getExamByCode,
  getDefaultExam,
  createExam,
  createQuestionTable
};