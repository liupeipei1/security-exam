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
    # 查询表结构
    cursor.execute("DESCRIBE bank_ai_trainer_3")
    print("表结构:")
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]}")
    
    print("\n前3条数据:")
    cursor.execute("SELECT * FROM bank_ai_trainer_3 LIMIT 3")
    columns = [desc[0] for desc in cursor.description]
    for row in cursor.fetchall():
        print(dict(zip(columns, row)))
        print("-" * 50)
        
finally:
    db.close()