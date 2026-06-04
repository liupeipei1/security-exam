<template>
    <div class="container" >
        <div class="header">
            <h1>📚 {{ currentExamName }}</h1>
            <p>理论知识在线复习题库</p>
            
            <!-- 题库选择器 -->
            <div class="bank-selector">
                <select id="bank-select" v-model="currentExam" @change="handleExamChange" class="bank-select">
                    <option v-for="exam in exams" :key="exam.exam_code" :value="exam.exam_code">
                        {{ exam.icon }} {{ exam.exam_name }}
                    </option>
                </select>
                <button 
                    class="delete-exam-btn" 
                    @click="handleDeleteExam"
                    :disabled="exams.length === 0"
                    title="删除当前题库"
                >
                    🗑️ 删除题库
                </button>
            </div>
            
            <!-- 用户信息区域 -->
            <div class="user-info">
                <template v-if="isLoggedIn">
                    <div class="user-avatar" @click="showUserMenu = !showUserMenu">
                        {{ currentUser.nickname ? currentUser.nickname.charAt(0) : '👤' }}
                    </div>
                    <span class="user-name">{{ currentUser.nickname || '用户' }}</span>
                    <button class="logout-btn" @click="logout">退出登录</button>
                </template>
                <template v-else>
                    <button class="login-btn" @click="showLoginModal = true">🔐 登录</button>
                </template>
            </div>
        </div>

        <div class="main-content">
            <div class="sidebar">
                <h3>📚 学习导航</h3>
                <ul class="nav-list">
                    <li 
                        v-for="item in navItems" 
                        :key="item.id"
                        class="nav-item"
                        :class="{ active: currentSection === item.id }"
                        @click="currentSection = item.id"
                    >
                        <span class="icon">{{ item.icon }}</span>
                        <span>{{ item.name }}</span>
                    </li>

                </ul>

                <div class="stats">
                    <div class="stat-item">
                        <span>总题数</span>
                        <strong>{{ totalQuestions }}</strong>
                    </div>
                    <div class="stat-item">
                        <span>已答题</span>
                        <strong>{{ answeredCount }}</strong>
                    </div>
                    <div class="stat-item">
                        <span>正确数</span>
                        <strong>{{ correctCount }}</strong>
                    </div>
                    <div class="stat-item">
                        <span>正确率</span>
                        <strong>{{ accuracyRate }}%</strong>
                    </div>
                </div>
            </div>

            <div class="content-area">
                <!-- 模拟考试 -->
                <div v-if="currentSection === 'exam'" class="exam-section">
                    <div class="exam-header">
                        <div class="exam-title">🎯 模拟考试</div>
                        <div v-if="examStarted" class="exam-timer" :class="{ 'warning': examTimeLeft < 300 }">
                            ⏱️ 剩余时间: {{ formatTime(examTimeLeft) }}
                        </div>
                    </div>
                    
                    <!-- 考试开始界面 -->
                    <div v-if="!examStarted" class="exam-start-panel">
                        <h2>📝 模拟考试说明</h2>
                        <div class="exam-info-list">
                            <p>📌 考试时长：{{ currentExamConfig.exam_duration }}分钟</p>
                            <p>📌 题目数量：共{{ currentExamConfig.total_questions }}题</p>
                            <p v-if="currentExamConfig.judgment_count > 0">   - 判断题：{{ currentExamConfig.judgment_count }}题</p>
                            <p v-if="currentExamConfig.single_count > 0">   - 单选题：{{ currentExamConfig.single_count }}题</p>
                            <p v-if="currentExamConfig.multiple_count > 0">   - 多选题：{{ currentExamConfig.multiple_count }}题</p>
                            <p>📌 题型随机排列，每题作答后不可修改</p>
                            <p>📌 时间结束自动提交</p>
                        </div>
                        <button class="start-exam-btn" @click="startExam">开始考试</button>
                    </div>
                    
                    <!-- 考试进行中 -->
                    <div v-else-if="!examShowResult" class="exam-content">
                        <div v-for="(question, index) in examQuestions" :key="question.id" class="exam-question-card">
                            <div class="exam-question-header">
                                <span class="exam-question-number">第 {{ index + 1 }} 题</span>
                                <span class="exam-question-type" :class="question.type">{{ getTypeLabel(question.type) }}</span>
                            </div>
                            <div class="exam-question-text">{{ question.question }}</div>
                            <ul class="exam-options-list">
                                <li 
                                    v-for="(option, optIndex) in question.options" 
                                    :key="optIndex"
                                    class="exam-option-item"
                                    :class="{ selected: isExamSelected(question.id, optIndex) }"
                                    @click="selectExamOption(question.id, optIndex)"
                                >
                                    <span class="exam-option-label">{{ getOptionLabel(optIndex) }}</span>
                                    <span class="exam-option-text">{{ option }}</span>
                                </li>
                            </ul>
                        </div>
                        <div class="exam-submit-panel">
                            <button class="exit-exam-btn" @click="exitExam">退出考试</button>
                            <button class="submit-exam-btn" @click="submitExam">提交试卷</button>
                        </div>
                    </div>
                    
                    <!-- 考试结果 -->
                    <div v-else class="exam-result-panel">
                        <h2>🎉 考试完成！</h2>
                        <div class="exam-score-display">
                            <div class="score-circle">
                                <span class="score-value">{{ examScore }}</span>
                                <span class="score-label">分</span>
                            </div>
                        </div>
                        <div class="exam-stats">
                            <p>📊 总题数：{{ examQuestions.length }} 题</p>
                            <p>✅ 正确数：{{ Math.round((examScore / 100) * examQuestions.length) }} 题</p>
                            <p>❌ 错误数：{{ examQuestions.length - Math.round((examScore / 100) * examQuestions.length) }} 题</p>
                            <p>⏱️ 用时：{{ formatTime(5400 - examTimeLeft) }}</p>
                        </div>
                        <div class="exam-answers-review">
                            <h3>📝 答题详情</h3>
                            <div v-for="(question, index) in examQuestions" :key="question.id" class="exam-review-card">
                                <div class="review-header">
                                    <span class="review-number">第 {{ index + 1 }} 题</span>
                                    <span :class="isExamCorrectAnswer(question.id) ? 'review-correct' : 'review-incorrect'">
                                        {{ isExamCorrectAnswer(question.id) ? '✓ 正确' : '✗ 错误' }}
                                    </span>
                                </div>
                                <div class="review-question">{{ question.question }}</div>
                                <div class="review-answers">
                                    <p><strong>你的答案：</strong>{{ getExamUserAnswerText(question.id) }}</p>
                                    <p><strong>正确答案：</strong>{{ question.answer.join(', ') }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="exam-result-actions">
                            <button class="restart-exam-btn" @click="startExam">再考一次</button>
                            <button class="back-to-menu-btn" @click="exitExam">返回首页</button>
                        </div>
                    </div>
                </div>

                <!-- 题库测试 -->
                <div v-if="currentSection === 'single' || currentSection === 'multiple' || currentSection === 'judgment'" class="quiz-section">
                    <div class="quiz-header">
                        <div class="quiz-title">
                            {{ currentSection === 'single' ? '⭕ 单选题' : currentSection === 'multiple' ? '☑️ 多选题' : '✓✗ 判断题' }}
                        </div>
                        <div class="quiz-info">
                            <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
                            <span>共 {{ totalQuestions }} 题</span>
                        </div>
                    </div>

                    <div 
                        v-for="question in currentPageQuestions" 
                        :key="question.id" 
                        class="question-card"
                    >
                        <div class="question-header">
                            <span 
                                class="question-type" 
                                :class="question.type"
                            >
                                {{ getTypeLabel(question.type) }}
                            </span>
                            <span class="question-number">第 {{ getQuestionIndex(question.id) }} 题</span>
                            <div class="question-actions-header">
                                <button 
                                    class="edit-btn"
                                    @click.stop="openEditQuestion(question)"
                                    title="编辑题目"
                                >
                                    ✏️
                                </button>
                                <button 
                                    class="delete-btn"
                                    @click.stop="deleteQuestion(question)"
                                    title="删除题目"
                                >
                                    🗑️
                                </button>
                                <button 
                                    class="favorite-btn"
                                    :class="{ 'favorited': isQuestionFavorite(question.id) }"
                                    @click.stop="toggleFavorite(question.id)"
                                    title="收藏题目"
                                >
                                    {{ isQuestionFavorite(question.id) ? '❤️' : '🤍' }}
                                </button>
                            </div>
                        </div>
                        <div class="question-text">{{ question.question }}</div>
                        
                        <ul class="options-list">
                            <li 
                                v-for="(option, index) in question.options" 
                                :key="index"
                                class="option-item"
                                :class="{ 
                                    selected: isSelected(question.id, index),
                                    correct: (examMode ? showResult : showAnswers[question.id]) && isCorrectOption(question.id, index),
                                    incorrect: (examMode ? showResult : showAnswers[question.id]) && isSelected(question.id, index) && !isCorrectOption(question.id, index)
                                }"
                                @click="selectOption(question.id, index)"
                            >
                                <span class="option-label">{{ getOptionLabel(index) }}</span>
                                <span class="option-text">{{ option }}</span>
                            </li>
                        </ul>

                        <div v-if="examMode ? showResult : showAnswers[question.id]" class="correct-answer">
                            <h4>✅ 正确答案</h4>
                            <p>{{ formatAnswer(question) }}</p>
                        </div>

                        <div v-if="examMode ? showResult : showAnswers[question.id]" class="answer-explanation">
                            <h4>💡 解析</h4>
                            <textarea 
                                class="explanation-input"
                                :value="getQuestionExplanation(question)"
                                @input="setQuestionExplanation(question.id, $event.target.value)"
                                placeholder="在此输入解析内容..."
                            ></textarea>
                        </div>

                        <!-- 备注输入框 -->
                        <div class="question-note">
                            <label class="note-label">📝 备注记录</label>
                            <div class="note-wrapper">
                                <div class="note-toolbar">
                                    <button 
                                        type="button" 
                                        title="插入图片"
                                        @click="insertImage(question.id)"
                                    >
                                        📷
                                    </button>
                                    <button 
                                        type="button" 
                                        title="清空备注"
                                        @click="clearNote(question.id)"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                <div 
                                    :id="'note-' + currentPage + '-' + question.id"
                                    class="note-content"
                                    contenteditable="true"
                                    data-placeholder="在此输入您的备注，支持文字和图片，方便后续复习..."
                                    @input="onNoteInput(question.id, $event)"
                                    @paste="onNotePaste($event)"
                                    v-html="getQuestionNote(question.id)"
                                ></div>
                                <input 
                                    type="file" 
                                    :id="'image-upload-' + question.id"
                                    class="image-upload-input"
                                    accept="image/*"
                                    style="display: none;"
                                    @change="handleImageUpload(question.id, $event)"
                                />
                            </div>
                        </div>

                        <!-- 单题提交按钮 -->
                        <div class="question-actions">
                            <button 
                                class="submit-single-btn" 
                                :class="{ 'submitted': showAnswers[question.id] }"
                                @click="submitSingleQuestion(question.id)"
                            >
                                {{ showAnswers[question.id] ? '✓ 已提交' : '提交答案' }}
                            </button>
                            <button 
                                v-if="showAnswers[question.id]"
                                class="reset-single-btn"
                                @click="resetSingleQuestion(question.id)"
                            >
                                🔄 重置
                            </button>
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <!-- 模式切换按钮 -->
                        <button 
                            class="mode-btn" 
                            :class="{ 'exam-mode': examMode }"
                            @click="examMode = !examMode"
                        >
                            {{ examMode ? '🎯 考试模式' : '📚 背题模式' }}
                        </button>
                        
                        <!-- 背题模式下显示答案按钮 -->
                        <button 
                            v-if="!examMode"
                            class="show-answer-btn" 
                            @click="showAnswers = !showAnswers"
                        >
                            {{ showAnswers ? '隐藏答案' : '显示答案' }}
                        </button>
                        
                        <button class="submit-btn" @click="submitAnswers">提交全部答案</button>
                        <button class="reset-btn" @click="resetAnswers">重置答题</button>
                    </div>

                    <div class="pagination">
                        <button 
                            class="page-btn"
                            :disabled="currentPage === 1"
                            @click="currentPage = currentPage - 1"
                        >
                            ⬅️ 上一页
                        </button>
                        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
                        <div class="jump-box">
                            <input 
                                id="jump-page-input"
                                type="number" 
                                v-model.number="jumpPage"
                                min="1" 
                                :max="totalPages"
                                class="jump-input"
                                placeholder="页码"
                                @keyup.enter="goToPage"
                            />
                            <button class="jump-btn" @click="goToPage">跳转</button>
                        </div>
                        <button 
                            class="page-btn"
                            :disabled="currentPage === totalPages"
                            @click="currentPage = currentPage + 1"
                        >
                            下一页 ➡️
                        </button>
                    </div>
                </div>

                <!-- 答题记录 -->
                <div v-if="currentSection === 'history'" class="history-section">
                    <div class="quiz-header">
                        <div class="quiz-title">📊 答题记录</div>
                        <div class="history-actions">
                            <button @click="exportHistory" class="action-btn export-btn">
                                📥 导出记录
                            </button>
                            <button @click="clearAllHistory" class="action-btn clear-btn">
                                🗑️ 清空记录
                            </button>
                        </div>
                    </div>

                    <div v-if="getQuizHistory().length === 0" class="empty-state">
                        <div class="empty-icon">📝</div>
                        <p>暂无答题记录</p>
                        <button @click="currentSection = 'quiz'" class="start-btn">
                            开始答题
                        </button>
                    </div>

                    <div v-else class="history-list">
                        <div class="history-stats">
                            <div class="stat-item">
                                <span class="stat-label">总答题次数</span>
                                <span class="stat-value">{{ getQuizHistory().length }}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">平均分</span>
                                <span class="stat-value">{{ Math.round(getQuizHistory().reduce((sum, r) => sum + r.score, 0) / getQuizHistory().length) }}分</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">最高分</span>
                                <span class="stat-value">{{ Math.max(...getQuizHistory().map(r => r.score)) }}分</span>
                            </div>
                        </div>

                        <div v-for="record in getQuizHistory()" :key="record.id" class="history-card">
                            <div class="record-header">
                                <div class="record-score" :class="record.score >= 60 ? 'pass' : 'fail'">
                                    {{ record.score }}分
                                </div>
                                <button @click="deleteRecord(record.id)" class="delete-btn" title="删除记录">
                                    ✕
                                </button>
                            </div>
                            <div class="record-info">
                                <div class="record-time">{{ record.timestamp }}</div>
                                <div class="record-detail">
                                    正确 {{ record.correctCount }} / 总题 {{ record.totalQuestions }}
                                    ({{ record.answeredCount }} 题已答)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 知识要点 -->
                <div v-if="currentSection === 'knowledge'" class="knowledge-section active">
                    <div class="quiz-header">
                        <div class="quiz-title">📖 知识要点</div>
                    </div>

                    <!-- 加载状态 -->
                    <div v-if="knowledgeLoading" class="loading">
                        <div class="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>

                    <!-- 知识要点列表 -->
                    <template v-else>
                        <div 
                            v-for="(point, index) in knowledgePoints" 
                            :key="point.id" 
                            class="knowledge-card"
                        >
                            <h3>{{ point.title }}</h3>
                            <div v-html="point.content"></div>
                        </div>

                        <!-- 无数据提示 -->
                        <div v-if="knowledgePoints.length === 0" class="empty-state">
                            <p>暂无知识要点</p>
                        </div>
                    </template>
                </div>

                <!-- 考试指南 -->
                <div v-if="currentSection === 'guide'" class="knowledge-section active">
                    <div class="quiz-header">
                        <div class="quiz-title">📋 考试指南</div>
                        <div v-if="guideData.title" class="header-actions">
                            <button v-if="!guideEditing" @click="guideEditing = true; initGuideForm()" class="edit-btn">✏️ 编辑</button>
                            <template v-else>
                                <button @click="saveGuide" class="save-btn">💾 保存</button>
                                <button @click="cancelEdit" class="cancel-btn">❌ 取消</button>
                            </template>
                        </div>
                    </div>

                    <div v-if="guideLoading" class="loading-container">
                        <span class="loading-spinner"></span>
                        <p>加载中...</p>
                    </div>

                    <template v-else>
                        <div v-if="guideData.title" class="knowledge-card">
                            <h2>{{ guideData.title }}</h2>
                        </div>

                        <div v-if="guideData.examOverview" class="knowledge-card">
                            <h3>📝 考试概述</h3>
                            <textarea 
                                v-if="guideEditing" 
                                v-model="guideForm.examOverview" 
                                class="guide-textarea"
                            ></textarea>
                            <p v-else>{{ guideData.examOverview }}</p>
                        </div>

                        <div v-if="guideData.examContent && guideData.examContent.length > 0" class="knowledge-card">
                            <h3>📚 考试内容</h3>
                            <div v-if="guideEditing">
                                <div v-for="(item, index) in guideForm.examContent" :key="index" class="edit-item-row">
                                    <input v-model="guideForm.examContent[index]" class="guide-input" />
                                    <button @click="removeExamContent(index)" class="remove-btn">-</button>
                                </div>
                                <button @click="addExamContent" class="add-btn">+ 添加内容</button>
                            </div>
                            <ul v-else>
                                <li v-for="(item, index) in guideData.examContent" :key="index">
                                    {{ item }}
                                </li>
                            </ul>
                        </div>

                        <div v-if="guideData.questionTypeDistribution" class="knowledge-card">
                            <h3>📊 题型分布</h3>
                            <div v-if="Array.isArray(guideData.questionTypeDistribution)">
                                <div v-if="guideEditing">
                                    <div v-for="(item, index) in guideForm.questionTypeDistribution" :key="index" class="edit-item-row">
                                        <input v-model="item.type" placeholder="题型" class="guide-input small" />
                                        <input v-model.number="item.count" type="number" placeholder="题数" class="guide-input small" />
                                        <input v-model.number="item.score" type="number" placeholder="分值" class="guide-input small" />
                                        <button @click="removeQuestionType(index)" class="remove-btn">-</button>
                                    </div>
                                    <button @click="addQuestionType" class="add-btn">+ 添加题型</button>
                                </div>
                                <table v-else class="question-type-table">
                                    <thead>
                                        <tr>
                                            <th>题型</th>
                                            <th>题数</th>
                                            <th>分值</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(item, index) in guideData.questionTypeDistribution" :key="index">
                                            <td>{{ item.type }}</td>
                                            <td>{{ item.count }}题</td>
                                            <td>{{ item.score }}分</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div class="total-score">
                                    <strong>总分：</strong>
                                    {{ guideData.questionTypeDistribution.reduce((sum, item) => sum + item.score, 0) }}分
                                </div>
                            </div>
                            <div v-else>
                                <textarea v-if="guideEditing" v-model="guideForm.questionTypeDistribution" class="guide-textarea"></textarea>
                                <p v-else>{{ guideData.questionTypeDistribution }}</p>
                            </div>
                        </div>

                        <div v-if="guideData.preparationTips && guideData.preparationTips.length > 0" class="knowledge-card">
                            <h3>📚 备考建议</h3>
                            <div v-if="guideEditing">
                                <div v-for="(tip, index) in guideForm.preparationTips" :key="index" class="edit-item-row">
                                    <div class="tip-editor">
                                        <div class="tip-content" contenteditable="true" @input="updateTip(index, $event)">
                                            {{ guideForm.preparationTips[index] }}
                                        </div>
                                        <button @click="removeTip(index)" class="remove-btn">-</button>
                                    </div>
                                </div>
                                <button @click="addTip" class="add-btn">+ 添加建议</button>
                            </div>
                            <ul v-else>
                                <li v-for="(tip, index) in guideData.preparationTips" :key="index">
                                    {{ tip }}
                                </li>
                            </ul>
                        </div>

                        <!-- 备考备注组件 -->
                        <GuideNotes v-if="!guideEditing" />

                        <div v-if="!guideData.title" class="knowledge-card">
                            <p>暂无考试指南信息</p>
                        </div>
                    </template>

                    <!-- 保存成功提示 -->
                    <div v-if="guideSaved" class="save-success">✓ 保存成功</div>
                </div>

                <!-- 导入题库 -->
                <div v-if="currentSection === 'import'" class="import-section">
                    <div class="quiz-header">
                        <div class="quiz-title">📥 导入题库</div>
                    </div>
                    
                    <div class="import-container">
                        <div class="import-form">
                            <div class="form-group">
                                <label>📝 题目内容（支持批量导入）</label>
                                <textarea 
                                    v-model="importContent" 
                                    class="import-textarea"
                                    placeholder="请输入题目内容，格式如下：

