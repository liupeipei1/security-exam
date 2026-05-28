CREATE TABLE IF NOT EXISTS security_exam_3 (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目表';
