const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'exam-db',
  charset: 'utf8mb4'
};

async function updateBankConfigTable() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 添加新字段（忽略已存在错误）
    try {
      await connection.execute('ALTER TABLE bank_config ADD COLUMN bank_desc_detail TEXT COMMENT "题库详细描述"');
      console.log('已添加bank_desc_detail字段');
    } catch (e) {
      console.log('bank_desc_detail字段已存在，跳过');
    }
    
    try {
      await connection.execute('ALTER TABLE bank_config ADD COLUMN icon VARCHAR(20) DEFAULT "📚" COMMENT "题库图标"');
      console.log('已添加icon字段');
    } catch (e) {
      console.log('icon字段已存在，跳过');
    }
    
    // 更新现有记录
    await connection.execute(
      'UPDATE bank_config SET bank_name = ?, bank_description = ?, bank_desc_detail = ?, icon = ? WHERE bank_code = ?',
      ['网络与信息安全管理员三级', '网络与信息安全管理员（三级）理论知识考试题库', '本题库包含网络与信息安全管理员职业技能等级认定三级考试的理论知识复习题，涵盖网络安全基础、信息安全管理、安全技术应用等核心知识点，帮助考生系统复习备考。', '🔒', 'security_level3']
    );
    console.log('已更新网络安全三级题库配置');
    
    await connection.execute(
      'UPDATE bank_config SET bank_name = ?, bank_description = ?, bank_desc_detail = ?, icon = ?, sort_order = ? WHERE bank_code = ?',
      ['人工智能训练师三级', '人工智能训练师（三级）理论知识考试题库', '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。', '🤖', 2, 'ai_trainer_3']
    );
    console.log('已更新人工智能训练师题库配置');
    
    await connection.execute(
      'UPDATE bank_config SET bank_name = ?, bank_description = ?, bank_desc_detail = ?, icon = ?, sort_order = ? WHERE bank_code = ?',
      ['银行从业资格中级', '银行从业资格中级考试题库', '本题库包含银行从业资格中级考试相关题目，涵盖银行业法律法规、风险管理、个人理财等核心科目，帮助考生备考银行从业资格考试。', '🏦', 3, 'banking_medium']
    );
    console.log('已更新银行从业资格题库配置');
    
    console.log('所有题库配置已更新完成');
    
  } catch (error) {
    console.error('更新题库配置失败:', error);
  } finally {
    await connection.end();
  }
}

updateBankConfigTable();