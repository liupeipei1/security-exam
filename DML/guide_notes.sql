-- 创建考试指南备注表（用户备考备注）
CREATE TABLE IF NOT EXISTS guide_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(100) NOT NULL COMMENT '用户openid',
    exam_code VARCHAR(50) NOT NULL COMMENT '考试编码',
    content TEXT COMMENT '备注内容（支持HTML格式，可包含图片标签）',
    images JSON COMMENT '关联的图片ID列表',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_exam (openid, exam_code),
    KEY idx_openid (openid),
    KEY idx_exam_code (exam_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试指南用户备注表';