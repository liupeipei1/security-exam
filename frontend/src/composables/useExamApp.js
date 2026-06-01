import { ref, computed, watch } from 'vue'
import { apiGet, apiPost, apiPut, getStoredUser, setStoredUser, clearStoredUser, addFavorite, removeFavorite, getFavorites, checkFavorite } from '../api/client.js'

export function useExamApp() {
                const showUserMenu = ref(false)
                const currentSection = ref('single'); // 默认显示单选题
                const currentPage = ref(1);
                const jumpPage = ref(1); // 跳转页码输入框的值
                const showAnswers = ref({}); // 存储每个题目的答案显示状态，键为题目id
                const showResult = ref(false);
                const finalScore = ref(0);
                const userAnswers = ref({});
                const questionNotes = ref({}); // 存储每个题目的备注，键为题目id
                const questionExplanations = ref({}); // 存储每个题目的自定义解析，键为题目id
                const examMode = ref(false); // 考试模式：true=考试模式，false=背题模式
                
                // 模拟考试相关变量
                const examQuestions = ref([]); // 模拟考试题目列表
                const examUserAnswers = ref({}); // 考试答题记录
                const examShowResult = ref(false); // 是否显示考试结果
                const examScore = ref(0); // 考试分数
                const examTimeLeft = ref(5400); // 考试剩余时间（秒），90分钟
                const examTimer = ref(null); // 计时器
                const examStarted = ref(false); // 考试是否已开始

                // 登录相关状态
                const isLoggedIn = ref(false);
                const currentUser = ref({
                    id: null,
                    openid: null,
                    nickname: null,
                    avatar: null,
                    is_vip: false,
                    vip_expire: null
                });
                const showLoginModal = ref(false);
                const loginLoading = ref(false);
                const loginError = ref('');
                const showVipModal = ref(false); // 是否显示VIP开通弹窗
                const showQrCodeLogin = ref(false); // 是否显示扫码登录界面
                const qrCodeUrl = ref(''); // 二维码图片URL
                const qrCodeTimer = ref(null); // 轮询计时器

                const navItems = [
                    { id: 'judgment', name: '判断题', icon: '✓✗' },
                    { id: 'single', name: '单选题', icon: '⭕' },
                    { id: 'multiple', name: '多选题', icon: '☑️' },
                    { id: 'exam', name: '模拟考试', icon: '🎯' },
                    { id: 'favorites', name: '我的收藏', icon: '❤️' },
                    { id: 'history', name: '答题记录', icon: '📊' },
                    { id: 'knowledge', name: '知识要点', icon: '📖' },
                    { id: 'guide', name: '考试指南', icon: '📋' }
                ];

                // 题库列表（从后端获取）
                const exams = ref([]);
                
                // 当前选中的题库
                const currentExam = ref('');

                // 题库数据
                const questions = ref([]);
                const loading = ref(true);
                
                // 知识要点数据
                const knowledgePoints = ref([]);
                const knowledgeLoading = ref(false);
                
                // 考试指南数据
                const guideData = ref({});
                const guideLoading = ref(false);
                // 考试指南编辑相关
                const guideEditing = ref(false);
                const guideForm = ref({
                    examOverview: '',
                    examContent: [],
                    questionTypeDistribution: [],
                    preparationTips: [],
                    examTips: []
                });
                const guideSaved = ref(false);
                
                // 初始化编辑表单
                const initGuideForm = () => {
                    guideForm.value = {
                        examOverview: guideData.value.examOverview || '',
                        examContent: guideData.value.examContent ? [...guideData.value.examContent] : [],
                        questionTypeDistribution: guideData.value.questionTypeDistribution 
                            ? JSON.parse(JSON.stringify(guideData.value.questionTypeDistribution)) 
                            : [],
                        preparationTips: guideData.value.preparationTips ? [...guideData.value.preparationTips] : [],
                        examTips: guideData.value.examTips ? [...guideData.value.examTips] : []
                    };
                };
                
                // 保存考试指南
                const saveGuide = async () => {
                    try {
                        const data = await apiPut('/api/guide', {
                            exam_code: currentExam.value,
                            ...guideForm.value
                        });
                        
                        if (data && data.success === true) {
                            guideSaved.value = true;
                            guideEditing.value = false;
                            // 重新加载指南数据
                            await loadGuide(currentExam.value);
                            // 3秒后隐藏保存成功提示
                            setTimeout(() => {
                                guideSaved.value = false;
                            }, 3000);
                        } else {
                            alert(data.message || '保存失败');
                        }
                    } catch (error) {
                        console.error('保存考试指南失败:', error);
                        alert('保存失败');
                    }
                };
                
                // 取消编辑
                const cancelEdit = () => {
                    guideEditing.value = false;
                };
                
                // 添加备考建议
                const addTip = () => {
                    guideForm.value.preparationTips.push('');
                };
                
                // 删除备考建议
                const removeTip = (index) => {
                    guideForm.value.preparationTips.splice(index, 1);
                };
                
                // 添加通关秘诀
                const addExamTip = () => {
                    guideForm.value.examTips.push('');
                };
                
                // 删除通关秘诀
                const removeExamTip = (index) => {
                    guideForm.value.examTips.splice(index, 1);
                };
                
                // 添加考试内容
                const addExamContent = () => {
                    guideForm.value.examContent.push('');
                };
                
                // 删除考试内容
                const removeExamContent = (index) => {
                    guideForm.value.examContent.splice(index, 1);
                };
                
                // 添加题型
                const addQuestionType = () => {
                    guideForm.value.questionTypeDistribution.push({
                        type: '',
                        count: 0,
                        score: 0
                    });
                };
                
                // 删除题型
                const removeQuestionType = (index) => {
                    guideForm.value.questionTypeDistribution.splice(index, 1);
                };
                
                // 统一处理API错误响应
                const handleApiError = (data, defaultMessage = '操作失败') => {
                    if (!data) {
                        return { handled: true, message: defaultMessage };
                    }
                    
                    // 处理网络错误
                    if (data.code === 'NETWORK_ERROR') {
                        return { handled: true, message: '网络连接失败，请检查网络' };
                    }
                    
                    // 处理未授权（登录过期）
                    if (data.code === 'UNAUTHORIZED' || data.message?.includes('请先登录')) {
                        localStorage.removeItem('user');
                        isLoggedIn.value = false;
                        currentUser.value = { id: null, openid: null };
                        showLoginModal.value = true;
                        loginError.value = data.message || '登录已过期，请重新登录';
                        return { handled: true, message: '登录已过期' };
                    }
                    
                    // 处理VIP权限不足
                    if (data.needVip || data.code === 'NEED_VIP' || data.message?.includes('VIP') || data.message?.includes('会员')) {
                        showVipModal.value = true;
                        return { handled: true, message: '需要VIP权限' };
                    }
                    
                    // 处理服务器错误
                    if (data.code === 'SERVER_ERROR') {
                        return { handled: true, message: '服务器内部错误，请稍后重试' };
                    }
                    
                    return { handled: false, message: data.message || defaultMessage };
                };

                // 从后端 API 加载题库数据
                const loadQuestions = async (examCode = null) => {
                    const params = { 
                        exam_code: examCode || currentExam.value || undefined,
                        openid: currentUser.value?.openid || undefined
                    }
                    try {
                        const data = await apiGet('/api/questions', params)
                            console.log('API返回数据:', data);
                            // 检查返回的数据格式
                            if (data && data.success === true && Array.isArray(data.data)) {
                                questions.value = data.data;
                                console.log('成功加载题目数量:', questions.value.length);
                            } else if (data && data.success === false) {
                                // 使用统一错误处理
                                const errorResult = handleApiError(data, '加载题库数据失败');
                                console.warn('加载题库数据失败:', errorResult.message);
                                questions.value = [];
                            } else if (Array.isArray(data)) {
                                // 兼容旧版直接返回数组的格式
                                questions.value = data;
                            } else {
                                questions.value = [];
                            }
                            loading.value = false;
                    } catch (error) {
                        console.error('加载题库数据失败:', error);
                        questions.value = [];
                        loading.value = false;
                    }
                };

                // 检查登录状态（不自动加载题目）
                const checkLoginStatus = () => {
                    const savedUser = getStoredUser();
                    if (savedUser) {
                        currentUser.value = savedUser;
                        isLoggedIn.value = true;
                    }
                };
                
                // 初始化加载（先加载题库列表，再加载题目）
                const initLoad = async () => {
                    checkLoginStatus();
                    await loadExams();
                    // 加载之前保存的备注（从数据库）
                    await loadQuestionNotes();
                    // 题库列表加载完成后，根据登录状态加载题目
                    if (isLoggedIn.value) {
                        loadQuestions(currentExam.value);
                    }
                    // 加载知识要点（不需要登录）
                    loadKnowledgePoints(currentExam.value);
                };

                // 加载知识要点
                const loadKnowledgePoints = async (examCode = null) => {
                    const targetExamCode = examCode || currentExam.value || undefined;
                    console.log('loadKnowledgePoints called with examCode:', examCode, ', currentExam.value:', currentExam.value, ', targetExamCode:', targetExamCode);
                    const params = { exam_code: targetExamCode };
                    knowledgeLoading.value = true;
                    try {
                        const data = await apiGet('/api/knowledge', params);
                        console.log('知识要点API返回数据:', data);
                        if (data && data.success === true && Array.isArray(data.data)) {
                            knowledgePoints.value = data.data;
                            console.log('成功加载知识要点:', knowledgePoints.value.length, '条');
                        } else {
                            knowledgePoints.value = [];
                        }
                    } catch (error) {
                        console.error('加载知识要点失败:', error);
                        knowledgePoints.value = [];
                    } finally {
                        knowledgeLoading.value = false;
                    }
                };
                
                // 加载考试指南
                const loadGuide = async (examCode = null) => {
                    const targetExamCode = examCode || currentExam.value || undefined;
                    console.log('loadGuide called with examCode:', examCode, ', currentExam.value:', currentExam.value, ', targetExamCode:', targetExamCode);
                    const params = { exam_code: targetExamCode };
                    guideLoading.value = true;
                    try {
                        const data = await apiGet('/api/guide', params);
                        console.log('考试指南API返回数据:', data);
                        if (data && data.success === true && data.data) {
                            guideData.value = data.data;
                            console.log('成功加载考试指南:', guideData.value.title);
                        } else {
                            guideData.value = {};
                        }
                    } catch (error) {
                        console.error('加载考试指南失败:', error);
                        guideData.value = {};
                    } finally {
                        guideLoading.value = false;
                    }
                };

                // 切换题库
                const switchExam = (examCode) => {
                    currentExam.value = examCode;
                    if (isLoggedIn.value) {
                        loadQuestions(examCode);
                    }
                    // 无论是否登录都加载知识要点和考试指南
                    loadKnowledgePoints(examCode);
                    loadGuide(examCode);
                };

                // 获取当前题库名称
                const currentExamName = computed(() => {
                    const exam = exams.value.find(e => e.exam_code === currentExam.value);
                    return exam ? exam.exam_name : '';
                });

                // 获取当前题库的考试配置
                const currentExamConfig = computed(() => {
                    const exam = exams.value.find(e => e.exam_code === currentExam.value);
                    if (!exam) {
                        return {
                            total_questions: 0,
                            judgment_count: 0,
                            single_count: 0,
                            multiple_count: 0,
                            exam_duration: 90 // 默认90分钟
                        };
                    }
                    return {
                        total_questions: exam.total_questions || 0,
                        judgment_count: exam.judgment_count || 0,
                        single_count: exam.single_count || 0,
                        multiple_count: exam.multiple_count || 0,
                        exam_duration: exam.exam_duration || 90 // 默认90分钟
                    };
                });

                // 加载题库列表
                const loadExams = async () => {
                    try {
                        const data = await apiGet('/api/exams');
                        if (data && data.success === true && Array.isArray(data.data)) {
                            exams.value = data.data;
                            // 设置默认选中第一个题库
                            if (exams.value.length > 0 && !currentExam.value) {
                                currentExam.value = exams.value[0].exam_code;
                            }
                            console.log('成功加载题库列表:', exams.value.length, '个题库');
                        }
                    } catch (error) {
                        console.error('加载题库列表失败:', error);
                    }
                };

                // 页面加载时初始化
                initLoad();

                // 每页显示的题目数量
                const pageSize = 10;

                // 计算属性 - 根据当前选中的题型过滤题目
                const filteredQuestions = computed(() => {
                    // 确保 questions.value 是数组
                    if (!questions.value || !Array.isArray(questions.value)) {
                        return [];
                    }
                    if (currentSection.value === 'single') {
                        return questions.value.filter(q => q.type === 'single');
                    } else if (currentSection.value === 'multiple') {
                        return questions.value.filter(q => q.type === 'multiple');
                    } else if (currentSection.value === 'judgment') {
                        return questions.value.filter(q => q.type === 'judgment');
                    }
                    return questions.value;
                });

                const totalQuestions = computed(() => filteredQuestions.value.length);
                
                const totalPages = computed(() => {
                    return Math.ceil(totalQuestions.value / pageSize);
                });

                const currentPageQuestions = computed(() => {
                    const start = (currentPage.value - 1) * pageSize;
                    const end = start + pageSize;
                    return filteredQuestions.value.slice(start, end);
                });

                const answeredCount = computed(() => {
                    return Object.keys(userAnswers.value).length;
                });

                const correctCount = computed(() => {
                    let count = 0;
                    for (const [id, answer] of Object.entries(userAnswers.value)) {
                        const question = questions.value.find(q => q.id === parseInt(id));
                        if (!question || !question.answer) continue;
                        
                        // 将用户选择的索引转换为答案标签（统一使用字母格式）
                        const userAnswerLabels = answer.map(index => {
                            return getOptionLabel(index);
                        }).sort();
                        
                        const correctAnswerLabels = [...question.answer].sort();
                        
                        if (JSON.stringify(userAnswerLabels) === JSON.stringify(correctAnswerLabels)) {
                            count++;
                        }
                    }
                    return count;
                });

                const accuracyRate = computed(() => {
                    if (answeredCount.value === 0) return 0;
                    return Math.round((correctCount.value / answeredCount.value) * 100);
                });

                // 监听题型切换，重置页码
                watch(currentSection, (newSection) => {
                    currentPage.value = 1;
                    jumpPage.value = 1;
                    // 如果切换到知识要点页面，加载知识要点数据
                    if (newSection === 'knowledge') {
                        loadKnowledgePoints();
                    }
                    // 如果切换到考试指南页面，加载考试指南数据
                    if (newSection === 'guide') {
                        loadGuide();
                    }
                });

                // 方法
                const getTypeLabel = (type) => {
                    const labels = {
                        'judgment': '判断题',
                        'single': '单选题',
                        'multiple': '多选题'
                    };
                    return labels[type] || '未知类型';
                };

                const getOptionLabel = (index) => {
                    return String.fromCharCode(65 + index);
                };

                const getQuestionIndex = (id) => {
                    if (!questions.value || !Array.isArray(questions.value)) {
                        return 0;
                    }
                    return questions.value.findIndex(q => q.id === id) + 1;
                };

                const isSelected = (questionId, optionIndex) => {
                    const answer = userAnswers.value[questionId];
                    return answer && answer.includes(optionIndex);
                };

                const isCorrectOption = (questionId, optionIndex) => {
                    if (!questions.value || !Array.isArray(questions.value)) {
                        return false;
                    }
                    const question = questions.value.find(q => q.id === questionId);
                    if (!question || !question.answer) return false;
                    
                    // 获取选项标签（A, B, C, D...）
                    const optionLabel = getOptionLabel(optionIndex);
                    
                    // 判断类型处理
                    if (question.type === 'judgment') {
                        // 判断题：索引0=正确，索引1=错误
                        const answerText = optionIndex === 0 ? '正确' : '错误';
                        // 兼容数据库中的多种答案格式："对"/"错" 或 "正确"/"错误" 或 "A"/"B"
                        const isCorrect = question.answer.includes(answerText) || 
                                         question.answer.includes(optionLabel) ||
                                         (optionIndex === 0 && (question.answer.includes('对') || question.answer.includes('A'))) ||
                                         (optionIndex === 1 && (question.answer.includes('错') || question.answer.includes('B')));
                        return isCorrect;
                    } else {
                        // 单选题和多选题：索引0=A，索引1=B，以此类推
                        return question.answer.includes(optionLabel);
                    }
                };

                // 格式化显示正确答案
                const formatAnswer = (question) => {
                    if (!question || !question.answer) return '暂无答案';
                    
                    // 兼容字符串和数组类型的 answer
                    const answer = Array.isArray(question.answer) ? question.answer : question.answer.split('');
                    
                    if (question.type === 'judgment') {
                        // 判断题：直接显示正确/错误
                        return answer.join('、');
                    } else {
                        // 单选题和多选题：显示选项标签（A、B、C、D）
                        return answer.join('、');
                    }
                };

                const selectOption = (questionId, optionIndex) => {
                    const question = questions.value.find(q => q.id === questionId);
                    if (!question) return;

                    if (!userAnswers.value[questionId]) {
                        userAnswers.value[questionId] = [];
                    }

                    const index = userAnswers.value[questionId].indexOf(optionIndex);
                    if (question.type === 'single' || question.type === 'judgment') {
                        userAnswers.value[questionId] = [optionIndex];
                    } else {
                        if (index > -1) {
                            userAnswers.value[questionId].splice(index, 1);
                        } else {
                            userAnswers.value[questionId].push(optionIndex);
                        }
                    }
                    // 移除自动显示答案，改为点击提交按钮后显示
                };

                // 设置题目备注（持久化存储）
                // 保存题目备注（存储到数据库，同时备份到localStorage）
                const setQuestionNote = async (questionId, note) => {
                    questionNotes.value[questionId] = note;
                    
                    // 始终备份到localStorage，确保刷新后能显示
                    saveNotesToLocalStorage();
                    
                    // 如果用户已登录，同步到后端数据库
                    if (currentUser.value?.openid && currentExam.value) {
                        try {
                            await apiPost('/api/notes', {
                                openid: currentUser.value.openid,
                                exam_code: currentExam.value,
                                question_id: questionId,
                                note: note
                            });
                        } catch (error) {
                            console.error('保存备注到数据库失败:', error);
                        }
                    }
                };

                // 获取题目备注
                const getQuestionNote = (questionId) => {
                    return questionNotes.value[questionId] || '';
                };

                // 富文本备注输入处理
                const onNoteInput = (questionId, event) => {
                    const content = event.target.innerHTML;
                    setQuestionNote(questionId, content);
                };

                // 触发图片上传
                const insertImage = (questionId) => {
                    const input = document.getElementById(`image-upload-${questionId}`);
                    if (input) {
                        input.click();
                    }
                };

                // 处理图片上传
                const handleImageUpload = async (questionId, event) => {
                    const file = event.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const noteContent = document.getElementById(`note-${currentPage.value}-${questionId}`);
                        if (noteContent) {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'note-image';
                            img.style.maxWidth = '100%';
                            img.style.height = 'auto';
                            noteContent.appendChild(img);
                            setQuestionNote(questionId, noteContent.innerHTML);
                        }
                    };
                    reader.readAsDataURL(file);

                    // 重置input
                    event.target.value = '';
                };

                // 处理粘贴事件（支持截图粘贴）
                const onNotePaste = (event) => {
                    const items = event.clipboardData?.items;
                    if (!items) return;

                    for (const item of items) {
                        if (item.type.indexOf('image') !== -1) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const range = window.getSelection()?.getRangeAt(0);
                                    if (range) {
                                        const img = document.createElement('img');
                                        img.src = e.target.result;
                                        img.className = 'note-image';
                                        img.style.maxWidth = '100%';
                                        img.style.height = 'auto';
                                        range.deleteContents();
                                        range.insertNode(img);
                                    }
                                };
                                reader.readAsDataURL(file);
                            }
                        }
                    }
                };

                // 清空备注
                const clearNote = (questionId) => {
                    const noteContent = document.getElementById(`note-${currentPage.value}-${questionId}`);
                    if (noteContent) {
                        noteContent.innerHTML = '';
                        setQuestionNote(questionId, '');
                    }
                };

                // 设置题目自定义解析
                const setQuestionExplanation = async (questionId, explanation) => {
                    questionExplanations.value[questionId] = explanation;
                    
                    // 调用后端API保存解析
                    if (currentExam.value) {
                        try {
                            await apiPost('/api/question/explanation', {
                                exam_code: currentExam.value,
                                question_id: questionId,
                                explanation: explanation
                            });
                            console.log('解析保存成功');
                        } catch (error) {
                            console.error('保存解析失败:', error);
                        }
                    }
                };

                // 获取题目解析（优先自定义解析，否则使用默认解析）
                const getQuestionExplanation = (question) => {
                    if (questionExplanations.value[question.id]) {
                        return questionExplanations.value[question.id];
                    }
                    return question.explanation || '暂无解析';
                };

                // 从后端加载备注（优先数据库，降级到localStorage）
                const loadQuestionNotes = async () => {
                    let loadedFromDB = false;
                    
                    if (currentUser.value?.openid && currentExam.value) {
                        try {
                            const data = await apiGet('/api/notes', {
                                openid: currentUser.value.openid,
                                exam_code: currentExam.value
                            });
                            if (data.success && data.data && data.data.length > 0) {
                                const notesMap = {};
                                data.data.forEach(item => {
                                    notesMap[item.question_id] = item.note;
                                });
                                questionNotes.value = notesMap;
                                loadedFromDB = true;
                                // 同步到localStorage
                                saveNotesToLocalStorage();
                            }
                        } catch (error) {
                            console.error('从后端加载备注失败:', error);
                        }
                    }
                    
                    // 如果从数据库加载失败、未登录或数据库无数据，从localStorage加载
                    if (!loadedFromDB) {
                        loadNotesFromLocalStorage();
                    }
                };

                // 保存备注到localStorage
                const saveNotesToLocalStorage = () => {
                    try {
                        localStorage.setItem('questionNotes', JSON.stringify(questionNotes.value));
                    } catch (error) {
                        console.error('保存备注到localStorage失败:', error);
                    }
                };

                // 从localStorage加载备注
                const loadNotesFromLocalStorage = () => {
                    try {
                        const saved = localStorage.getItem('questionNotes');
                        if (saved) {
                            const savedNotes = JSON.parse(saved);
                            // 合并本地存储的备注（不覆盖已加载的）
                            questionNotes.value = { ...savedNotes, ...questionNotes.value };
                        }
                    } catch (error) {
                        console.error('从localStorage加载备注失败:', error);
                    }
                };

                // 单题提交方法
                const submitSingleQuestion = (questionId) => {
                    // 显示当前题目的答案
                    // 使用展开运算符确保响应式更新
                    showAnswers.value = { ...showAnswers.value, [questionId]: true };
                };

                // 重置单题答案方法
                const resetSingleQuestion = (questionId) => {
                    // 清除该题的答案选择
                    if (userAnswers.value[questionId]) {
                        delete userAnswers.value[questionId];
                        userAnswers.value = { ...userAnswers.value };
                    }
                    // 隐藏答案
                    showAnswers.value = { ...showAnswers.value, [questionId]: false };
                };

                const submitAnswers = () => {
                    const correct = correctCount.value;
                    // 基于已答题数计算分数，而不是总题数
                    const answered = answeredCount.value;
                    finalScore.value = answered > 0 ? Math.round((correct / answered) * 100) : 0;
                    
                    // 保存答题记录
                    saveQuizRecord();
                    
                    showResult.value = true;
                };

                // 保存答题记录到 localStorage
                const saveQuizRecord = () => {
                    const record = {
                        id: Date.now(),
                        timestamp: new Date().toLocaleString('zh-CN'),
                        score: finalScore.value,
                        correctCount: correctCount.value,
                        totalQuestions: totalQuestions.value,
                        answeredCount: answeredCount.value,
                        duration: '-', // 可以后续添加计时功能
                        answers: { ...userAnswers.value }
                    };
                    
                    // 从 localStorage 获取历史记录
                    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
                    history.unshift(record); // 添加到开头
                    
                    // 最多保存100条记录
                    if (history.length > 100) {
                        history.pop();
                    }
                    
                    localStorage.setItem('quizHistory', JSON.stringify(history));
                };

                // 模拟考试 - 生成试卷（40个判断题、140个单选题、10个多选题）
                const generateExamPaper = () => {
                    const judgmentQuestions = questions.value.filter(q => q.type === 'judgment');
                    const singleQuestions = questions.value.filter(q => q.type === 'single');
                    const multipleQuestions = questions.value.filter(q => q.type === 'multiple');
                    
                    // 随机抽取题目，按判断题、单选题、多选题顺序排列
                    const shuffledJudgment = shuffleArray([...judgmentQuestions]).slice(0, 40);
                    const shuffledSingle = shuffleArray([...singleQuestions]).slice(0, 140);
                    const shuffledMultiple = shuffleArray([...multipleQuestions]).slice(0, 10);
                    
                    // 按顺序合并：判断题 -> 单选题 -> 多选题
                    examQuestions.value = [...shuffledJudgment, ...shuffledSingle, ...shuffledMultiple];
                };

                // 数组随机排序
                const shuffleArray = (array) => {
                    const newArray = [...array];
                    for (let i = newArray.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
                    }
                    return newArray;
                };

                // 开始模拟考试
                const startExam = () => {
                    generateExamPaper();
                    examUserAnswers.value = {};
                    examShowResult.value = false;
                    examScore.value = 0;
                    examTimeLeft.value = 5400; // 90分钟
                    examStarted.value = true;
                    
                    // 启动计时器
                    if (examTimer.value) {
                        clearInterval(examTimer.value);
                    }
                    examTimer.value = setInterval(() => {
                        if (examTimeLeft.value > 0) {
                            examTimeLeft.value--;
                        } else {
                            // 时间到，自动提交
                            submitExam();
                        }
                    }, 1000);
                };

                // 模拟考试 - 选择答案
                const selectExamOption = (questionId, optionIndex) => {
                    if (examShowResult.value) return;
                    
                    const question = examQuestions.value.find(q => q.id === questionId);
                    if (!question) return;
                    
                    if (question.type === 'single' || question.type === 'judgment') {
                        examUserAnswers.value[questionId] = [optionIndex];
                    } else {
                        if (!examUserAnswers.value[questionId]) {
                            examUserAnswers.value[questionId] = [];
                        }
                        const index = examUserAnswers.value[questionId].indexOf(optionIndex);
                        if (index > -1) {
                            examUserAnswers.value[questionId].splice(index, 1);
                        } else {
                            examUserAnswers.value[questionId].push(optionIndex);
                        }
                    }
                };

                // 模拟考试 - 判断选项是否正确
                const isExamCorrectOption = (questionId, optionIndex) => {
                    const question = examQuestions.value.find(q => q.id === questionId);
                    if (!question) return false;
                    return question.answer.includes(question.options[optionIndex]);
                };

                // 模拟考试 - 判断选项是否被选中
                const isExamSelected = (questionId, optionIndex) => {
                    const answer = examUserAnswers.value[questionId];
                    return answer && answer.includes(optionIndex);
                };

                // 模拟考试 - 提交答案
                const submitExam = () => {
                    // 停止计时器
                    if (examTimer.value) {
                        clearInterval(examTimer.value);
                        examTimer.value = null;
                    }
                    
                    // 计算分数
                    let correct = 0;
                    examQuestions.value.forEach(question => {
                        const userAnswer = examUserAnswers.value[question.id];
                        if (!userAnswer || userAnswer.length === 0) return;
                        
                        const correctOptions = question.options
                            .map((opt, idx) => question.answer.includes(opt) ? idx : -1)
                            .filter(idx => idx !== -1);
                        
                        // 检查答案是否完全匹配
                        if (userAnswer.length === correctOptions.length &&
                            userAnswer.every(idx => correctOptions.includes(idx))) {
                            correct++;
                        }
                    });
                    
                    examScore.value = Math.round((correct / examQuestions.value.length) * 100);
                    examShowResult.value = true;
                    
                    // 保存考试记录
                    saveExamRecord(correct);
                };

                // 保存考试记录
                const saveExamRecord = (correctCount) => {
                    const record = {
                        id: Date.now(),
                        timestamp: new Date().toLocaleString('zh-CN'),
                        score: examScore.value,
                        correctCount: correctCount,
                        totalQuestions: examQuestions.value.length,
                        duration: formatTime(5400 - examTimeLeft.value),
                        type: 'exam'
                    };
                    
                    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
                    history.unshift(record);
                    if (history.length > 100) {
                        history.pop();
                    }
                    localStorage.setItem('quizHistory', JSON.stringify(history));
                };

                // 格式化时间
                const formatTime = (seconds) => {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                };

                // 退出模拟考试
                const exitExam = () => {
                    if (examTimer.value) {
                        clearInterval(examTimer.value);
                        examTimer.value = null;
                    }
                    examStarted.value = false;
                    examQuestions.value = [];
                    examUserAnswers.value = {};
                    examShowResult.value = false;
                };

                // 模拟考试 - 判断是否答对
                const isExamCorrectAnswer = (questionId) => {
                    const question = examQuestions.value.find(q => q.id === questionId);
                    if (!question) return false;
                    
                    const userAnswer = examUserAnswers.value[questionId];
                    if (!userAnswer || userAnswer.length === 0) return false;
                    
                    const correctOptions = question.options
                        .map((opt, idx) => question.answer.includes(opt) ? idx : -1)
                        .filter(idx => idx !== -1);
                    
                    return userAnswer.length === correctOptions.length &&
                           userAnswer.every(idx => correctOptions.includes(idx));
                };

                // 模拟考试 - 获取用户答案文本
                const getExamUserAnswerText = (questionId) => {
                    const question = examQuestions.value.find(q => q.id === questionId);
                    if (!question) return '';
                    
                    const userAnswer = examUserAnswers.value[questionId];
                    if (!userAnswer || userAnswer.length === 0) return '未作答';
                    
                    return userAnswer.map(idx => question.options[idx]).join(', ');
                };

                // 获取历史记录
                const getQuizHistory = () => {
                    return JSON.parse(localStorage.getItem('quizHistory') || '[]');
                };

                // 删除单条记录
                const deleteRecord = (recordId) => {
                    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
                    const filtered = history.filter(r => r.id !== recordId);
                    localStorage.setItem('quizHistory', JSON.stringify(filtered));
                };

                // 检查是否在微信浏览器中
                const isWechatBrowser = () => {
                    const ua = window.navigator.userAgent.toLowerCase();
                    return ua.indexOf('micromessenger') !== -1;
                };

                // 测试H5登录流程
                const testH5Login = async () => {
                    console.log('=== 测试H5登录流程 ===');
                    console.log('当前URL:', window.location.href);
                    console.log('是否在微信浏览器:', isWechatBrowser());
                    console.log('User Agent:', window.navigator.userAgent);
                    console.log('WECHAT_CONFIG:', window.WECHAT_CONFIG);
                    
                    // 检查配置
                    const appId = window.WECHAT_CONFIG ? window.WECHAT_CONFIG.appId : '未配置';
                    console.log('appId:', appId);
                    
                    if (appId === 'wx1234567890abcdef' || !appId) {
                        loginError.value = '微信登录未配置，请检查js/config.js';
                        return;
                    }
                    
                    // 测试后端连接
                    try {
                        console.log('测试后端连接...');
                        const data = await apiPost('/api/auth/login', { code: 'test', loginType: 'h5' });
                        console.log('后端响应:', data);
                        
                        if (data.success) {
                            loginError.value = '✅ 后端H5登录接口正常工作';
                            console.log('H5登录流程测试成功');
                        } else {
                            loginError.value = '❌ 后端响应失败: ' + data.message;
                        }
                    } catch (error) {
                        console.error('后端连接失败:', error);
                        loginError.value = '❌ 无法连接到后端服务器: ' + error.message;
                    }
                };

                // 微信登录处理函数 - H5授权登录
                const handleWechatLogin = () => {
                    // 从配置文件获取微信appId
                    const appId = window.WECHAT_CONFIG ? window.WECHAT_CONFIG.appId : 'wx1234567890abcdef';
                    
                    // 检查appId是否已配置
                    if (appId === 'wx1234567890abcdef' || !appId) {
                        // 未配置真实的appId，显示提示信息
                        loginError.value = '微信登录功能暂未配置，请使用测试登录';
                        console.warn('微信登录未配置，请在js/config.js中设置真实的appId');
                        return;
                    }
                    
                    // 开发模式：允许在非微信浏览器中测试（仅用于开发测试）
                    const isDevMode = true; // 设置为true可在普通浏览器中测试
                    
                    // 检查是否在微信浏览器中（开发模式下跳过此检查）
                    if (!isDevMode && !isWechatBrowser()) {
                        loginError.value = '请在微信中打开此页面以使用微信登录';
                        console.warn('不在微信浏览器中，无法使用微信H5授权');
                        return;
                    }
                    
                    // 构建回调地址（需要在微信开发者后台配置授权回调域名）
                    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
                    const scope = 'snsapi_base'; // snsapi_base用于静默授权，snsapi_userinfo需要用户手动授权
                    
                    // 构建微信授权URL
                    const wechatAuthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=STATE#wechat_redirect`;
                    
                    console.log('跳转到微信授权页面:', wechatAuthUrl);
                    
                    // 跳转到微信授权页面
                    window.location.href = wechatAuthUrl;
                };

                // 处理微信授权回调
                const handleWechatCallback = () => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const code = urlParams.get('code');
                    const state = urlParams.get('state');
                    
                    if (code) {
                        console.log('收到微信H5授权code:', code);
                        // 使用code进行H5登录
                        login(code, 'h5');
                        // 清除URL中的code参数
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                };

                // 页面加载时检查是否有微信授权回调
                handleWechatCallback();
                
                // 扫码登录：获取二维码
                const getQrCode = async () => {
                    try {
                        // 使用相对路径，自动适配当前域名
                        const data = await apiGet('/api/auth/qrcode');
                        
                        if (data.success) {
                            qrCodeUrl.value = data.data.qrcode;
                            // 开始轮询检查扫码状态
                            startQrCodePolling(data.data.ticket);
                        } else {
                            loginError.value = '获取二维码失败: ' + data.message;
                        }
                    } catch (error) {
                        console.error('获取二维码失败:', error);
                        loginError.value = '无法获取二维码: ' + error.message;
                    }
                };
                
                // 扫码登录：开始轮询检查状态
                const startQrCodePolling = (ticket) => {
                    // 先清除之前的计时器
                    if (qrCodeTimer.value) {
                        clearInterval(qrCodeTimer.value);
                    }
                    
                    qrCodeTimer.value = setInterval(async () => {
                        try {
                            // 使用相对路径，自动适配当前域名
                            const data = await apiGet('/api/auth/qrcode/check', { ticket });
                            
                            if (data.success) {
                                if (data.data.status === 'scanned') {
                                    // 用户已扫码，等待确认
                                    loginError.value = '用户已扫码，请在微信中确认登录';
                                } else if (data.data.status === 'confirmed') {
                                    // 用户已确认登录
                                    clearInterval(qrCodeTimer.value);
                                    qrCodeUrl.value = '';
                                    showQrCodeLogin.value = false;
                                    // 使用code进行登录
                                    login(data.data.code, 'qrcode');
                                } else if (data.data.status === 'expired') {
                                    // 二维码已过期，重新获取
                                    clearInterval(qrCodeTimer.value);
                                    loginError.value = '二维码已过期，请刷新重试';
                                    getQrCode();
                                }
                            }
                        } catch (error) {
                            console.error('轮询扫码状态失败:', error);
                        }
                    }, 2000); // 每2秒轮询一次
                };
                
                // 显示扫码登录界面时自动获取二维码
                const handleQrCodeLogin = () => {
                    qrCodeUrl.value = '';
                    loginError.value = '';
                    showQrCodeLogin.value = true;
                    // 延迟一下再获取二维码，让界面先显示
                    setTimeout(() => {
                        getQrCode();
                    }, 300);
                };
                
                // 清理扫码登录相关资源
                const cleanupQrCodeLogin = () => {
                    if (qrCodeTimer.value) {
                        clearInterval(qrCodeTimer.value);
                        qrCodeTimer.value = null;
                    }
                    qrCodeUrl.value = '';
                    showQrCodeLogin.value = false;
                };

                // 登录方法
                const login = async (code, loginType = 'mini') => {
                    loginLoading.value = true;
                    loginError.value = '';
                    
                    try {
                        const data = await apiPost('/api/auth/login', { code, loginType });
                        
                        if (data.success) {
                            currentUser.value = data.data;
                            isLoggedIn.value = true;
                            showLoginModal.value = false;
                            setStoredUser(data.data);
                            loadQuestions(currentExam.value);
                        } else {
                            loginError.value = data.message || '登录失败';
                        }
                    } catch (error) {
                        loginError.value = '网络错误，请稍后重试';
                    } finally {
                        loginLoading.value = false;
                    }
                };

                // 退出登录
                const logout = () => {
                    isLoggedIn.value = false;
                    currentUser.value = {
                        id: null,
                        openid: null,
                        nickname: null,
                        avatar: null,
                        is_vip: false,
                        vip_expire: null
                    };
                    clearStoredUser();
                };

                

                // 清空所有记录
                const clearAllHistory = () => {
                    if (confirm('确定要清空所有答题记录吗？')) {
                        localStorage.removeItem('quizHistory');
                    }
                };

                // 导出记录到文件
                const exportHistory = () => {
                    const history = getQuizHistory();
                    const content = JSON.stringify(history, null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `答题记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                };

                const goToPage = () => {
                    if (jumpPage.value && jumpPage.value >= 1 && jumpPage.value <= totalPages.value) {
                        currentPage.value = jumpPage.value;
                    }
                };

                // 收藏相关功能
                const favoriteQuestionIds = ref([]); // 存储已收藏的题目ID
                const favoritesLoading = ref(false); // 收藏加载状态
                const favoritesQuestions = ref([]); // 收藏的题目列表
                const showFavoritesModal = ref(false); // 是否显示收藏列表弹窗

                // 添加收藏
                const addQuestionFavorite = async (questionId) => {
                    if (!isLoggedIn.value || !currentUser.value.openid) {
                        showLoginModal.value = true;
                        return { success: false, message: '请先登录' };
                    }
                    
                    const result = await addFavorite(currentUser.value.openid, currentExam.value, questionId);
                    if (result.success) {
                        if (!favoriteQuestionIds.value.includes(questionId)) {
                            favoriteQuestionIds.value.push(questionId);
                        }
                    }
                    return result;
                };

                // 取消收藏
                const removeQuestionFavorite = async (questionId) => {
                    if (!isLoggedIn.value || !currentUser.value.openid) {
                        showLoginModal.value = true;
                        return { success: false, message: '请先登录' };
                    }
                    
                    const result = await removeFavorite(currentUser.value.openid, currentExam.value, questionId);
                    if (result.success) {
                        const index = favoriteQuestionIds.value.indexOf(questionId);
                        if (index > -1) {
                            favoriteQuestionIds.value.splice(index, 1);
                        }
                    }
                    return result;
                };

                // 切换收藏状态
                const toggleFavorite = async (questionId) => {
                    if (isQuestionFavorite(questionId)) {
                        return await removeQuestionFavorite(questionId);
                    } else {
                        return await addQuestionFavorite(questionId);
                    }
                };

                // 检查题目是否已收藏
                const isQuestionFavorite = (questionId) => {
                    return favoriteQuestionIds.value.includes(questionId);
                };

                // 加载收藏列表
                const loadFavorites = async () => {
                    if (!isLoggedIn.value || !currentUser.value.openid) {
                        return;
                    }
                    
                    favoritesLoading.value = true;
                    const result = await getFavorites(currentUser.value.openid, currentExam.value);
                    if (result.success) {
                        favoritesQuestions.value = result.data;
                        favoriteQuestionIds.value = result.data.map(q => q.id);
                    }
                    favoritesLoading.value = false;
                };

                // 打开收藏列表弹窗
                const openFavoritesModal = async () => {
                    await loadFavorites();
                    showFavoritesModal.value = true;
                };

                // 关闭收藏列表弹窗
                const closeFavoritesModal = () => {
                    showFavoritesModal.value = false;
                };

                const resetAnswers = () => {
                    userAnswers.value = {};
                    showAnswers.value = {}; // 清空所有题目的答案显示状态
                    questionNotes.value = {}; // 清空所有题目的备注
                };

                const closeResult = () => {
                    showResult.value = false;
                    resetAnswers();
                };

                return {
                    currentSection,
                    currentPage,
                    jumpPage,
                    showAnswers,
                    showResult,
                    finalScore,
                    userAnswers,
                    navItems,
                    questions,
                    loading,
                    exams,
                    currentExam,
                    currentExamName,
                    currentExamConfig,
                    switchExam,
                    totalQuestions,
                    totalPages,
                    currentPageQuestions,
                    answeredCount,
                    correctCount,
                    accuracyRate,
                    getTypeLabel,
                    getOptionLabel,
                    getQuestionIndex,
                    isSelected,
                    isCorrectOption,
                    formatAnswer,
                    selectOption,
                    submitAnswers,
                    submitSingleQuestion,
                    resetSingleQuestion,
                    setQuestionNote,
                    getQuestionNote,
                    onNoteInput,
                    insertImage,
                    handleImageUpload,
                    onNotePaste,
                    clearNote,
                    setQuestionExplanation,
                    getQuestionExplanation,
                    goToPage,
                    resetAnswers,
                    closeResult,
                    getQuizHistory,
                    deleteRecord,
                    clearAllHistory,
                    exportHistory,
                    // 模拟考试相关
                    examStarted,
                    examQuestions,
                    examUserAnswers,
                    examShowResult,
                    examScore,
                    examTimeLeft,
                    startExam,
                    selectExamOption,
                    isExamSelected,
                    submitExam,
                    exitExam,
                    isExamCorrectAnswer,
                    getExamUserAnswerText,
                    formatTime,
                    // 登录相关
                    isLoggedIn,
                    currentUser,
                    showLoginModal,
                    loginLoading,
                    loginError,
                    showVipModal,
                    login,
                    logout,
                    handleWechatLogin,
                    testH5Login,
                    // 扫码登录相关
                    showQrCodeLogin,
                    qrCodeUrl,
                    handleQrCodeLogin,
                    cleanupQrCodeLogin,
                    showUserMenu,
                    examMode,
                    // 知识要点相关
                    knowledgePoints,
                    knowledgeLoading,
                    // 考试指南相关
                    guideData,
                    guideLoading,
                    guideEditing,
                    guideForm,
                    guideSaved,
                    initGuideForm,
                    saveGuide,
                    cancelEdit,
                    addTip,
                    removeTip,
                    addExamTip,
                    removeExamTip,
                    addExamContent,
                    removeExamContent,
                    addQuestionType,
                    removeQuestionType,
                    // 收藏相关
                    favoriteQuestionIds,
                    favoritesLoading,
                    favoritesQuestions,
                    showFavoritesModal,
                    addQuestionFavorite,
                    removeQuestionFavorite,
                    toggleFavorite,
                    isQuestionFavorite,
                    loadFavorites,
                    openFavoritesModal,
                    closeFavoritesModal
                };
}
