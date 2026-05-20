#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将答案文档中的答案更新到数据库
答案文档中的题号需要映射到正确的数据库ID：
- 判断题：文档题号 1-300 → 数据库ID 1-300
- 单选题：文档题号 1-300 → 数据库ID 301-600
- 多选题：文档题号 1-300 → 数据库ID 601-900

支持的答案格式：
- 单行单个答案：1.对、2.A、3.ABCD
- 单行多个答案：1.A 2.B 3.C 4.ABCD
"""

import os
import re
from docx import Document
import pymysql
import json

def parse_answers(docx_path):
    """解析DOCX文档，提取答案信息"""
    doc = Document(docx_path)
    
    answers = {}
    current_type = None
    current_start_num = 1  # 当前类型的起始题号
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        if not text:
            continue
        
        # 检测题目类型切换
        if '判断题' in text:
            current_type = 'judge'
            current_start_num = 1
            continue
        elif '单选题' in text:
            current_type = 'single'
            current_start_num = 1
            continue
        elif '多选题' in text:
            current_type = 'multiple'
            current_start_num = 1
            continue
        
        # 如果还没有进入答案区域，跳过
        if current_type is None:
            continue
        
        # 匹配答案格式：支持单行多个答案（如 1.A 2.B 3.ABCD）
        # 正则表达式匹配：数字.答案格式，支持多个连续
        matches = re.findall(r'(\d+)\.(\S+)', text)
        for match in matches:
            question_num_in_doc = int(match[0])  # 文档中的题号
            answer = match[1].strip()
            
            # 标准化答案格式
            if current_type == 'judge':
                # 判断题答案统一为 "对" 或 "错"
                if answer in ['对', '正确', '√', '是', 'T', 'TRUE']:
                    answer = '对'
                elif answer in ['错', '错误', '×', '否', 'F', 'FALSE']:
                    answer = '错'
            else:
                # 单选/多选题答案转为大写
                answer = answer.upper()
            
            answers[(current_type, question_num_in_doc)] = {
                'type': current_type,
                'doc_num': question_num_in_doc,
                'answer': answer
            }
    
    return answers

def get_db_id(type_name, doc_num):
    """根据题目类型和文档题号获取数据库ID"""
    if type_name == 'judge' or type_name == 'judgment':
        return doc_num  # 判断题：1-300
    elif type_name == 'single':
        return 300 + doc_num  # 单选题：301-600
    elif type_name == 'multiple':
        return 600 + doc_num  # 多选题：601-900
    return None

def main():
    docx_path = r'D:\code\security-exam\文档题库\人工智能训练师_3级理论答案.docx'
    
    # 解析答案
    print("开始解析答案DOCX文档...")
    answers = parse_answers(docx_path)
    print(f"解析完成，共提取 {len(answers)} 道题的答案")
    
    # 统计各类型
    judge_count = sum(1 for (t, _) in answers.keys() if t == 'judge')
    single_count = sum(1 for (t, _) in answers.keys() if t == 'single')
    multiple_count = sum(1 for (t, _) in answers.keys() if t == 'multiple')
    print(f"  - 判断题答案：{judge_count} 道")
    print(f"  - 单选题答案：{single_count} 道")
    print(f"  - 多选题答案：{multiple_count} 道")
    
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
        update_count = 0
        
        for (type_name, doc_num), data in sorted(answers.items(), key=lambda x: get_db_id(x[0][0], x[0][1])):
            db_id = get_db_id(type_name, doc_num)
            answer = data['answer']
            
            # 构建答案JSON
            if type_name == 'judge':
                answer_json = json.dumps([answer], ensure_ascii=False)
            else:
                letters = list(answer)
                answer_json = json.dumps(letters, ensure_ascii=False)
            
            # 更新答案
            cursor.execute(
                "UPDATE bank_ai_trainer_3 SET answer = %s WHERE id = %s",
                (answer_json, db_id)
            )
            update_count += 1
            # 每50条输出一次进度
            if update_count % 50 == 0:
                print(f"已更新 {update_count} 条记录...")
        
        conn.commit()
        print(f"\n更新完成！共更新 {update_count} 条记录")
        
    except Exception as e:
        print(f"更新过程中发生错误: {e}")
        conn.rollback()
    
    finally:
        cursor.close()
        conn.close()
        print("数据库连接已关闭")

if __name__ == '__main__':
    main()