#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""将数据库中的答案同步到SQL文件"""

import pymysql
import re

def main():
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
        # 获取所有题目的答案
        cursor.execute("SELECT id, answer FROM bank_ai_trainer_3 ORDER BY id")
        answers = cursor.fetchall()
        print(f"从数据库读取了 {len(answers)} 条答案")
        
        # 读取SQL文件
        sql_path = r'D:\code\security-exam\backend\DML\ai_trainer_3.sql'
        with open(sql_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 按行分割
        lines = content.split('\n')
        new_lines = []
        answer_idx = 0
        
        for line in lines:
            # 查找 INSERT 语句
            if 'INSERT INTO bank_ai_trainer_3' in line:
                # 提取当前答案
                if answer_idx < len(answers):
                    q_id, answer = answers[answer_idx]
                    answer_idx += 1
                    
                    # 如果答案为空，保持原样
                    if answer and answer != '[]':
                        # 转义单引号
                        escaped_answer = answer.replace("'", "''")
                        # 替换空的 answer 字段
                        line = re.sub(r", ''\)", f", '{escaped_answer}')", line)
                        # 如果原来就有答案，也替换
                        line = re.sub(r", '[^']*'\)", f", '{escaped_answer}')", line)
            
            new_lines.append(line)
        
        # 写入更新后的SQL文件
        with open(sql_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        
        print(f"SQL文件已更新，共写入 {answer_idx} 条答案")
        
    except Exception as e:
        print(f"更新过程中发生错误: {e}")
    
    finally:
        cursor.close()
        conn.close()
        print("数据库连接已关闭")

if __name__ == '__main__':
    main()