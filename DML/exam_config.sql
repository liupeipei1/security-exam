-- 创建考试配置�?CREATE TABLE IF NOT EXISTS exam_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_code VARCHAR(50) NOT NULL UNIQUE COMMENT '考试代码（唯一标识�?,
  exam_name VARCHAR(100) NOT NULL COMMENT '考试名称',
  exam_description VARCHAR(500) COMMENT '考试描述',
  exam_desc_detail TEXT COMMENT '考试详细描述',
  description TEXT COMMENT '考试描述（前端显示用�?,
  icon VARCHAR(20) DEFAULT '📚' COMMENT '考试图标',
  table_name VARCHAR(100) NOT NULL COMMENT '对应的数据表�?,
  total_questions INT DEFAULT 0 COMMENT '总题�?,
  judgment_count INT DEFAULT 0 COMMENT '判断题数�?,
  single_count INT DEFAULT 0 COMMENT '单选题数量',
  multiple_count INT DEFAULT 0 COMMENT '多选题数量',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_exam_code (exam_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试配置�?;

-- 为现有的网络安全三级考试创建配置记录
INSERT INTO exam_config (exam_code, exam_name, exam_description, exam_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) 
VALUES ('security_exam_3', '网络与信息安全管理员三级', '网络与信息安全管理员（三级）理论知识考试', '本考试包含网络与信息安全管理员职业技能等级认定三级考试的理论知识复习题，涵盖网络安全基础、信息安全管理、安全技术应用等核心知识点，帮助考生系统复习备考�?, '本考试包含网络与信息安全管理员职业技能等级认定三级考试的理论知识复习题，涵盖网络安全基础、信息安全管理、安全技术应用等核心知识点，帮助考生系统复习备考�?, '🔒', 'security_exam_3', 0, 0, 0, 0, 1, 1);

-- 为人工智能训练师三级考试创建配置记录
INSERT INTO exam_config (exam_code, exam_name, exam_description, exam_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order) 
VALUES ('ai_trainer_3', '人工智能训练师三�?, '人工智能训练师（三级）理论知识考试', '本考试包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断�?00道、单选题300道、多选题300道）�?, '本考试包含人工智能训练师职业技能等级认定三级考试的理论知识复习题，涵盖人工智能基础、数据标注、模型训练、职业道德等核心知识点，共计900道题目（判断�?00道、单选题300道、多选题300道）�?, '🤖', 'bank_ai_trainer_3', 900, 300, 300, 300, 1, 2);


INSERT INTO exam_config (exam_code, exam_name, exam_description, exam_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order)
VALUES ('personal_finance', '银行从业-个人理财（中级押题）', '2025�?0月中级银行从业个人理财科目押题卷', '2025�?0月中级银行从业资格考试个人理财科目押题卷（5套），含单选、多选及案例分析题�?, '2025�?0月中级银行从业资格考试个人理财科目押题卷（5套），含单选、多选及案例分析题�?, '💰', 'bank_personal_finance', 0, 0, 0, 0, 1, 4)
ON DUPLICATE KEY UPDATE exam_name = VALUES(exam_name), table_name = VALUES(table_name);


INSERT INTO exam_config (exam_code, exam_name, exam_description, exam_desc_detail, description, icon, table_name, total_questions, judgment_count, single_count, multiple_count, enabled, sort_order)
VALUES ('banking_law', '银行从业-法律法规（中级押题）', '2025�?0月中级银行从业法律法规科目押题卷', '2025�?0月中级银行从业资格考试银行业法律法规科目押题卷�?套），含单选、多选及案例分析题�?, '2025�?0月中级银行从业资格考试银行业法律法规科目押题卷�?套），含单选、多选及案例分析题�?, '⚖️', 'bank_banking_law', 0, 0, 0, 0, 1, 5)
ON DUPLICATE KEY UPDATE exam_name = VALUES(exam_name), table_name = VALUES(table_name);
