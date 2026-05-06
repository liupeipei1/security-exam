// Fisher-Yates洗牌算法
export function shuffleArray(arr) {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// 根据类型筛选题目并随机抽取指定数量
export function getRandomQuestionsByType(allQuestions, type, count) {
    const filtered = allQuestions.filter(q => q.type === type);
    const shuffled = shuffleArray(filtered);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 生成考试题目
export function generateExamQuestions(allQuestions, examConfig) {
    const config = examConfig || { judgment: 40, single: 140, multiple: 10 };
    
    const judgmentQuestions = getRandomQuestionsByType(allQuestions, 'judgment', config.judgment);
    const singleQuestions = getRandomQuestionsByType(allQuestions, 'single', config.single);
    const multipleQuestions = getRandomQuestionsByType(allQuestions, 'multiple', config.multiple);
    
    // 按顺序合并：判断题 -> 单选题 -> 多选题（不打乱顺序）
    return [...judgmentQuestions, ...singleQuestions, ...multipleQuestions];
}

// 获取题型中文标签
export function getQuestionTypeLabel(type) {
    const labels = {
        'single': '单选题',
        'multiple': '多选题',
        'judgment': '判断题'
    };
    return labels[type] || type;
}

// 获取选项标签（A, B, C...）
export function getOptionLabel(index) {
    return String.fromCharCode(65 + index);
}