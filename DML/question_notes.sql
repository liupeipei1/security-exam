-- 创建题目备注表（用户做题时添加的备注）
CREATE TABLE IF NOT EXISTS question_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(100) NOT NULL COMMENT '用户openid',
    exam_code VARCHAR(50) NOT NULL COMMENT '考试编码',
    question_id INT NOT NULL COMMENT '题目ID',
    note LONGTEXT COMMENT '备注内容（支持HTML格式，可包含图片标签）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_question (openid, exam_code, question_id),
    KEY idx_openid (openid),
    KEY idx_exam_code (exam_code),
    KEY idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目用户备注表';