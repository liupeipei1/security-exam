import json
import pymysql

# 读取JSON文件
with open(r'd:\code\security-exam\questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

print(f"共读取到 {len(questions)} 条题目")

# 连接数据库
conn = pymysql.connect(
    host='localhost',
    user='root',
    password='123456',
    database='exam-db',
    charset='utf8mb4'
)
cursor = conn.cursor()

try:
    # 创建表结构（如果不存在）
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS security_exam_3 (
        id INT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        answer JSON NOT NULL,
        explanation TEXT,
        analysis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    cursor.execute(create_table_sql)
    print("表结构检查/创建完成")
    
    # 统计变量
    inserted_count = 0
    updated_count = 0
    
    # 批量插入/更新
    for q in questions:
        sql = """
        INSERT INTO security_exam_3 (id, type, question, options, answer, explanation, analysis)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            type = VALUES(type),
            question = VALUES(question),
            options = VALUES(options),
            answer = VALUES(answer),
            explanation = VALUES(explanation),
            analysis = VALUES(analysis)
        """
        cursor.execute(sql, (
            q['id'],
            q['type'],
            q['question'],
            json.dumps(q['options']),
            json.dumps(q['answer']),
            q.get('explanation', ''),
            q.get('analysis', '')
        ))
        
        # 判断是插入还是更新
        if cursor.lastrowid > 0:
            inserted_count += 1
        else:
            updated_count += 1
    
    conn.commit()
    print(f"\n数据迁移完成！")
    print(f"新增记录: {inserted_count} 条")
    print(f"更新记录: {updated_count} 条")
    
finally:
    cursor.close()
    conn.close()
    print("\n数据库连接已关闭")