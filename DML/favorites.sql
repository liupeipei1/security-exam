if not exists favorites;

CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(100) NOT NULL,
        exam_code VARCHAR(50) NOT NULL,
        question_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_favorite (openid, exam_code, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;