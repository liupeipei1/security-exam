-- 创建题型类型表
CREATE TABLE IF NOT EXISTS question_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(30) NOT NULL UNIQUE COMMENT '题型编码（唯一标识）',
    type_name VARCHAR(50) NOT NULL COMMENT '题型名称',
    type_description VARCHAR(200) COMMENT '题型描述',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_code (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题型类型表';

-- 初始化题型数据
INSERT INTO question_types (type_code, type_name, type_description, sort_order, enabled) VALUES
('single', '单选题', '从多个选项中选择一个正确答案', 1, 1),
('multiple', '多选题', '从多个选项中选择多个正确答案', 2, 1),
('judgment', '判断题', '判断题目描述是否正确（对/错）', 3, 1),
('essay', '解答文字题', '需要输入文字进行解答的题目', 4, 1),
('programming', '编程题', '需要编写代码完成的题目', 5, 1)
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), type_description = VALUES(type_description), sort_order = VALUES(sort_order), enabled = VALUES(enabled);