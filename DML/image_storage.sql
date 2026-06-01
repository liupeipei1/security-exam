-- 创建图片存储表
CREATE TABLE IF NOT EXISTS image_storage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_type VARCHAR(100) COMMENT '文件类型（MIME类型）',
    file_size INT COMMENT '文件大小（字节）',
    file_data LONGBLOB NOT NULL COMMENT '图片二进制数据',
    storage_path VARCHAR(500) COMMENT '存储路径（可选）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图片存储表';