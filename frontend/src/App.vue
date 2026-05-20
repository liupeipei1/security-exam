<template>
    <div class="container" >
        <div class="header">
            <h1>📚 {{ currentBankName }}</h1>
            <p>理论知识在线复习题库</p>
            
            <!-- 题库选择器 -->
            <div class="bank-selector">
                <select v-model="currentBank" @change="switchBank(currentBank)" class="bank-select">
                    <option v-for="bank in banks" :key="bank.bank_code" :value="bank.bank_code">
                        {{ bank.icon }} {{ bank.bank_name }}
                    </option>
                </select>
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
                            <p>📌 考试时长：90分钟</p>
                            <p>📌 题目数量：共190题</p>
                            <p>   - 判断题：40题</p>
                            <p>   - 单选题：140题</p>
                            <p>   - 多选题：10题</p>
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
                            <p>{{ question.explanation }}</p>
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
                        
                        <button class="submit-btn" @click="submitAnswers">提交答案</button>
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

                    <div class="knowledge-card">
                        <h3>1. 信息安全基础概念</h3>
                        <p>信息安全是指保护信息系统的硬件、软件及相关数据，使其不受到偶然的或者恶意的原因而遭到破坏、更改、泄露，保证信息系统能够连续、可靠、正常地运行。</p>
                        <ul>
                            <li><strong>保密性</strong>：确保信息不被未授权的个人、实体或过程访问或披露</li>
                            <li><strong>完整性</strong>：保护信息的准确性和完整性，防止未经授权的修改</li>
                            <li><strong>可用性</strong>：确保授权用户在需要时能够访问所需的信息</li>
                            <li><strong>可控性</strong>：对信息的传播及内容具有控制能力</li>
                            <li><strong>不可否认性</strong>：确保信息的发送者和接收者无法否认其行为</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>2. 网络安全威胁类型</h3>
                        <p>网络安全威胁是指对网络系统造成危害的各种潜在因素，主要包括以下类型：</p>
                        <ul>
                            <li><strong>恶意软件</strong>：病毒、蠕虫、木马、勒索软件等</li>
                            <li><strong>网络攻击</strong>：DDoS攻击、SQL注入、跨站脚本攻击(XSS)等</li>
                            <li><strong>社会工程学</strong>：钓鱼攻击、 pretexting、肩窥等</li>
                            <li><strong>内部威胁</strong>：员工误操作、恶意内部人员</li>
                            <li><strong>物理攻击</strong>：设备盗窃、未授权访问机房等</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>3. 访问控制技术</h3>
                        <p>访问控制是信息安全的重要组成部分，用于限制对系统资源的访问。</p>
                        <ul>
                            <li><strong>自主访问控制(DAC)</strong>：资源所有者决定谁可以访问</li>
                            <li><strong>强制访问控制(MAC)</strong>：基于安全标签的强制性控制</li>
                            <li><strong>基于角色的访问控制(RBAC)</strong>：根据角色分配权限</li>
                            <li><strong>最小权限原则</strong>：只授予完成工作所需的最小权限</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>4. 加密技术基础</h3>
                        <p>加密技术是保护数据安全的核心手段，分为对称加密和非对称加密。</p>
                        <ul>
                            <li><strong>对称加密</strong>：加密和解密使用相同密钥，如AES、DES</li>
                            <li><strong>非对称加密</strong>：使用公钥和私钥配对，如RSA、ECC</li>
                            <li><strong>哈希函数</strong>：生成固定长度的消息摘要，如MD5、SHA-256</li>
                            <li><strong>数字签名</strong>：用于验证数据完整性和身份认证</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>5. 安全管理体系</h3>
                        <p>信息安全管理体系(ISMS)是组织整体管理体系的一部分，基于业务风险方法建立、实施、运行、监视、评审、维护和改进信息安全。</p>
                        <ul>
                            <li><strong>ISO 27001</strong>：信息安全管理体系国际标准</li>
                            <li><strong>风险评估</strong>：识别、分析和评价信息安全风险</li>
                            <li><strong>安全策略</strong>：组织信息安全的方针和原则</li>
                            <li><strong>安全审计</strong>：定期检查安全措施的有效性</li>
                        </ul>
                    </div>
                </div>

                <!-- 考试指南 -->
                <div v-if="currentSection === 'guide'" class="knowledge-section active">
                    <div class="quiz-header">
                        <div class="quiz-title">📋 考试指南</div>
                    </div>

                    <div class="knowledge-card">
                        <h3>考试概述</h3>
                        <p>网络与信息安全管理员（三级）考试分为理论知识考试和操作技能考核两部分。</p>
                        <ul>
                            <li><strong>理论知识考试</strong>：采用闭卷笔试或机考方式，满分100分，60分合格</li>
                            <li><strong>操作技能考核</strong>：现场实际操作或模拟操作，满分100分，60分合格</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>考试内容</h3>
                        <ul>
                            <li><strong>信息安全基础</strong>：信息安全概念、安全模型、安全框架</li>
                            <li><strong>网络安全技术</strong>：网络协议、防火墙、入侵检测、VPN</li>
                            <li><strong>操作系统安全</strong>：Windows、Linux安全配置</li>
                            <li><strong>数据安全</strong>：数据分类、数据加密、数据备份</li>
                            <li><strong>安全管理</strong>：安全策略、风险评估、安全审计</li>
                            <li><strong>法律法规</strong>：网络安全法、个人信息保护法等</li>
                        </ul>
                    </div>

                    <div class="knowledge-card">
                        <h3>备考建议</h3>
                        <ul>
                            <li>系统学习信息安全基础知识</li>
                            <li>熟悉常见安全工具和技术</li>
                            <li>多做模拟练习题</li>
                            <li>关注最新安全动态和威胁趋势</li>
                            <li>理解安全原理而非死记硬背</li>
                        </ul>
                    </div>
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
    </div>

</template>

<script setup>
import './assets/legacy.css'
import './config/wechat.js'
import { useExamApp } from './composables/useExamApp.js'

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
  loading,
  banks,
  currentBank,
  currentBankName,
  switchBank,
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
  examMode
} = useExamApp()
</script>
