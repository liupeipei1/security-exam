import pymysql

# 连接数据库
db = pymysql.connect(
    host='localhost',
    user='root',
    password='123456',
    database='exam-db',
    port=3306,
    charset='utf8mb4'
)

try:
    cursor = db.cursor()
    # 查询前5条判断题数据
    cursor.execute("SELECT id, question_type, question_content, options, correct_answer FROM bank_ai_trainer_3 WHERE question_type = 'judgment' LIMIT 5")
    results = cursor.fetchall()
    
    for row in results:
        print(f"ID: {row[0]}")
        print(f"类型: {row[1]}")
        print(f"题目: {row[2]}")
        print(f"选项: {row[3]}")
        print(f"答案: {row[4]}")
        print("-" * 50)
        
finally:
    db.close()