#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析法律法规题库文本文件，将题目导入数据库
支持多种格式：
格式1（文件1）：
- 题号格式：第 X 题
- 选项格式：A. xxx, B. xxx, C. xxx, D. xxx
- 答案格式：答案：X 或 绛旀锛?X
- 解析格式：解析：xxx 或 瑙ｆ瀽锛?xxx

格式2（文件2、3）：
- 没有题号，直接开始题目
- 选项格式：A. xxx, B. xxx, C. xxx, D. xxx
- 答案格式：答案：X
- 解析格式：名师解析：xxx
"""

import os
import re
import pymysql
import json

def parse_law_questions(file_path):
    """解析法律法规题库文本文件（支持多种格式）"""
    questions = []
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    current_question = None
    question_num = 0
    has_numbered_format = False  # 是否有"第X题"格式
    
    # 先扫描文件判断格式
    for line in lines[:20]:
        if re.match(r'第\s*\d+\s*题', line):
            has_numbered_format = True
            break
    
    for line in lines:
        line = line.strip()
        
        if not line:
            continue
        
        # 格式1：检测题号格式：第 X 题
        if has_numbered_format:
            num_match = re.match(r'第\s*(\d+)\s*题', line)
            if num_match:
                # 保存上一个题目
                if current_question and len(current_question['options']) >= 4:
                    questions.append(current_question)
                
                question_num = int(num_match.group(1))
                current_question = {
                    'num': question_num,
                    'question': '',
                    'options': {},
                    'answer': None,
                    'analysis': ''
                }
                continue
            
            # 如果还没有开始解析题目，跳过
            if current_question is None:
                continue
        else:
            # 格式2：没有题号，遇到选项时开始新题目
            option_match = re.match(r'^([A-D])\.\s*(.*)', line)
            if option_match and current_question is None:
                # 创建新题目
                question_num += 1
                current_question = {
                    'num': question_num,
                    'question': '',
                    'options': {},
                    'answer': None,
                    'analysis': ''
                }
        
        if current_question is None:
            continue
        
        # 检测选项格式：A. xxx
        option_match = re.match(r'^([A-D])\.\s*(.*)', line)
        if option_match:
            opt_key = option_match.group(1)
            opt_value = option_match.group(2).strip()
            current_question['options'][opt_key] = opt_value
            continue
        
        # 检测答案格式：答案：X 或 绛旀锛?X
        answer_match = re.search(r'(答案：|绛旀锛?)([A-D])', line)
        if answer_match:
            current_question['answer'] = answer_match.group(2)
            # 检查是否有解析在同一行
            analysis_part = re.sub(r'(答案：|绛旀锛?)[A-D]\s*', '', line).strip()
            if analysis_part:
                current_question['analysis'] = analysis_part
            continue
        
        # 检测解析格式：解析：xxx 或 瑙ｆ瀽锛?xxx 或 名师解析：xxx
        analysis_match = re.match(r'(解析：|瑙ｆ瀽锛?|名师解析：)(.*)', line)
        if analysis_match:
            current_question['analysis'] = analysis_match.group(2).strip()
            # 格式2：解析结束后保存题目
            if not has_numbered_format:
                if len(current_question['options']) >= 4:
                    questions.append(current_question)
                current_question = None
            continue
        
        # 如果当前有未完成的题目，且不是选项/答案/解析，则追加到题目内容
        if not current_question['answer']:
            if current_question['question']:
                current_question['question'] += ' ' + line
            else:
                current_question['question'] = line
    
    # 保存最后一个题目
    if current_question and len(current_question['options']) >= 4:
        questions.append(current_question)
    
    return questions

def check_question_exists(cursor, question_text):
    """检查题目是否已存在于数据库"""
    cursor.execute(
        "SELECT COUNT(*) FROM bank_banking_law WHERE question LIKE %s",
        (question_text[:200] + '%',)
    )
    result = cursor.fetchone()
    return result[0] > 0

def insert_question(cursor, question, source_set):
    """插入新题目到数据库"""
    question_text = question['question'][:1000]
    options = json.dumps(question['options'], ensure_ascii=False)
    answer = json.dumps([question['answer']], ensure_ascii=False) if question['answer'] else json.dumps([])
    analysis = question['analysis'][:2000]
    
    cursor.execute(
        """INSERT INTO bank_banking_law (type, question, options, answer, analysis, source_set)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        ('single', question_text, options, answer, analysis, source_set)
    )
    return cursor.lastrowid

def main():
    # 题库文件目录
    base_dir = r'D:\code\security-exam\文档题库\法律法规\ttt'
    files = ['1', '2', '3', '4', '5']
    
    # 连接数据库
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        database='exam-db',
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    
    total_inserted = 0
    total_skipped = 0
    
    try:
        for file_num in files:
            file_path = os.path.join(base_dir, file_num)
            
            if not os.path.exists(file_path):
                print(f"文件不存在: {file_path}")
                continue
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                print(f"文件为空: {file_path}")
                continue
            
            print(f"\n正在处理文件: {file_num}")
            questions = parse_law_questions(file_path)
            print(f"  解析出 {len(questions)} 道题目")
            
            inserted = 0
            skipped = 0
            
            for q in questions:
                if check_question_exists(cursor, q['question']):
                    skipped += 1
                    continue
                
                insert_question(cursor, q, int(file_num))
                inserted += 1
                
                if inserted % 20 == 0:
                    print(f"    已插入 {inserted} 道题目...")
            
            conn.commit()
            print(f"  文件 {file_num} 处理完成：插入 {inserted} 道，跳过 {skipped} 道")
            total_inserted += inserted
            total_skipped += skipped
        
        print(f"\n===== 全部处理完成 =====")
        print(f"总计插入：{total_inserted} 道题目")
        print(f"总计跳过（已存在）：{total_skipped} 道题目")
        
    except Exception as e:
        print(f"\n处理过程中发生错误: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    
    finally:
        cursor.close()
        conn.close()
        print("\n数据库连接已关闭")

if __name__ == '__main__':
    main()