1. 题目内容
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案：A
解析：这是解析内容

2. 判断题示例
正确
错误
答案：正确
解析：这是判断题的解析

3. 多选题示例（答案用逗号分隔）
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案：A,B,C
解析：这是多选题的解析"
                                ></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>🏷️ 默认题型（可选，不选则自动识别）</label>
                                <select v-model="importQuestionType" class="import-select-type">
                                    <option value="">自动识别（2选项=判断题，多答案=多选题）</option>
                                    <option v-for="qType in questionTypes" :key="qType.type_code" :value="qType.type_code">
                                        {{ qType.type_name }}
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>📁 目标题库代码</label>
                                <div class="select-input-container">
                                    <select 
                                        v-model="importExamCode" 
                                        class="import-select"
                                        @change="handleImportExamChange"
                                    >
                                        <option value="">请选择或输入题库代码</option>
                                        <option v-for="exam in exams" :key="exam.exam_code" :value="exam.exam_code">
                                            {{ exam.exam_name }} ({{ exam.exam_code }})
                                        </option>
                                    </select>
                                    <input 
                                        v-model="importExamCode" 
                                        type="text" 
                                        class="import-input editable-select"
                                        placeholder="输入题库代码（如：my_new_bank），若不存在将自动创建"
                                        @input="handleImportExamInput"
                                    />
                                </div>
                            </div>
                            
                            <div class="form-group" v-if="isExamCodeManualInput">
                                <label>🏷️ 题库名称（创建新题库时必填）</label>
                                <input 
                                    v-model="importExamName" 
                                    type="text" 
                                    class="import-input"
                                    placeholder="输入题库显示名称（如：我的新题库）"
                                />
                                <small style="color: #666; font-size: 0.8rem;">如果题库代码不存在，将使用此名称创建新题库</small>
                            </div>
                            
                            <div class="import-actions">
                                <button 
                                    class="import-btn" 
                                    :disabled="!importContent.trim()"
                                    @click="handleImport"
                                >
                                    {{ importLoading ? '导入中...' : '🚀 开始导入' }}
                                </button>
                                <button 
                                    class="clear-btn" 
                                    @click="clearImport"
                                >
                                    🗑️ 清空内容
                                </button>
                            </div>
                            
                            <!-- 导入结果 -->
                            <div v-if="importResult" class="import-result" :class="importSuccess ? 'success' : 'error'">
                                <div class="result-icon">{{ importSuccess ? '✅' : '❌' }}</div>
                                <div class="result-message">{{ importResult }}</div>
                            </div>
                        </div>
                        
                        <div class="import-tips">
                            <h4>💡 格式说明</h4>
                            <ul>
                                <li>每题以数字开头（如：1.、2.）</li>
                                <li>选项以字母开头（如：A.、B.）</li>
                                <li>答案行格式：答案：A 或 答案：A,B,C</li>
                                <li>解析行格式：解析：内容</li>
                                <li>系统会自动识别题型（2个选项为判断题）</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 我的收藏 -->
                <div v-if="currentSection === 'favorites'" class="favorites-section">
                    <div class="quiz-header">
                        <div class="quiz-title">❤️ 我的收藏</div>
                    </div>

                    <!-- 未登录提示 -->
                    <div v-if="!isLoggedIn" class="empty-state">
                        <div class="empty-icon">🔒</div>
                        <p>请先登录以查看收藏</p>
                        <button @click="showLoginModal = true" class="start-btn">
                            去登录
                        </button>
                    </div>

                    <!-- 加载状态 -->
                    <div v-else-if="favoritesLoading" class="loading">
                        <div class="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>

                    <!-- 收藏列表 -->
                    <template v-else>
                        <div v-if="favoritesQuestions.length === 0" class="empty-state">
                            <div class="empty-icon">📭</div>
                            <p>暂无收藏题目</p>
                            <button @click="currentSection = 'judgment'" class="start-btn">
                                开始收藏
                            </button>
                        </div>

                        <div v-else class="favorites-list">
                            <div 
                                v-for="(question, index) in favoritesQuestions" 
                                :key="question.id" 
                                class="question-card"
                            >
                                <div class="question-header">
                                    <span 
                                        class="question-type" 
                                        :class="question.type"
                                    >
                                        {{ getTypeLabel(question.type) }}
                                    </span>
                                    <span class="question-number">第 {{ index + 1 }} 题</span>
                                    <button 
                                        class="favorite-btn favorited"
                                        @click.stop="toggleFavorite(question.id)"
                                        title="取消收藏"
                                    >
                                        ❤️
                                    </button>
                                </div>
                                <div class="question-text">{{ question.question }}</div>
                                
                                <ul class="options-list">
                                    <li 
                                        v-for="(option, optIndex) in question.options" 
                                        :key="optIndex"
                                        class="option-item"
                                        :class="{ 
                                            correct: isCorrectOption(question.id, optIndex)
                                        }"
                                    >
                                        <span class="option-label">{{ getOptionLabel(optIndex) }}</span>
                                        <span class="option-text">{{ option }}</span>
                                    </li>
                                </ul>

                                <div class="correct-answer">
                                    <h4>✅ 正确答案</h4>
                                    <p>{{ formatAnswer(question) }}</p>
                                </div>

                                <div class="answer-explanation">
                                    <h4>💡 解析</h4>
                                    <p>{{ question.explanation || '暂无解析' }}</p>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- 结果弹窗 -->
        <div v-if="showResult" class="overlay" @click="showResult = false"></div>
        <div v-if="showResult" class="result-modal">
            <h2>🎉 测试完成!</h2>
            <div class="score-circle">
                <span>{{ finalScore }}</span>
            </div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="number">{{ correctCount }}</div>
                    <div class="label">正确</div>
                </div>
                <div class="result-stat">
                    <div class="number">{{ answeredCount - correctCount }}</div>
                    <div class="label">错误</div>
                </div>
                <div class="result-stat">
                    <div class="number">{{ totalQuestions - answeredCount }}</div>
                    <div class="label">未答</div>
                </div>
            </div>
            <button @click="closeResult">继续学习</button>
        </div>

        <!-- 登录弹窗 -->
        <div v-if="showLoginModal" class="login-modal-overlay" @click.self="showLoginModal = false">
            <div class="login-modal">
                <button class="login-modal-close" @click="showLoginModal = false">×</button>
                
                <!-- 扫码登录界面 -->
                <div v-if="showQrCodeLogin" class="qr-login-container">
                    <h2>📱 微信扫码登录</h2>
                    <p>使用微信扫描下方二维码</p>
                    <div class="qr-code-wrapper">
                        <div v-if="qrCodeUrl" class="qr-code">
                            <img :src="qrCodeUrl" alt="微信登录二维码">
                        </div>
                        <div v-else class="qr-code-loading">
                            <span class="loading-spinner"></span>
                            <p>正在生成二维码...</p>
                        </div>
                    </div>
                    <p class="qr-tip">请使用微信"扫一扫"功能扫描二维码</p>
                    <button class="back-to-login-btn" @click="showQrCodeLogin = false">返回选择登录方式</button>
                </div>
                
                <!-- 登录方式选择 -->
                <div v-else>
                    <h2>🔐 用户登录</h2>
                    <p>登录后可同步学习进度和答题记录</p>
                    <div class="login-methods">
                        <button 
                            class="login-method-btn wechat" 
                            @click="handleWechatLogin"
                            :disabled="loginLoading"
                        >
                            <span v-if="loginLoading" class="login-loading"></span>
                            <span v-else>📱 微信登录</span>
                        </button>
                        <button 
                            class="login-method-btn qrcode" 
                            @click="handleQrCodeLogin"
                            :disabled="loginLoading"
                        >
                            <span v-if="loginLoading" class="login-loading"></span>
                            <span v-else>🔍 扫码登录</span>
                        </button>
                        <button 
                            class="login-method-btn test" 
                            @click="login('test')"
                            :disabled="loginLoading"
                        >
                            <span v-if="loginLoading" class="login-loading"></span>
                            <span v-else>🧪 测试登录 (test)</span>
                        </button>
                        <button 
                            class="login-method-btn test" 
                            @click="testH5Login"
                            :disabled="loginLoading"
                        >
                            <span v-if="loginLoading" class="login-loading"></span>
                            <span v-else>🔧 测试H5登录流程</span>
                        </button>
                    </div>
                    <div v-if="loginError" class="login-error">{{ loginError }}</div>
                </div>
            </div>
        </div>

        <!-- 编辑题目弹窗 -->
        <div v-if="showEditQuestionModal" class="modal-overlay" @click.self="closeEditQuestion">
            <div class="modal-content edit-question-modal">
                <div class="modal-header">
                    <h3>✏️ 编辑题目</h3>
                    <button class="close-btn" @click="closeEditQuestion">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>题目类型</label>
                        <select v-model="editForm.type" class="form-input">
                            <option v-for="qType in questionTypes" :key="qType.type_code" :value="qType.type_code">
                                {{ qType.type_name }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>知识要点</label>
                        <select v-model="editForm.knowledgePoint" class="form-input">
                            <option value="">请选择知识要点</option>
                            <option v-for="point in knowledgePoints" :key="point.id" :value="point.title">
                                {{ point.title }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>题目内容</label>
                        <textarea 
                            v-model="editForm.question" 
                            class="form-textarea"
                            placeholder="请输入题目内容"
                        ></textarea>
                    </div>
                    <div class="form-group" v-if="editForm.type !== 'judgment'">
                        <label>选项（每行一个）</label>
                        <div class="options-edit-list">
                            <div v-for="(option, index) in editForm.options" :key="index" class="option-edit-item">
                                <span class="option-edit-label">{{ String.fromCharCode(65 + index) }}.</span>
                                <input 
                                    v-model="editForm.options[index]" 
                                    class="form-input option-input"
                                    :placeholder="'选项' + String.fromCharCode(65 + index)"
                                />
                                <button 
                                    v-if="editForm.options.length > 2"
                                    class="remove-option-btn"
                                    @click="removeOption(index)"
                                >✕</button>
                            </div>
                            <button class="add-option-btn" @click="addOption" v-if="editForm.options.length < 10">+ 添加选项</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>正确答案</label>
                        <div class="answer-edit-section">
                            <template v-if="editForm.type === 'judgment'">
                                <label class="answer-option">
                                    <input type="radio" v-model="editForm.answer" value="true" /> 正确
                                </label>
                                <label class="answer-option">
                                    <input type="radio" v-model="editForm.answer" value="false" /> 错误
                                </label>
                            </template>
                            <template v-else-if="editForm.type === 'single'">
                                <label v-for="(option, index) in editForm.options" :key="index" class="answer-option">
                                    <input type="radio" v-model="editForm.singleAnswer" :value="index" /> {{ String.fromCharCode(65 + index) }}
                                </label>
                            </template>
                            <template v-else>
                                <label v-for="(option, index) in editForm.options" :key="index" class="answer-option">
                                    <input type="checkbox" v-model="editForm.multipleAnswers" :value="index" /> {{ String.fromCharCode(65 + index) }}
                                </label>
                            </template>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>解析</label>
                        <textarea 
                            v-model="editForm.explanation" 
                            class="form-textarea"
                            placeholder="请输入解析内容"
                        ></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" @click="closeEditQuestion">取消</button>
                    <button class="save-btn" @click="saveEditQuestion" :disabled="editLoading">
                        {{ editLoading ? '保存中...' : '保存' }}
                    </button>
                </div>
            </div>
        </div>


    </div>

</template>

<script setup>
import './assets/legacy.css'
import './config/wechat.js'
import { ref, onMounted, nextTick } from 'vue'
import { useExamApp } from './composables/useExamApp.js'
import GuideNotes from './components/GuideNotes.vue'

const {
  currentSection,
  currentPage,
  jumpPage,
  showAnswers,
  showResult,
  finalScore,
  userAnswers,
  navItems,
  questions,
  questionTypes,
  loading,
  exams,
  currentExam,
  currentExamName,
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
  isLoggedIn,
  currentUser,
  showLoginModal,
  loginLoading,
  loginError,
  login,
  logout,
  handleWechatLogin,
  testH5Login,
  showQrCodeLogin,
  qrCodeUrl,
  handleQrCodeLogin,
  cleanupQrCodeLogin,
  showUserMenu,
  examMode,
  currentExamConfig,
  knowledgePoints,
  knowledgeLoading,
  guideData,
  guideLoading,
  guideEditing,
  guideForm,
  guideSaved,
  initGuideForm,
  saveGuide,
  cancelEdit,
  addTip,
  addExamContent,
  removeExamContent,
  addQuestionType,
  removeQuestionType,
  // 收藏相关
  favoritesQuestions,
  favoritesLoading,
  showFavoritesModal,
  isQuestionFavorite,
  toggleFavorite,
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
  deleteExam
} = useExamApp()



// 更新备考建议内容
const updateTip = (index, event) => {
  guideForm.preparationTips[index] = event.target.innerText
}

// 处理考试切换
const handleExamChange = async (event) => {
  // 直接从事件对象获取选中的考试代码，确保使用最新值
  const selectedExamCode = event.target.value;
  console.log('handleExamChange called, selected exam code:', selectedExamCode);
  console.log('currentExam.value before switch:', currentExam.value);
  
  // 直接传递选中的值给switchExam
  switchExam(selectedExamCode);
  
  console.log('currentExam.value after switch:', currentExam.value);
}

// 处理删除题库
const handleDeleteExam = async () => {
  const currentExamCode = currentExam.value;
  // exams 是 ref 对象，需要通过 .value 访问数组
  const currentExamData = exams.value.find(exam => exam.exam_code === currentExamCode);
  
  if (currentExamData) {
    await deleteExam(currentExamCode, currentExamData.exam_name);
  }
}

// 处理导入题库选择变化（从下拉框选择）
const handleImportExamChange = (event) => {
  importExamCode.value = event.target.value;
  markExamCodeFromDropdown();
};

// 处理导入题库输入变化（手动输入）
const handleImportExamInput = () => {
  markExamCodeFromInput();
};


</script>
