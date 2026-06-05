-- 数据库表结构升级脚本：将所有题目表的type字段从ENUM改为VARCHAR(50)
-- 目的：支持动态题型，使type字段可以随question_types表变动而调整

-- 修改 ai_trainer_3 表
ALTER TABLE ai_trainer_3 MODIFY COLUMN type VARCHAR(50) NOT NULL;

-- 修改 bank_banking_law 表
ALTER TABLE bank_banking_law MODIFY COLUMN type VARCHAR(50) NOT NULL;

-- 修改 bank_personal_finance 表
ALTER TABLE bank_personal_finance MODIFY COLUMN type VARCHAR(50) NOT NULL;

-- 修改 security_exam_3 表
ALTER TABLE security_exam_3 MODIFY COLUMN type VARCHAR(50) NOT NULL;

-- 修改 Test_pp 表（如果存在且有type字段）
ALTER TABLE Test_pp MODIFY COLUMN type VARCHAR(50) NOT NULL;
