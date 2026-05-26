import pymysql

def main():
    # 连接数据库
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        database='exam-db',
        charset='utf8mb4'
    )
    
    try:
        cursor = conn.cursor()
        
        # 查找所有以选项字母开头的数据（如 A.、B.、C.、D.、E.）
        sql = """
            SELECT * FROM bank_banking_law 
            WHERE question LIKE 'A.%' OR question LIKE 'B.%' OR question LIKE 'C.%' 
               OR question LIKE 'D.%' OR question LIKE 'E.%'
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        print(f'找到 {len(rows)} 条类似选项格式的数据：')
        for row in rows[:20]:
            print(f'{row[0]}. {row[2][:60]}')
        if len(rows) > 20:
            print(f'... 还有 {len(rows) - 20} 条更多数据')
        
        # 删除这些错误数据
        if rows:
            delete_sql = """
                DELETE FROM bank_banking_law 
                WHERE question LIKE 'A.%' OR question LIKE 'B.%' OR question LIKE 'C.%' 
                   OR question LIKE 'D.%' OR question LIKE 'E.%'
            """
            cursor.execute(delete_sql)
            conn.commit()
            print(f'\n已成功删除 {cursor.rowcount} 条错误数据')
        else:
            print('没有需要删除的数据')
            
    finally:
        conn.close()

if __name__ == '__main__':
    main()