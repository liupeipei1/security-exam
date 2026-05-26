-- 创建题库配置表
CREATE TABLE IF NOT EXISTS bank_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bank_code VARCHAR(50) NOT NULL UNIQUE COMMENT '题库代码（唯一标识）',
  bank_name VARCHAR(100) NOT NULL COMMENT '题库名称',
  bank_description VARCHAR(500) COMMENT '题库描述',
  bank_desc_detail TEXT COMMENT '题库详细描述',
  description TEXT COMMENT '题库描述（前端显示用）',
  icon VARCHAR(20) DEFAULT '📚' COMMENT '题库图标',
  table_name VARCHAR(100) NOT NULL COMMENT '对应的数据表名',
  total_questions INT DEFAULT 0 COMMENT '总题数',
  judgment_count INT DEFAULT 0 COMMENT '判断题数量',
  single_count INT DEFAULT 0 COMMENT '单选题数量',
  multiple_count INT DEFAULT 0 COMMENT '多选题数量',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bank_code (bank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题库配置表';

-- 为现有的网络安全三级题库创建配置记录
INSERT INTO bank_config (bank_code, bank_name, bank_description, bank_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) 
VALUES ('security_level3', '网络与信息安全管理员三级', '网络与信息安全管理员（三级）理论知识考试题库', '本题库包含网络与信息安全管理员职业技能等级认定三级考试的理论知识复习题，涵盖网络安全基础、信息安全管理、安全技术应用等核心知识点，帮助考生系统复习备考。', '本题库包含网络与信息安全管理员职业技能等级认定三级考试的理论知识复习题，涵盖网络安全基础、信息安全管理、安全技术应用等核心知识点，帮助考生系统复习备考。', '🔒', 'security_exam_3', 0, 0, 0, 0, 1, 1);

-- 创建银行从业资格中级题库表
CREATE TABLE IF NOT EXISTS bank_banking_medium (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('judgment', 'single', 'multiple') NOT NULL COMMENT '题型',
  question TEXT NOT NULL COMMENT '题目内容',
  options JSON NOT NULL COMMENT '选项列表',
  answer JSON NOT NULL COMMENT '正确答案',
  explanation VARCHAR(500) COMMENT '解析说明',
  analysis VARCHAR(1000) COMMENT '题目分析',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='银行从业资格中级题库';

-- 为银行从业资格中级题库创建配置记录
INSERT INTO bank_config (bank_code, bank_name, bank_description, bank_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) 
VALUES ('banking_medium', '银行从业资格中级', '银行从业资格中级考试题库', '本题库包含银行从业资格中级考试相关题目，涵盖银行业法律法规、风险管理、个人理财等核心科目，帮助考生备考银行从业资格考试。', '本题库包含银行从业资格中级考试相关题目，涵盖银行业法律法规、风险管理、个人理财等核心科目，帮助考生备考银行从业资格考试。', '🏦', 'bank_banking_medium', 0, 0, 0, 0, 1, 3);

-- 为人工智能训练师三级题库创建配置记录
INSERT INTO bank_config (bank_code, bank_name, bank_description, bank_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) 
VALUES ('ai_trainer_3', '人工智能训练师三级', '人工智能训练师（三级）理论知识考试题库', '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。', '本题库包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断题300道、单选题300道、多选题300道）。', '🤖', 'bank_ai_trainer_3', 900, 300, 300, 300, 1, 2);

-- 个人理财押题题库表（数据由 import_banking_pdf_banks.py 导入）
CREATE TABLE IF NOT EXISTS bank_personal_finance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('single', 'multiple', 'judgment') NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  answer VARCHAR(100) NOT NULL,
  analysis TEXT,
  bank_code VARCHAR(50) DEFAULT 'personal_finance',
  source_set TINYINT DEFAULT 0 COMMENT '来源套卷编号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_bank_code (bank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='银行从业-个人理财押题';

INSERT INTO bank_config (bank_code, bank_name, bank_description, bank_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order)
VALUES ('personal_finance', '银行从业-个人理财（中级押题）', '2025年10月中级银行从业个人理财科目押题卷', '2025年10月中级银行从业资格考试个人理财科目押题卷（5套），含单选、多选及案例分析题。', '2025年10月中级银行从业资格考试个人理财科目押题卷（5套），含单选、多选及案例分析题。', '💰', 'bank_personal_finance', 0, 0, 0, 0, 1, 4)
ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), table_name = VALUES(table_name);

-- 法律法规押题题库表
CREATE TABLE IF NOT EXISTS bank_banking_law (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('single', 'multiple', 'judgment') NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  answer VARCHAR(100) NOT NULL,
  analysis TEXT,
  bank_code VARCHAR(50) DEFAULT 'banking_law',
  source_set TINYINT DEFAULT 0 COMMENT '来源套卷编号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_bank_code (bank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='银行从业-法律法规押题';

INSERT INTO bank_config (bank_code, bank_name, bank_description, bank_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order)
VALUES ('banking_law', '银行从业-法律法规（中级押题）', '2025年10月中级银行从业法律法规科目押题卷', '2025年10月中级银行从业资格考试银行业法律法规科目押题卷（5套），含单选、多选及案例分析题。', '2025年10月中级银行从业资格考试银行业法律法规科目押题卷（5套），含单选、多选及案例分析题。', '⚖️', 'bank_banking_law', 0, 0, 0, 0, 1, 5)
ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), table_name = VALUES(table_name);

-- 修改原有题目表，添加题库ID字段（可选，用于追溯）
ALTER TABLE security_exam_3 ADD COLUMN bank_code VARCHAR(50) DEFAULT 'security_level3' COMMENT '所属题库代码';
ALTER TABLE security_exam_3 ADD INDEX idx_bank_code (bank_code);