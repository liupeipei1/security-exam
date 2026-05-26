import pymysql
import os

def parse_law_questions(file_path):
    """解析法律法规题库文件"""
    questions = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        try:
            with open(file_path, 'r', encoding='gbk') as f:
                content = f.read()
        except:
            print(f"  文件编码读取失败: {file_path}")
            return questions
    
    lines = content.split('\n')
    current_question = None
    current_options = []
    current_answer = None
    current_analysis = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 检测题号格式（绗?X 棰? 或 第 X 题）
        if '棰?' in line or ('第' in line and '题' in line):
            # 保存上一题
            if current_question and current_options:
                questions.append({
                    'question': current_question,
                    'options': '\n'.join(current_options),
                    'answer': current_answer or '',
                    'analysis': current_analysis or ''
                })
            
            # 开始新题
            current_question = ''
            current_options = []
            current_answer = None
            current_analysis = None
            # 提取题号后的题目内容
            if '棰?' in line:
                parts = line.split('棰?')
                if len(parts) > 1:
                    current_question = parts[1].strip()
            elif '题' in line:
                idx = line.find('题')
                current_question = line[idx+1:].strip()
        elif line.startswith(('A.', 'B.', 'C.', 'D.', 'E.', 'A、', 'B、', 'C、', 'D、', 'E、')):
            # 选项
            option_text = line[2:].strip() if line[1] in '.、' else line[1:].strip()
            current_options.append(line)
        elif '绛旀' in line or '答案' in line:
            # 答案
            if '姝ｇ‘绛旀' in line:
                current_answer = line.replace('姝ｇ‘绛旀', '').replace(':', '').replace('：', '').replace('锛欰', '').replace('锛?', '').strip()
            elif '正确答案' in line:
                idx = line.find('正确答案') + 4
                current_answer = line[idx:].replace(':', '').replace('：', '').strip()
            else:
                current_answer = line.replace('答案', '').replace(':', '').replace('：', '').strip()
        elif '瑙ｆ瀽' in line or '解析' in line:
            # 解析
            if '鍚嶅笀瑙ｆ瀽' in line:
                idx = line.find('鍚嶅笀瑙ｆ瀽') + 5
                current_analysis = line[idx:].replace(':', '').replace('：', '').strip()
            elif '名师解析' in line:
                idx = line.find('名师解析') + 4
                current_analysis = line[idx:].replace(':', '').replace('：', '').strip()
            elif '解析' in line:
                idx = line.find('解析') + 2
                current_analysis = line[idx:].replace(':', '').replace('：', '').strip()
        elif current_question and not current_answer:
            # 题目内容可能跨多行
            current_question += ' ' + line
    
    # 保存最后一题
    if current_question and current_options:
        questions.append({
            'question': current_question,
            'options': '\n'.join(current_options),
            'answer': current_answer or '',
            'analysis': current_analysis or ''
        })
    
    return questions

def main():
    # 数据库连接
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        database='exam-db',
        charset='utf8mb4'
    )
    
    try:
        cursor = conn.cursor()
        
        # 清空表
        print("正在清空 bank_banking_law 表...")
        cursor.execute("DELETE FROM bank_banking_law")
        conn.commit()
        print("表已清空")
        
        # 题库目录
        law_dir = r"d:\code\security-exam\文档题库\法律法规\题库"
        total_inserted = 0
        
        # 处理每个文件
        for file_num in range(1, 6):
            file_path = os.path.join(law_dir, str(file_num))
            
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
            
            if not questions:
                print(f"  文件 {file_num} 未解析出任何题目")
                continue
            
            # 插入数据
            inserted = 0
            for q in questions:
                # 跳过题目内容过短的（可能是选项误识别）
                if len(q['question']) < 10:
                    continue
                    
                try:
                    sql = """
                        INSERT INTO bank_banking_law (type, question, options, answer, analysis, source_set)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql, (
                        '法律法规',
                        q['question'][:1000],
                        q['options'][:1000],
                        q['answer'][:100],
                        q['analysis'][:2000],
                        '法律法规题库'
                    ))
                    inserted += 1
                    
                    if inserted % 20 == 0:
                        print(f'    已插入 {inserted} 道题目...')
                except Exception as e:
                    # 可能是重复数据，跳过
                    pass
            
            conn.commit()
            total_inserted += inserted
            print(f"  文件 {file_num} 处理完成：插入 {inserted} 道")
        
        print(f"\n===== 全部处理完成 =====")
        print(f"总计插入：{total_inserted} 道题目")
        
    finally:
        conn.close()
        print("数据库连接已关闭")

if __name__ == '__main__':
    main()