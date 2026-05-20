/**
 * 题库配置管理
 * 支持动态配置多个题库
 */

// 默认题库配置（可通过数据库配置覆盖）
const defaultBankConfigs = [
  {
    bank_code: 'security_admin_3',
    bank_name: '网络与信息安全管理员（三级）',
    bank_description: '网络与信息安全管理员（三级）理论知识考试题库',
    bank_desc_detail: '适用于网络与信息安全管理员职业技能等级认定考试三级（高级工）理论知识复习',
    description: '适用于网络与信息安全管理员职业技能等级认定考试三级（高级工）理论知识复习',
    table_name: 'security_exam_3',
    enabled: true,
    sort_order: 1,
    icon: '🔒',
    total_questions: 190,
    judgment_count: 40,
    single_count: 140,
    multiple_count: 10
  },
  {
    bank_code: 'security_admin_4',
    bank_name: '网络与信息安全管理员（四级）',
    bank_description: '网络与信息安全管理员（四级）理论知识考试题库',
    bank_desc_detail: '适用于网络与信息安全管理员职业技能等级认定考试四级（中级工）理论知识复习',
    description: '适用于网络与信息安全管理员职业技能等级认定考试四级（中级工）理论知识复习',
    table_name: 'security_exam_3',
    enabled: true,
    sort_order: 2,
    icon: '🔓',
    total_questions: 150,
    judgment_count: 30,
    single_count: 110,
    multiple_count: 10
  },
  {
    bank_code: 'ai_trainer_3',
    bank_name: '人工智能训练师三级',
    bank_description: '人工智能训练师（三级）理论知识考试题库',
    bank_desc_detail: '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。',
    description: '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。',
    table_name: 'bank_ai_trainer_3',
    enabled: true,
    sort_order: 3,
    icon: '🤖',
    total_questions: 900,
    judgment_count: 300,
    single_count: 300,
    multiple_count: 300
  },
  {
    bank_code: 'ai_trainer_3',
    bank_name: '人工智能训练师三级',
    bank_description: '人工智能训练师（三级）理论知识考试题库',
    bank_desc_detail: '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。',
    description: '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。',
    table_name: 'bank_ai_trainer_3',
    enabled: true,
    sort_order: 2,
    icon: '🤖',
    total_questions: 900,
    judgment_count: 300,
    single_count: 300,
    multiple_count: 300
  },
  {
    bank_code: 'banking_medium',
    bank_name: '银行从业资格中级',
    bank_description: '银行从业资格中级考试题库',
    bank_desc_detail: '本题库包含银行从业资格中级考试相关题目，涵盖银行业法律法规、风险管理、个人理财等核心科目，帮助考生备考银行从业资格考试。',
    description: '本题库包含银行从业资格中级考试相关题目，涵盖银行业法律法规、风险管理、个人理财等核心科目，帮助考生备考银行从业资格考试。',
    table_name: 'bank_banking_medium',
    enabled: true,
    sort_order: 3,
    icon: '🏦',
    total_questions: 0,
    judgment_count: 0,
    single_count: 0,
    multiple_count: 0
  }
];

// 获取题库的默认统计数据
function getDefaultBankStats(bankCode) {
  const stats = {
    'security_admin_3': { total_questions: 190, judgment_count: 40, single_count: 140, multiple_count: 10 },
    'security_admin_4': { total_questions: 150, judgment_count: 30, single_count: 110, multiple_count: 10 },
    'ai_trainer_3': { total_questions: 900, judgment_count: 300, single_count: 300, multiple_count: 300 },
    'security_level3': { total_questions: 0, judgment_count: 0, single_count: 0, multiple_count: 0 },
    'banking_medium': { total_questions: 0, judgment_count: 0, single_count: 0, multiple_count: 0 }
  };
  return stats[bankCode] || { total_questions: 0, judgment_count: 0, single_count: 0, multiple_count: 0 };
}

// 补充缺失的字段
function completeBankFields(bank) {
  const defaultStats = getDefaultBankStats(bank.bank_code);
  return {
    ...bank,
    description: bank.description || bank.bank_desc_detail || '',
    total_questions: bank.total_questions || defaultStats.total_questions,
    judgment_count: bank.judgment_count || defaultStats.judgment_count,
    single_count: bank.single_count || defaultStats.single_count,
    multiple_count: bank.multiple_count || defaultStats.multiple_count
  };
}

// 获取所有题库配置
async function getAllBanks(connection) {
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM bank_config WHERE enabled = 1 ORDER BY sort_order ASC'
    );
    if (rows.length > 0) {
      return rows.map(bank => completeBankFields(bank));
    }
    return defaultBankConfigs;
  } catch (error) {
    console.warn('从数据库获取题库配置失败，使用默认配置:', error.message);
    return defaultBankConfigs;
  }
}

// 根据代码获取题库配置
async function getBankByCode(connection, bankCode) {
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM bank_config WHERE bank_code = ? AND enabled = 1',
      [bankCode]
    );
    if (rows.length > 0) {
      return completeBankFields(rows[0]);
    }
  } catch (error) {
    console.warn('从数据库获取题库配置失败:', error.message);
  }
  
  // 如果数据库查询失败或未找到，返回默认配置
  return defaultBankConfigs.find(bank => bank.bank_code === bankCode);
}

// 获取默认题库
function getDefaultBank() {
  return defaultBankConfigs.find(bank => bank.enabled) || defaultBankConfigs[0];
}

module.exports = {
  defaultBankConfigs,
  getAllBanks,
  getBankByCode,
  getDefaultBank
};