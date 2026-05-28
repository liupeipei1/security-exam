
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

module.exports = {
  getAllExams,
  getExamByCode,
  getDefaultExam
};