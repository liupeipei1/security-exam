import { ref, computed, watch, nextTick } from 'vue'
import { apiGet, apiPost, apiPut, apiDelete, getStoredUser, setStoredUser, clearStoredUser, addFavorite, removeFavorite, getFavorites, checkFavorite } from '../api/client.js'

// 使用单例模式，确保所有组件共享同一个状态
let instance = null;

function createInstance() {
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

                // 非题型导航项（保持硬编码）
                const nonQuestionNavItems = [
                    { id: 'exam', name: '模拟考试', icon: '🎯' },
                    { id: 'import', name: '导入题库', icon: '📥' },
                    { id: 'favorites', name: '我的收藏', icon: '❤️' },
                    { id: 'history', name: '答题记录', icon: '📊' },
                    { id: 'knowledge', name: '知识要点', icon: '📖' },
                    { id: 'guide', name: '考试指南', icon: '📋' }
                ];
                
                // 动态生成导航项：题型部分从数据库加载（图标也从数据库获取），其他部分硬编码
                // 根据当前题库的题型统计动态显示，只显示有题目的题型
                const navItems = computed(() => {
                    // 从 questionTypes 生成题型导航项，只包含当前题库中存在的题型
                    const questionTypeNavItems = questionTypes.value
                        .filter(qType => {
                            // 如果没有加载统计信息，显示所有题型；否则只显示有题目的题型
                            if (Object.keys(examQuestionTypeStats.value).length === 0) {
                                return true; // 未加载统计时显示全部
                            }
                            return examQuestionTypeStats.value[qType.type_code] > 0;
                        })
                        .map(qType => ({
                            id: qType.type_code,
                            name: qType.type_name,
                            icon: qType.type_icon || '📄',
                            count: examQuestionTypeStats.value[qType.type_code] || 0
                        }));
                    
                    // 合并题型导航项和非题型导航项
                    return [...questionTypeNavItems, ...nonQuestionNavItems];
                });

                // 题库列表（从后端获取）
                const exams = ref([]);
                
                // 当前选中的题库
                const currentExam = ref('');

                // 题库数据
                const questions = ref([]);
                const loading = ref(true);
                
                // 题型列表
                const questionTypes = ref([]);
                
                // 当前题库的题型统计（用于动态显示导航栏）
                const examQuestionTypeStats = ref({});
                
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
                });
                const guideSaved = ref(false);
                
                // 备考备注数据
                const guideNotes = ref(null);
                
                // 导入题库相关
                const importContent = ref('');
                const importExamCode = ref('');
                const importExamName = ref('');
                const importQuestionType = ref('');
                const importLoading = ref(false);
                const importResult = ref('');
                const importSuccess = ref(false);
                const isExamCodeFromDropdown = ref(false); // 标记题库代码是否来自下拉框
                
                // 图片上传相关
                const uploadedImages = ref([]);
                const imageUploadRef = ref(null);
                const importContentRef = ref(null);
                const imageSize = ref('100%'); // 图片大小设置：50%、75%、100%、150%、200%
                
                // 监听imageSize变化，实时更新已插入图片的大小
                watch(imageSize, (newSize) => {
                    if (importContentRef.value) {
                        const images = importContentRef.value.querySelectorAll('img');
                        images.forEach(img => {
                            img.style.maxWidth = newSize;
                            img.style.width = newSize;
                        });
                    }
                });
                
                // 获取导入内容（兼容contenteditable）
                const getImportContent = () => {
                    let content = '';
                    if (importContentRef.value) {
                        content = importContentRef.value.innerHTML;
                    } else {
                        content = importContent.value;
                    }
                    // 先保存img标签
                    const imgTags = [];
                    content = content.replace(/<img[^>]+>/gi, (match) => {
                        imgTags.push(match);
                        return `[IMG_PLACEHOLDER_${imgTags.length - 1}]`;
                    });
                    // 清理HTML标签和多余空白，保留基本格式
                    content = content
                        .replace(/<br\s*\/?>/gi, '\n')          // 将<br>转换为换行
                        .replace(/<div\s*\/?>/gi, '\n')         // 将<div>转换为换行
                        .replace(/<\/div>/gi, '')               // 移除</div>
                        .replace(/<[^>]+>/g, '')                // 移除其他HTML标签
                        .replace(/&nbsp;/gi, ' ')               // 将&nbsp;转换为空格
                        .replace(/\u200B/g, '')                 // 移除零宽字符
                        .replace(/\r\n/g, '\n')                 // 统一换行符
                        .replace(/\r/g, '\n')
                        .replace(/\n{3,}/g, '\n\n')             // 最多保留两个连续换行
                        .trim();
                    // 恢复img标签
                    content = content.replace(/\[IMG_PLACEHOLDER_(\d+)\]/g, (match, index) => {
                        return imgTags[index] || '';
                    });
                    return content;
                };
                
                // 设置导入内容
                const setImportContent = (content) => {
                    if (importContentRef.value) {
                        importContentRef.value.innerHTML = content;
                    }
                    importContent.value = content;
                };
                
                // 判断题库代码是否来自下拉框选项
                const isExamCodeManualInput = computed(() => {
                    if (!importExamCode.value) return false;
                    // 如果是从下拉框选择的，不是手动输入
                    if (isExamCodeFromDropdown.value) {
                        return false;
                    }
                    // 检查是否在exams列表中存在
                    const existsInExams = exams.value.some(exam => exam.exam_code === importExamCode.value);
                    return !existsInExams;
                });
                
                // 标记题库代码来自下拉框
                const markExamCodeFromDropdown = () => {
                    isExamCodeFromDropdown.value = true;
                };
                
                // 标记题库代码来自手动输入
                const markExamCodeFromInput = () => {
                    isExamCodeFromDropdown.value = false;
                };
                
                // 编辑题目相关
                const showEditQuestionModal = ref(false);
                const editLoading = ref(false);
                const editForm = ref({
                    id: null,
                    type: 'single',
                    question: '',
                    options: ['', ''],
                    answer: '',
                    explanation: '',
                    knowledgePoint: '',
                    imageSize: '100%', // 图片大小设置
                    singleAnswer: 0,
                    multipleAnswers: []
                });
                
                // 打开编辑题目弹窗
                const openEditQuestion = (question) => {
                    editForm.value = {
                        id: question.id,
                        type: question.type,
                        question: question.question,
                        options: question.options ? [...question.options] : ['', ''],
                        answer: question.answer,
                        explanation: question.explanation || '',
                        knowledgePoint: question.knowledgePoint || question.knowledge_point || '',
                        imageSize: '100%', // 默认图片大小
                        singleAnswer: 0,
                        multipleAnswers: []
                    };
                    
                    // 解析答案
                    if (question.type === 'judgment') {
                        editForm.value.answer = String(question.answer);
                    } else if (question.type === 'single' && question.answer) {
                        // 单选题：解析正确答案索引
                        const answerIndex = (typeof question.answer === 'string') 
                            ? question.answer.charCodeAt(0) - 65 
                            : Number(question.answer);
                        editForm.value.singleAnswer = answerIndex;
                    } else if (question.type === 'multiple' && question.answer) {
                        // 多选题：解析正确答案索引数组
                        if (Array.isArray(question.answer)) {
                            editForm.value.multipleAnswers = question.answer.map(a => 
                                typeof a === 'string' ? a.charCodeAt(0) - 65 : Number(a)
                            );
                        } else if (typeof question.answer === 'string') {
                            editForm.value.multipleAnswers = question.answer.split('').map(c => c.charCodeAt(0) - 65);
                        }
                    }
                    
                    showEditQuestionModal.value = true;
                    
                    // 手动设置解析内容到DOM（不再使用v-html绑定）
                    nextTick(() => {
                        const explanationContent = document.getElementById(`explanation-${question.id}`);
                        if (explanationContent) {
                            explanationContent.innerHTML = question.explanation || '';
                        }
                    });
                };
                
                // 关闭编辑题目弹窗
                const closeEditQuestion = () => {
                    showEditQuestionModal.value = false;
                    editForm.value = {
                        id: null,
                        type: 'single',
                        question: '',
                        options: ['', ''],
                        answer: '',
                        explanation: '',
                        knowledgePoint: '',
                        imageSize: '100%', // 默认图片大小
                        singleAnswer: 0,
                        multipleAnswers: []
                    };
                };
                
                // 监听题目类型改变，确保正确初始化选项和答案
                watch(() => editForm.value.type, (newType, oldType) => {
                    if (newType === 'single' || newType === 'multiple') {
                        // 确保有足够的选项
                        while (editForm.value.options.length < 2) {
                            editForm.value.options.push('');
                        }
                        // 确保答案索引有效
                        if (newType === 'single' && editForm.value.singleAnswer >= editForm.value.options.length) {
                            editForm.value.singleAnswer = 0;
                        }
                    }
                });
                
                // 添加选项
                const addOption = () => {
                    if (editForm.value.options.length < 10) {
                        editForm.value.options.push('');
                    }
                };
                
                // 删除选项
                const removeOption = (index) => {
                    if (editForm.value.options.length > 2) {
                        editForm.value.options.splice(index, 1);
                        // 同时调整答案索引
                        if (editForm.value.singleAnswer >= index) {
                            editForm.value.singleAnswer = Math.max(0, editForm.value.singleAnswer - 1);
                        }
                        editForm.value.multipleAnswers = editForm.value.multipleAnswers
                            .map(i => i > index ? i - 1 : i)
                            .filter(i => i >= 0 && i < editForm.value.options.length);
                    }
                };
                
                // 保存编辑题目
                const saveEditQuestion = async () => {
                    console.log('saveEditQuestion called!');
                    console.log('editForm.value:', editForm.value);
                    console.log('1. Checking currentExam...');
                    console.log('currentExam.value:', currentExam.value);
                    
                    // 验证当前考试是否选择
                    if (!currentExam.value) {
                        console.log('currentExam is empty, returning');
                        alert('请先选择考试');
                        return;
                    }
                    
                    console.log('2. currentExam is valid');
                    console.log('3. Checking question content...');
                    
                    // 验证题目内容
                    if (!editForm.value.question.trim()) {
                        alert('请输入题目内容');
                        return;
                    }
                    
                    // 验证单选题和多选题是否有选项
                    if ((editForm.value.type === 'single' || editForm.value.type === 'multiple') && 
                        editForm.value.options.length < 2) {
                        alert('请至少添加2个选项');
                        return;
                    }
                    
                    // 验证单选题是否选择了答案
                    if (editForm.value.type === 'single') {
                        console.log('singleAnswer:', editForm.value.singleAnswer, 'options.length:', editForm.value.options.length);
                        if (editForm.value.singleAnswer === null || editForm.value.singleAnswer === undefined || 
                            editForm.value.singleAnswer < 0 || editForm.value.singleAnswer >= editForm.value.options.length) {
                            alert('请选择正确答案');
                            return;
                        }
                    }
                    
                    // 验证多选题是否选择了答案
                    if (editForm.value.type === 'multiple' && 
                        (!editForm.value.multipleAnswers || editForm.value.multipleAnswers.length === 0)) {
                        alert('请选择正确答案');
                        return;
                    }
                    
                    editLoading.value = true;
                    try {
                        // 从DOM获取解析内容（避免输入时更新导致光标位置丢失）
                        const explanationContent = document.getElementById(`explanation-${editForm.value.id}`);
                        if (explanationContent) {
                            editForm.value.explanation = explanationContent.innerHTML;
                        }
                        
                        // 准备答案数据
                        let finalAnswer = editForm.value.answer;
                        if (editForm.value.type === 'single') {
                            finalAnswer = String.fromCharCode(65 + editForm.value.singleAnswer);
                        } else if (editForm.value.type === 'multiple') {
                            finalAnswer = editForm.value.multipleAnswers
                                .sort((a, b) => a - b)
                                .map(i => String.fromCharCode(65 + i))
                                .join('');
                        }
                        
                        // 应用图片大小设置到题目内容中的所有图片标签
                        const imageSize = editForm.value.imageSize;
                        let questionContent = editForm.value.question;
                        
                        // 使用统一的正则处理所有img标签
                        questionContent = questionContent.replace(
                            /<img([^>]*)>/gi,
                            (match, attrs) => {
                                if (attrs.includes('style=')) {
                                    // 有style属性，替换style内容
                                    return match.replace(
                                        /style="[^"]*"/gi,
                                        `style="max-width: ${imageSize}; width: ${imageSize}; height: auto;"`
                                    );
                                } else {
                                    // 没有style属性，添加style
                                    return `<img${attrs} style="max-width: ${imageSize}; width: ${imageSize}; height: auto;">`;
                                }
                            }
                        );
                        
                        const data = await apiPut(`/api/questions/${currentExam.value}/${editForm.value.id}`, {
                            question: questionContent,
                            options: editForm.value.options,
                            answer: finalAnswer,
                            explanation: editForm.value.explanation,
                            type: editForm.value.type,
                            knowledgePoint: editForm.value.knowledgePoint
                        });
                        
                        if (data && data.success === true) {
                            alert('保存成功');
                            closeEditQuestion();
                            // 重新加载题库
                            await loadQuestions(currentExam.value);
                        } else {
                            alert(data.message || '保存失败');
                        }
                    } catch (error) {
                        console.error('保存题目失败:', error);
                        alert('保存失败：' + (error.message || '未知错误'));
                    } finally {
                        editLoading.value = false;
                    }
                };
                
                // 删除题目
                const deleteQuestion = async (question) => {
                    if (!confirm(`确定要删除题目【${question.question.substring(0, 30)}...】吗？`)) {
                        return;
                    }
                    
                    try {
                        const data = await apiDelete(`/api/questions/${currentExam.value}/${question.id}`);
                        
                        if (data && data.success === true) {
                            alert('删除成功');
                            // 重新加载题库
                            await loadQuestions(currentExam.value);
                        } else {
                            alert(data.message || '删除失败');
                        }
                    } catch (error) {
                        console.error('删除题目失败:', error);
                        alert('删除失败：' + (error.message || '未知错误'));
                    }
                };
                
                // 删除题库
                const deleteExam = async (examCode, examName) => {
                    if (!confirm(`⚠️ 确定要删除题库【${examName}】吗？此操作将删除该题库下所有题目和相关数据，且不可恢复！`)) {
                        return;
                    }
                    
                    try {
                        const data = await apiDelete(`/api/exams/${examCode}`);
                        
                        if (data && data.success === true) {
                            alert('题库删除成功');
                            // 重新加载题库列表
                            await loadExams();
                            // 如果删除的是当前选中的题库，切换到第一个题库
                            if (currentExam.value === examCode && exams.value.length > 0) {
                                currentExam.value = exams.value[0].exam_code;
                            }
                        } else {
                            alert(data.message || '删除失败');
                        }
                    } catch (error) {
                        console.error('删除题库失败:', error);
                        alert('删除失败：' + (error.message || '未知错误'));
                    }
                };
                
                // 导入题库方法
                const handleImport = async () => {
                    const content = getImportContent();
                    if (!content.trim()) return;
                    
                    importLoading.value = true;
                    importResult.value = '';
                    
                    try {
                        // 创建FormData对象，支持图片上传
                        const formData = new FormData();
                        formData.append('content', content);
                        if (importExamCode.value) {
                            formData.append('exam_code', importExamCode.value);
                        }
                        if (importExamName.value) {
                            formData.append('exam_name', importExamName.value);
                        }
                        if (importExamCode.value) {
                            formData.append('table_name', importExamCode.value);
                        }
                        if (importQuestionType.value) {
                            formData.append('question_type', importQuestionType.value);
                        }
                        
                        // 使用原生fetch发送multipart/form-data请求
                        const API_BASE = import.meta.env.VITE_API_BASE || '';
                        const res = await fetch(`${API_BASE}/api/questions/import`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await res.json();
                        
                        if (data.success) {
                            importSuccess.value = true;
                            importResult.value = data.message || `成功导入 ${data.count || 0} 道题目`;
                        } else {
                            importSuccess.value = false;
                            importResult.value = data.message || '导入失败';
                        }
                    } catch (error) {
                        importSuccess.value = false;
                        importResult.value = '导入失败：' + (error.message || '未知错误');
                    } finally {
                        importLoading.value = false;
                    }
                };
                
                // 清空导入内容
                const clearImport = () => {
                    if (importContentRef.value) {
                        importContentRef.value.innerHTML = '';
                    }
                    importContent.value = '';
                    importExamCode.value = '';
                    importExamName.value = '';
                    importQuestionType.value = '';
                    importResult.value = '';
                    importSuccess.value = false;
                    uploadedImages.value = [];
                };
                
                // 触发图片上传
                const triggerImageUpload = () => {
                    imageUploadRef.value?.click();
                };
                
                // 将文件转换为Base64
                const fileToBase64 = (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                };
                
                // 处理图片上传（导入题库用）
                const handleImportImageUpload = async (event) => {
                    const files = event.target.files;
                    if (!files || files.length === 0) return;
                    
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        if (!file.type.startsWith('image/')) {
                            alert('请选择图片文件');
                            continue;
                        }
                        
                        if (file.size > 2 * 1024 * 1024) {
                            alert('图片大小不能超过 2MB');
                            continue;
                        }
                        
                        try {
                            // 将图片转换为Base64格式
                            const base64Data = await fileToBase64(file);
                            
                            // 将图片标签自动插入到题目内容中（直接存储Base64数据）
                            const size = imageSize.value;
                            const imgTag = `<img src="${base64Data}" style="max-width: ${size}; width: ${size}; height: auto;" />`;
                            
                            // 支持contenteditable
                            if (importContentRef.value) {
                                // 在光标位置插入图片
                                const selection = window.getSelection();
                                if (selection.rangeCount > 0) {
                                    const range = selection.getRangeAt(0);
                                    range.deleteContents();
                                    const imgElement = document.createElement('img');
                                    imgElement.src = base64Data;
                                    imgElement.style.maxWidth = size;
                                    imgElement.style.width = size;
                                    imgElement.style.height = 'auto';
                                    range.insertNode(imgElement);
                                    // 在图片后插入换行
                                    range.collapse(false);
                                    const br = document.createElement('br');
                                    range.insertNode(br);
                                } else {
                                    importContentRef.value.innerHTML += '\n' + imgTag + '\n';
                                }
                            } else {
                                importContent.value += '\n' + imgTag + '\n';
                            }
                            
                            // 添加到已上传图片列表（用于预览和管理）
                            uploadedImages.value.push({
                                name: file.name,
                                url: base64Data,
                                data: base64Data // 用于预览
                            });
                        } catch (error) {
                            console.error('图片处理失败:', error);
                            alert('图片处理失败: ' + error.message);
                        }
                    }
                    
                    // 清空input的值，允许重复上传相同文件
                    event.target.value = '';
                };
                
                // 处理拖拽上传（导入题库用）
                const handleImportImageDrop = async (event) => {
                    const files = event.dataTransfer.files;
                    if (!files || files.length === 0) return;
                    
                    // 创建一个临时input来模拟change事件
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.multiple = true;
                    Object.defineProperty(files, 'item', {
                        value: (index) => files[index]
                    });
                    tempInput.files = files;
                    
                    const changeEvent = new Event('change');
                    tempInput.addEventListener('change', handleImportImageUpload);
                    tempInput.dispatchEvent(changeEvent);
                };
                
                // 移除图片
                const removeImage = (index) => {
                    uploadedImages.value.splice(index, 1);
                };
                
                // 插入图片标签到内容中
                const insertImageTag = (index) => {
                    const img = uploadedImages.value[index];
                    if (img) {
                        const size = imageSize.value;
                        const imgTag = `<img src="${img.url}" style="max-width: ${size}; width: ${size}; height: auto;" />`;
                        
                        // 支持contenteditable
                        if (importContentRef.value) {
                            // 在光标位置插入图片
                            const selection = window.getSelection();
                            if (selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                range.deleteContents();
                                const imgElement = document.createElement('img');
                                imgElement.src = img.url;
                                imgElement.style.maxWidth = size;
                                imgElement.style.width = size;
                                imgElement.style.height = 'auto';
                                range.insertNode(imgElement);
                                // 在图片后插入换行
                                range.collapse(false);
                                const br = document.createElement('br');
                                range.insertNode(br);
                            } else {
                                importContentRef.value.innerHTML += imgTag + '\n';
                            }
                        } else {
                            importContent.value += imgTag + '\n';
                        }
                    }
                };
                
                // 处理粘贴事件（支持粘贴图片到题目内容）
                const handleImportPaste = async (event) => {
                    const items = event.clipboardData?.items;
                    if (!items) return;
                    
                    for (const item of items) {
                        if (item.type.indexOf('image') !== -1) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                    alert('图片大小不能超过 2MB');
                                    return;
                                }
                                
                                try {
                                    // 将图片转换为Base64格式（直接存储文件流）
                                    const base64Data = await fileToBase64(file);
                                    
                                    const size = imageSize.value;
                                    const imgTag = `<img src="${base64Data}" style="max-width: ${size}; width: ${size}; height: auto;" />`;
                                    
                                    // 支持contenteditable
                                    if (importContentRef.value) {
                                        // 在光标位置插入图片
                                        const selection = window.getSelection();
                                        if (selection.rangeCount > 0) {
                                            const range = selection.getRangeAt(0);
                                            range.deleteContents();
                                            const imgElement = document.createElement('img');
                                            imgElement.src = base64Data;
                                            imgElement.style.maxWidth = size;
                                            imgElement.style.width = size;
                                            imgElement.style.height = 'auto';
                                            range.insertNode(imgElement);
                                            // 在图片后插入换行
                                            range.collapse(false);
                                            const br = document.createElement('br');
                                            range.insertNode(br);
                                        } else {
                                            importContentRef.value.innerHTML += imgTag + '\n';
                                        }
                                    } else {
                                        importContent.value += imgTag + '\n';
                                    }
                                    
                                    // 添加到已上传图片列表
                                    uploadedImages.value.push({
                                        name: file.name,
                                        url: base64Data,
                                        data: base64Data
                                    });
                                } catch (error) {
                                    console.error('图片处理失败:', error);
                                    alert('图片处理失败: ' + error.message);
                                }
                            }
                        }
                    }
                };
                

                
                // 保存备考备注（已合并到 /api/guide 接口）
                const saveGuideNotes = async (content) => {
                    try {
                        console.log('saveGuideNotes called, currentExam.value:', currentExam.value, ', content length:', content?.length);
                        if (!currentExam.value) {
                            console.error('saveGuideNotes: currentExam.value is empty!');
                            return;
                        }
                        
                        const data = await apiPut('/api/guide', {
                            exam_code: currentExam.value,
                            content: content || ''
                        });
                        
                        if (data && data.success === true) {
                            // 直接更新guideNotes.value，无需重新加载
                            guideNotes.value = { content: content || '', images: [] };
                        }
                    } catch (error) {
                        console.error('保存备考备注失败:', error);
                    }
                };
                
                // 清空备考备注（已合并到 /api/guide 接口）
                const clearGuideNotes = async () => {
                    try {
                        if (!currentExam.value) return;
                        
                        const data = await apiPut('/api/guide', {
                            exam_code: currentExam.value,
                            content: ''
                        });
                        
                        if (data && data.success === true) {
                            guideNotes.value = null;
                        }
                    } catch (error) {
                        console.error('清空备考备注失败:', error);
                    }
                };
                
                // 初始化编辑表单
                const initGuideForm = () => {
                    guideForm.value = {
                        examOverview: guideData.value.examOverview || '',
                        examContent: guideData.value.examContent ? [...guideData.value.examContent] : [],
                        questionTypeDistribution: guideData.value.questionTypeDistribution 
                            ? JSON.parse(JSON.stringify(guideData.value.questionTypeDistribution)) 
                            : [],
                        preparationTips: guideData.value.preparationTips ? [...guideData.value.preparationTips] : [],
                    };
                };
                
                // 保存考试指南
                const saveGuide = async () => {
                    console.log('saveGuide called!');
                    console.log('currentExam.value:', currentExam.value);
                    console.log('guideForm.value:', guideForm.value);
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
                    console.log('========== initLoad 被调用 ==========');
                    checkLoginStatus();
                    await loadExams();
                    await loadQuestionTypes();
                    // 加载之前保存的备注（从数据库）
                    await loadQuestionNotes();
                    // 题库列表加载完成后，根据登录状态加载题目
                    if (isLoggedIn.value) {
                        loadQuestions(currentExam.value);
                    }
                    // 加载知识要点（不需要登录）
                    loadKnowledgePoints(currentExam.value);
                    // 加载考试指南（不需要登录）
                    loadGuide(currentExam.value);
                    // 加载当前题库的题型统计（用于动态显示导航栏）
                    loadExamQuestionTypeStats(currentExam.value);
                };

                // 加载知识要点
                const loadKnowledgePoints = async (examCode = null) => {
                    const targetExamCode = examCode || currentExam.value || undefined;
                    console.log('loadKnowledgePoints called with examCode:', examCode, ', currentExam.value:', currentExam.value, ', targetExamCode:', targetExamCode);
                    const params = { exam_code: targetExamCode };
                    knowledgeLoading.value = true;
                    try {
                        const data = await apiGet('/api/knowledge/list', params);
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
                            // 同时设置备考备注
                            if (data.data.content) {
                                guideNotes.value = { content: data.data.content, images: [] };
                            } else {
                                guideNotes.value = null;
                            }
                            console.log('成功加载考试指南:', guideData.value.title);
                        } else {
                            guideData.value = {};
                            guideNotes.value = null;
                        }
                    } catch (error) {
                        console.error('加载考试指南失败:', error);
                        guideData.value = {};
                        guideNotes.value = null;
                    } finally {
                        guideLoading.value = false;
                    }
                };

                // 切换题库
                const switchExam = (examCode) => {
                    // 处理可能传入的ref对象，提取实际值
                    const targetExamCode = examCode?.value !== undefined ? examCode.value : examCode;
                    console.log('switchExam called - param examCode:', examCode, ', targetExamCode:', targetExamCode);
                    currentExam.value = targetExamCode;
                    console.log('switchExam - currentExam.value set to:', currentExam.value);
                    // 无论是否登录都加载题目、知识要点和考试指南
                    loadQuestions(targetExamCode);
                    loadKnowledgePoints(targetExamCode);
                    loadGuide(targetExamCode);
                    // 加载当前题库的题型统计（用于动态显示导航栏）
                    loadExamQuestionTypeStats(targetExamCode);
                    // 重新加载备注（根据新的考试代码）
                    loadQuestionNotes();
                };

                // 获取当前题库名称
                const currentExamName = computed(() => {
                    const exam = exams.value.find(e => e.exam_code === currentExam.value);
                    return exam ? exam.exam_name : '';
                });

                // 获取当前题库的考试配置（优先从考试指南获取）
                const currentExamConfig = computed(() => {
                    const exam = exams.value.find(e => e.exam_code === currentExam.value);
                    
                    // 优先从考试指南获取题型分布
                    let judgment_count = 40;
                    let single_count = 140;
                    let multiple_count = 10;
                    
                    if (guideData.value && guideData.value.questionTypeDistribution && Array.isArray(guideData.value.questionTypeDistribution)) {
                        guideData.value.questionTypeDistribution.forEach(item => {
                            if (item.type === '判断题') {
                                judgment_count = item.count || judgment_count;
                            } else if (item.type === '单选题') {
                                single_count = item.count || single_count;
                            } else if (item.type === '多选题') {
                                multiple_count = item.count || multiple_count;
                            }
                        });
                    } else if (exam) {
                        // 如果没有考试指南，使用题库配置
                        judgment_count = exam.judgment_count || judgment_count;
                        single_count = exam.single_count || single_count;
                        multiple_count = exam.multiple_count || multiple_count;
                    }
                    
                    const total_questions = judgment_count + single_count + multiple_count;
                    const exam_duration = exam ? (exam.exam_duration || 90) : 90;
                    
                    return {
                        total_questions,
                        judgment_count,
                        single_count,
                        multiple_count,
                        exam_duration
                    };
                });

                // 加载题库列表
                const loadExams = async () => {
                    try {
                        const data = await apiGet('/api/exams');
                        if (data && data.success === true && Array.isArray(data.data)) {
                            exams.value = data.data;
                            console.log('loadExams - 加载的题库列表:', JSON.stringify(exams.value.map(e => ({exam_code: e.exam_code, exam_name: e.exam_name}))));
                            // 设置默认选中第一个题库
                            if (exams.value.length > 0 && !currentExam.value) {
                                currentExam.value = exams.value[0].exam_code;
                                console.log('loadExams - 设置默认考试:', currentExam.value);
                            }
                            console.log('成功加载题库列表:', exams.value.length, '个题库');
                        }
                    } catch (error) {
                        console.error('加载题库列表失败:', error);
                    }
                };
                
                // 加载题型列表
                const loadQuestionTypes = async () => {
                    try {
                        const data = await apiGet('/api/questions/types');
                        if (data && data.success === true && Array.isArray(data.data)) {
                            questionTypes.value = data.data;
                            console.log('成功加载题型列表:', questionTypes.value);
                        }
                    } catch (error) {
                        console.error('加载题型列表失败:', error);
                    }
                };
                
                // 加载当前题库的题型统计（用于动态显示导航栏）
                const loadExamQuestionTypeStats = async (examCode) => {
                    try {
                        const data = await apiGet('/api/questions/count', { exam_code: examCode });
                        if (data && data.success === true && data.data && data.data.types) {
                            // 将数组转换为对象，key为题型代码，value为数量
                            const stats = {};
                            data.data.types.forEach(item => {
                                stats[item.question_type] = item.count;
                            });
                            examQuestionTypeStats.value = stats;
                            console.log('成功加载题库题型统计:', examQuestionTypeStats.value);
                        } else {
                            examQuestionTypeStats.value = {};
                        }
                    } catch (error) {
                        console.error('加载题库题型统计失败:', error);
                        examQuestionTypeStats.value = {};
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
                    } else if (currentSection.value === 'essay') {
                        return questions.value.filter(q => q.type === 'essay');
                    } else if (currentSection.value === 'programming') {
                        return questions.value.filter(q => q.type === 'programming');
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
                    // 如果切换到我的收藏页面，加载收藏数据
                    if (newSection === 'favorites') {
                        loadFavorites();
                    }
                });

                // 监听考试切换，如果当前在收藏页面则重新加载
                watch(currentExam, () => {
                    if (currentSection.value === 'favorites') {
                        loadFavorites();
                    }
                });

                // 方法
                const getTypeLabel = (type) => {
                    const labels = {
                        'judgment': '判断题',
                        'single': '单选题',
                        'multiple': '多选题',
                        'essay': '解答文字题',
                        'code': '编程题'
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

                // 获取解答文字题的答案
                const getEssayAnswer = (questionId) => {
                    return userAnswers.value[questionId] || '';
                };

                // 设置解答文字题的答案
                const setEssayAnswer = (questionId, answer) => {
                    userAnswers.value[questionId] = answer;
                };

                // 设置题目备注（持久化存储）
                // 保存题目备注（存储到数据库，同时备份到localStorage）
                const setQuestionNote = async (questionId, note) => {
                    // 保存光标位置
                    const selection = window.getSelection();
                    let savedRange = null;
                    let noteElement = null;
                    
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        noteElement = document.getElementById(`note-${currentPage.value}-${questionId}`);
                        if (noteElement && noteElement.contains(range.commonAncestorContainer)) {
                            savedRange = range.cloneRange();
                        }
                    }
                    
                    // 更新响应式数据
                    questionNotes.value[questionId] = note;
                    
                    // 恢复光标位置
                    if (savedRange && noteElement) {
                        setTimeout(() => {
                            selection.removeAllRanges();
                            selection.addRange(savedRange);
                        }, 0);
                    }
                    
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

                // 防抖函数（支持取消）
                const debounce = (func, delay = 500) => {
                    let timer = null;
                    const debounced = function(...args) {
                        if (timer) clearTimeout(timer);
                        timer = setTimeout(() => {
                            func.apply(this, args);
                        }, delay);
                    };
                    debounced.cancel = function() {
                        if (timer) {
                            clearTimeout(timer);
                            timer = null;
                        }
                    };
                    return debounced;
                };

                // 保存光标位置
                const saveSelection = () => {
                    const selection = window.getSelection();
                    if (selection.rangeCount === 0) return null;
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    let offset = 0;
                    
                    // 计算光标在文本中的偏移量
                    const treeWalker = document.createTreeWalker(
                        container.ownerDocument.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    
                    while (treeWalker.nextNode()) {
                        if (treeWalker.currentNode === range.startContainer) {
                            offset += range.startOffset;
                            break;
                        }
                        offset += treeWalker.currentNode.textContent.length;
                    }
                    
                    return offset;
                };

                // 恢复光标位置
                const restoreSelection = (element, offset) => {
                    if (!element || offset === null) return;
                    
                    const treeWalker = document.createTreeWalker(
                        element,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    
                    let currentOffset = 0;
                    while (treeWalker.nextNode()) {
                        const nodeLength = treeWalker.currentNode.textContent.length;
                        if (currentOffset + nodeLength >= offset) {
                            const range = document.createRange();
                            range.setStart(treeWalker.currentNode, offset - currentOffset);
                            range.collapse(true);
                            
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            break;
                        }
                        currentOffset += nodeLength;
                    }
                };

                // 富文本备注输入处理（带防抖）
                const debouncedSetNote = debounce((questionId, content) => {
                    setQuestionNote(questionId, content);
                }, 800);

                // 防抖保存到数据库的函数
                const debouncedSaveToDb = debounce(async (questionId, note) => {
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
                }, 800);

                const onNoteInput = (questionId, event) => {
                    const content = event.target.innerHTML;
                    // 直接保存到 localStorage（不更新响应式数据，避免光标闪烁）
                    const notes = JSON.parse(localStorage.getItem('questionNotes') || '{}');
                    notes[questionId] = content;
                    localStorage.setItem('questionNotes', JSON.stringify(notes));
                    // 使用防抖延迟保存到数据库（不更新响应式数据）
                    debouncedSaveToDb(questionId, content);
                };

                // 初始化备注内容（在聚焦时触发，避免v-html导致光标问题）
                const initNoteContent = (questionId, event) => {
                    const element = event.target;
                    // 只在内容为空且有保存的备注时初始化
                    if (element.innerHTML.trim() === '' || element.innerHTML === '<br>') {
                        const savedNote = questionNotes.value[questionId] || '';
                        if (savedNote) {
                            element.innerHTML = savedNote;
                        }
                    }
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
                            // 取消之前的防抖保存，确保图片内容不会被覆盖
                            debouncedSaveToDb.cancel();
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

                // 解析字段相关函数
                const insertExplanationImage = (questionId) => {
                    const input = document.getElementById(`explanation-image-upload-${questionId}`);
                    if (input) {
                        input.click();
                    }
                };

                const handleExplanationImageUpload = async (questionId, event) => {
                    const file = event.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const explanationContent = document.getElementById(`explanation-${questionId}`);
                        if (explanationContent) {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'note-image';
                            img.style.maxWidth = '100%';
                            img.style.height = 'auto';
                            explanationContent.appendChild(img);
                            // 不再直接更新editForm.explanation，避免光标位置丢失
                            // 解析内容将在保存时从DOM获取
                        }
                    };
                    reader.readAsDataURL(file);

                    // 重置input
                    event.target.value = '';
                };

                const onExplanationInput = () => {
                    // 输入时不更新editForm.explanation，避免v-html重新渲染导致光标位置丢失
                    // 解析内容将在保存时从DOM获取
                };

                const onExplanationPaste = (event) => {
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
                                        // 不再直接更新editForm.explanation，避免光标位置丢失
                                        // 解析内容将在保存时从DOM获取
                                    }
                                };
                                reader.readAsDataURL(file);
                            }
                        }
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
                    
                    console.log('========== loadQuestionNotes 被调用 ==========');
                    console.log('currentUser.value:', currentUser.value);
                    console.log('currentExam.value:', currentExam.value);
                    
                    if (currentUser.value?.openid && currentExam.value) {
                        try {
                            console.log('调用 /api/notes, 参数:', {
                                openid: currentUser.value.openid,
                                exam_code: currentExam.value
                            });
                            const data = await apiGet('/api/notes', {
                                openid: currentUser.value.openid,
                                exam_code: currentExam.value
                            });
                            if (data.success && data.data && data.data.length > 0) {
                                const notesMap = {};
                                data.data.forEach(item => {
                                    notesMap[item.question_id] = item.note;
                                });
                                // 合并数据库和本地的备注，避免覆盖用户已添加的备注
                                questionNotes.value = { ...notesMap, ...questionNotes.value };
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

                // 切换所有答案的显示状态
                const toggleAllAnswers = () => {
                    const newState = !allAnswersShown.value;
                    questions.value.forEach(q => {
                        showAnswers.value = { ...showAnswers.value, [q.id]: newState };
                    });
                };

                // 判断是否所有答案都已显示
                const allAnswersShown = computed(() => {
                    if (questions.value.length === 0) return false;
                    return questions.value.every(q => showAnswers.value[q.id] === true);
                });

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

                // 模拟考试 - 生成试卷（从考试指南获取题型分布）
                const generateExamPaper = () => {
                    const judgmentQuestions = questions.value.filter(q => q.type === 'judgment');
                    const singleQuestions = questions.value.filter(q => q.type === 'single');
                    const multipleQuestions = questions.value.filter(q => q.type === 'multiple');
                    
                    // 从考试指南获取题型分布，如果没有则使用默认值
                    let judgmentCount = 40;
                    let singleCount = 140;
                    let multipleCount = 10;
                    
                    if (guideData.value && guideData.value.questionTypeDistribution && Array.isArray(guideData.value.questionTypeDistribution)) {
                        guideData.value.questionTypeDistribution.forEach(item => {
                            if (item.type === '判断题') {
                                judgmentCount = item.count || 40;
                            } else if (item.type === '单选题') {
                                singleCount = item.count || 140;
                            } else if (item.type === '多选题') {
                                multipleCount = item.count || 10;
                            }
                        });
                    }
                    
                    console.log('模拟考试题目数量配置:', { judgmentCount, singleCount, multipleCount });
                    
                    // 随机抽取题目，按判断题、单选题、多选题顺序排列
                    const shuffledJudgment = shuffleArray([...judgmentQuestions]).slice(0, judgmentCount);
                    const shuffledSingle = shuffleArray([...singleQuestions]).slice(0, singleCount);
                    const shuffledMultiple = shuffleArray([...multipleQuestions]).slice(0, multipleCount);
                    
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
                    console.log('========== loadFavorites 被调用 ==========');
                    console.log('isLoggedIn:', isLoggedIn.value);
                    console.log('currentUser:', currentUser.value);
                    console.log('currentUser.openid:', currentUser.value?.openid);
                    
                    if (!isLoggedIn.value || !currentUser.value.openid) {
                        console.log('未登录或openid为空，跳过加载收藏');
                        return;
                    }
                    
                    favoritesLoading.value = true;
                    console.log('开始调用getFavorites，参数：openid=', currentUser.value.openid, ', exam_code=', currentExam.value);
                    const result = await getFavorites(currentUser.value.openid, currentExam.value);
                    console.log('getFavorites返回结果:', result);
                    if (result.success) {
                        favoritesQuestions.value = result.data;
                        favoriteQuestionIds.value = result.data.map(q => q.id);
                        console.log('成功加载收藏，共', favoritesQuestions.value.length, '条');
                    } else {
                        console.log('加载收藏失败:', result.message);
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
                    // 注意：不再清空questionNotes，备注是用户重要数据，应保留
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
                    toggleAllAnswers,
                    allAnswersShown,
                    navItems,
                    questions,
                    questionTypes,
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
                    getEssayAnswer,
                    setEssayAnswer,
                    submitAnswers,
                    submitSingleQuestion,
                    resetSingleQuestion,
                    setQuestionNote,
                    getQuestionNote,
                    onNoteInput,
                    initNoteContent,
                    insertImage,
                    handleImageUpload,
                    onNotePaste,
                    clearNote,
                    // 解析字段图片上传相关
                    insertExplanationImage,
                    handleExplanationImageUpload,
                    onExplanationInput,
                    onExplanationPaste,
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
                    addExamContent,
                    removeExamContent,
                    addQuestionType,
                    removeQuestionType,
                    // 备考备注相关
                    guideNotes,
                    saveGuideNotes,
                    clearGuideNotes,
                    // 题库列表
                    exams,
                    // 导入题库相关
                    importContent,
                    importExamCode,
                    importExamName,
                    importQuestionType,
                    importLoading,
                    importResult,
                    importSuccess,
                    isExamCodeManualInput,
                    markExamCodeFromDropdown,
                    markExamCodeFromInput,
                    handleImport,
                    clearImport,
                    getImportContent,
                    // 图片上传相关（导入题库用）
                    uploadedImages,
                    imageUploadRef,
                    importContentRef,
                    imageSize,
                    triggerImageUpload,
                    handleImportImageUpload,
                    handleImportImageDrop,
                    handleImportPaste,
                    removeImage,
                    insertImageTag,
                    loadKnowledgePoints,
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
                    closeFavoritesModal,
                    // 编辑题目相关
                    showEditQuestionModal,
                    editLoading,
                    editForm,
                    openEditQuestion,
                    closeEditQuestion,
                    addOption,
                    removeOption,
                    saveEditQuestion,
                    deleteQuestion,
                    deleteExam,
                    // 刷新题库相关
                    loadQuestions
                };
}

export function useExamApp() {
    if (!instance) {
        instance = createInstance();
    }
    return instance;
}
