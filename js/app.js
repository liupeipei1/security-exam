// 考试模式题目数量配置
const EXAM_CONFIG = {
    judgment: 40,   // 判断题数
    single: 140,    // 单选题数量
    multiple: 10    // 多选题数量
};

// Fisher-Yates洗牌算法
function shuffleArray(arr) {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// 根据类型筛选题目并随机抽取指定数量
function getRandomQuestionsByType(allQuestions, type, count) {
    const filtered = allQuestions.filter(q => q.type === type);
    const shuffled = shuffleArray(filtered);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 生成考试题目
function generateExamQuestions(allQuestions) {
    const config = typeof EXAM_CONFIG !== 'undefined' ? EXAM_CONFIG : { judgment: 40, single: 140, multiple: 10 };
    
    const judgmentQuestions = getRandomQuestionsByType(allQuestions, 'judgment', config.judgment);
    const singleQuestions = getRandomQuestionsByType(allQuestions, 'single', config.single);
    const multipleQuestions = getRandomQuestionsByType(allQuestions, 'multiple', config.multiple);
    
    const allExamQuestions = [...judgmentQuestions, ...singleQuestions, ...multipleQuestions];
    return allExamQuestions;
}

const chapters = [
    { name: "全部题目", count: 0 }
];

// 初始化Vue应用
function initApp() {
    const app = Vue.createApp({
        data() {
            return {
                currentView: 'home',
                currentMode: 'practice',
                currentChapterIndex: 0,
                currentQuestionIndex: 0,
                selectedOptions: [],
                showAnswer: false,
                showResult: false,
                answeredCount: 0,
                correctCount: 0,
                allQuestions: [],
                currentQuestions: [],
                currentQuestionType: 'all',
                loading: true,
                chapters: [{ name: "全部题目", count: 0 }],
                examConfig: typeof EXAM_CONFIG !== 'undefined' ? EXAM_CONFIG : { judgment: 40, single: 140, multiple: 10 },
                // 备注相关数据
                currentNote: '',
                notes: {} // 存储各题目的备注，key为question_id
            };
        },
        computed: {
            currentQuestion() {
                return this.currentQuestions[this.currentQuestionIndex] || {};
            },
            accuracyRate() {
                if (this.answeredCount === 0) return 0;
                return Math.round((this.correctCount / this.answeredCount) * 100);
            },
            progressPercent() {
                if (this.currentQuestions.length === 0) return 0;
                return Math.round(((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100);
            },
            judgmentCount() {
                return this.allQuestions.filter(q => q.type === 'judgment').length;
            },
            singleCount() {
                return this.allQuestions.filter(q => q.type === 'single').length;
            },
            multipleCount() {
                return this.allQuestions.filter(q => q.type === 'multiple').length;
            }
        },
        mounted() {
            this.loadQuestions();
        },
        methods: {
            loadQuestions() {
                this.loading = true;
                // 从后端API读取题目数据
                fetch('http://localhost:3001/api/questions')
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('网络响应异常');
                        }
                    })
                    .then(data => {
                        // 将数据库字段映射到前端需要的字段（兼容两种字段命名格式）
                        this.allQuestions = data.map(item => ({
                            id: item.id,
                            type: item.type || item.question_type,
                            question: item.question || item.question_content,
                            options: item.options ? JSON.parse(item.options) : [],
                            answer: item.answer ? JSON.parse(item.answer) : (item.correct_answer ? JSON.parse(item.correct_answer) : []),
                            analysis: item.analysis || ''
                        }));
                        console.log('题目数据加载成功，共', this.allQuestions.length, '题');
                    })
                    .catch(error => {
                        console.error('加载题目数据失败:', error);
                        alert('后端服务异常，请检查后端服务是否启动');
                        this.allQuestions = [];
                    })
                    .finally(() => {
                        this.chapters = [{ name: "全部题目", count: this.allQuestions.length }];
                        this.switchMode('practice');
                        this.loading = false;
                    });
            },
            getQuestionTypeLabel(type) {
                const labels = {
                    'single': '单选题',
                    'multiple': '多选题',
                    'judgment': '判断题'
                };
                return labels[type] || type;
            },
            getOptionLabel(index) {
                return String.fromCharCode(65 + index);
            },
            getOptionClass(index) {
                if (!this.showAnswer) {
                    return this.selectedOptions.includes(index) ? 'selected' : '';
                }
                const optionText = this.currentQuestion.options[index];
                const optionLabel = this.getOptionLabel(index);
                const answer = this.currentQuestion.answer || [];
                
                // 检查答案是否匹配：支持字母格式和文本内容格式
                let isCorrect = answer.includes(optionText) || answer.includes(optionLabel);
                
                // 特殊处理判断题：选项可能是"正确"/"错误"，答案可能是"对"/"错"或"A"/"B"
                if (this.currentQuestion.type === 'judgment') {
                    // 如果选项是"正确"或"对"，且答案包含"A"或"对"或"正确"，则正确
                    if ((optionText.includes('正确') || optionText.includes('对')) && 
                        (answer.includes('A') || answer.includes('对') || answer.includes('正确'))) {
                        isCorrect = true;
                    }
                    // 如果选项是"错误"或"错"，且答案包含"B"或"错"或"错误"，则正确
                    if ((optionText.includes('错误') || optionText.includes('错')) && 
                        (answer.includes('B') || answer.includes('错') || answer.includes('错误'))) {
                        isCorrect = true;
                    }
                }
                
                if (isCorrect) {
                    return 'correct';
                }
                if (this.selectedOptions.includes(index)) {
                    return 'incorrect';
                }
                return '';
            },
            selectOption(index) {
                if (this.showAnswer) return;
                if (this.currentQuestion.type === 'single' || this.currentQuestion.type === 'judgment') {
                    this.selectedOptions = [index];
                } else {
                    const idx = this.selectedOptions.indexOf(index);
                    if (idx > -1) {
                        this.selectedOptions.splice(idx, 1);
                    } else {
                        this.selectedOptions.push(index);
                    }
                }
            },
            submitAnswer() {
                if (this.selectedOptions.length === 0) {
                    alert('请先选择答案');
                    return;
                }
                this.showAnswer = true;
                this.answeredCount++;
                
                const answer = this.currentQuestion.answer || [];
                // 检查答案是否是字母格式（如"A"、"B"）
                const isLetterAnswer = answer.length > 0 && /^[A-D]$/.test(answer[0]);
                
                let isCorrect = false;
                if (isLetterAnswer) {
                    // 字母答案格式：比较选中选项的字母标签
                    const selectedLabels = this.selectedOptions.map(i => this.getOptionLabel(i));
                    isCorrect = selectedLabels.length === answer.length &&
                        selectedLabels.every(l => answer.includes(l));
                } else {
                    // 文本答案格式：比较选中选项的文本内容
                    const selectedTexts = this.selectedOptions.map(i => this.currentQuestion.options[i]);
                    isCorrect = selectedTexts.length === answer.length &&
                        selectedTexts.every(t => answer.includes(t));
                }
                
                if (isCorrect) {
                    this.correctCount++;
                }
            },
            resetAnswer() {
                this.selectedOptions = [];
                this.showAnswer = false;
            },
            nextQuestion() {
                if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
                    this.currentQuestionIndex++;
                    this.selectedOptions = [];
                    this.showAnswer = false;
                    this.loadNote();
                } else {
                    this.showResult = true;
                }
            },
            prevQuestion() {
                if (this.currentQuestionIndex > 0) {
                    this.currentQuestionIndex--;
                    this.selectedOptions = [];
                    this.showAnswer = false;
                    this.loadNote();
                }
            },
            selectChapter(index) {
                this.currentChapterIndex = index;
                this.currentQuestionIndex = 0;
                this.selectedOptions = [];
                this.showAnswer = false;
            },
            switchMode(mode) {
                this.currentMode = mode;
                this.currentQuestionIndex = 0;
                this.selectedOptions = [];
                this.showAnswer = false;
                this.answeredCount = 0;
                this.correctCount = 0;
                this.showResult = false;
                
                if (mode === 'practice') {
                    this.currentQuestions = [...this.allQuestions];
                } else {
                    this.currentQuestions = generateExamQuestions(this.allQuestions);
                }
            },
            restartExam() {
                if (this.currentMode === 'exam') {
                    this.currentQuestions = generateExamQuestions(this.allQuestions);
                    this.currentQuestionIndex = 0;
                    this.selectedOptions = [];
                    this.showAnswer = false;
                    this.answeredCount = 0;
                    this.correctCount = 0;
                    this.showResult = false;
                }
            },
            switchQuestionType(type) {
                console.log('switchQuestionType called with type:', type, 'currentMode:', this.currentMode);
                if (this.currentMode !== 'practice') {
                    console.log('Not in practice mode, returning');
                    return;
                }
                
                this.currentQuestionType = type;
                
                if (type === 'all') {
                    this.currentQuestions = [...this.allQuestions];
                } else {
                    this.currentQuestions = this.allQuestions.filter(q => q.type === type);
                }
                
                console.log('Filtered questions count:', this.currentQuestions.length);
                this.currentQuestionIndex = 0;
                this.selectedOptions = [];
                this.showAnswer = false;
            },
            // 加载当前题目的备注
            loadNote() {
                const questionId = this.currentQuestion.id;
                if (questionId) {
                    // 先检查本地缓存
                    if (this.notes[questionId] !== undefined) {
                        this.currentNote = this.notes[questionId];
                        return;
                    }
                    // 从后端加载
                    fetch(`http://localhost:3001/api/notes?openid=test_openid&bank_code=security&question_id=${questionId}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.data && data.data.note) {
                                this.currentNote = data.data.note;
                                this.notes[questionId] = data.data.note;
                            } else {
                                this.currentNote = '';
                                this.notes[questionId] = '';
                            }
                        })
                        .catch(error => {
                            console.error('加载备注失败:', error);
                            this.currentNote = '';
                        });
                }
            },
            // 保存备注
            saveNote() {
                const questionId = this.currentQuestion.id;
                if (!questionId) return;
                
                fetch('http://localhost:3001/api/notes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        openid: 'test_openid',
                        bank_code: 'security',
                        question_id: questionId,
                        note: this.currentNote
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.notes[questionId] = this.currentNote;
                        alert('备注保存成功');
                    } else {
                        alert('备注保存失败');
                    }
                })
                .catch(error => {
                    console.error('保存备注失败:', error);
                    alert('备注保存失败');
                });
            },
            // 删除备注
            deleteNote() {
                const questionId = this.currentQuestion.id;
                if (!questionId || !this.currentNote) return;
                
                if (!confirm('确定要删除这个备注吗？')) return;
                
                fetch('http://localhost:3001/api/notes', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        openid: 'test_openid',
                        bank_code: 'security',
                        question_id: questionId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.currentNote = '';
                        this.notes[questionId] = '';
                        alert('备注删除成功');
                    } else {
                        alert('备注删除失败');
                    }
                })
                .catch(error => {
                    console.error('删除备注失败:', error);
                    alert('备注删除失败');
                });
            }
        }
    });

    app.mount('#app');
}

// 等待Vue加载完成后初始化
if (typeof Vue !== 'undefined') {
    initApp();
} else {
    window.addEventListener('load', () => {
        if (typeof Vue !== 'undefined') {
            initApp();
        }
    });
}