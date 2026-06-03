const { API_BASE } = require('../../utils/config.js')
const { apiGet, apiPost, addFavorite, removeFavorite, getFavorites, checkFavorite } = require('../../utils/request.js')

Page({
  data: {
    // 用户状态
    isLoggedIn: false,
    isVip: false,
    userInfo: null,
    // 加载状态
    loading: true,
    // 视图状态
    currentView: 'home',
    // 模式切换
    currentMode: 'practice',
    // 当前题型筛选
    currentQuestionType: 'all',
    // 题目数据
    allQuestions: [],
    currentQuestions: [],
    currentQuestionIndex: 0,
    // 当前题目数据（用于模板渲染）
    currentQuestionData: null,
    // 当前选中的答案
    selectedOptions: [],
    // 选中状态标志（用于模板渲染）
    selectedFlags: {},
    // 是否显示答案
    showAnswer: false,
    // 答题记录（保存每个题目的答题状态）
    questionAnswers: {},
    // 统计数据
    answeredCount: 0,
    correctCount: 0,
    // 弹窗状态
    showStatsModal: false,
    showResult: false,
    showLoginModal: false,
    showPayModal: false,
    // 考试配置
    examConfig: {
       judgment: 40,
       single: 140,
       multiple: 10
     },
    // 会员信息
    vipEndTime: null,
    // 价格配置
    priceConfig: {
      monthly: 19.9,
      quarterly: 49.9,
      yearly: 129.9
    },
    // 题库配置
    exams: [],
    currentExam: null,
    examIndex: 0,
    // 收藏相关
    favorites: [],
    showFavoritesModal: false,
    favoritesLoading: false,
    currentFavoriteIds: [],
    // 计算属性（用于模板绑定）
    examQuestionCount: 0,
    progressPercent: 0,
    accuracyRate: 0,
    judgmentCount: 0,
    singleCount: 0,
    multipleCount: 0
  },

  onLoad: function (options) {
    console.log('考试页面加载')
    this.checkLoginStatus()
  },

  onReady: function () {
    console.log('考试页面就绪')
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const that = this
    // 先从本地缓存获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    
    console.log('检查登录状态 - userInfo:', userInfo);
    
    if (userInfo) {
      that.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isVip: true  // 默认设置为VIP，跳过VIP检查
      })
      
      // 直接加载题库，不检查VIP状态
      that.loadExams()
    } else {
      that.setData({
        loading: false,
        isLoggedIn: false
      })
    }
  },

  // 微信登录
  wxLogin: function() {
    const that = this
    
    wx.showLoading({ title: '登录中...' })
    
    wx.login({
      success: function(res) {
        if (res.code) {
          // 发送code到后端获取openid和用户信息
          apiPost('/api/auth/login', { code: res.code, loginType: 'mini' })
            .then(response => {
              wx.hideLoading()
              
              console.log('登录响应数据:', response);
              
              if (response.success) {
                const userData = response.data
                console.log('用户数据:', userData);
                
                // 保存用户信息到本地缓存
                wx.setStorageSync('userInfo', {
                  id: userData.id,
                  openid: userData.openid,
                  nickname: userData.nickname,
                  avatar: userData.avatar,
                  token: userData.token
                })
                // 同时保存到'user' key，供request.js获取token使用
                wx.setStorageSync('user', {
                  id: userData.id,
                  openid: userData.openid,
                  token: userData.token
                })
                // 设置默认VIP状态为true
                wx.setStorageSync('isVip', true)
                
                that.setData({
                  loading: false,
                  isLoggedIn: true,
                  userInfo: {
                    id: userData.id,
                    openid: userData.openid,
                    nickname: userData.nickname,
                    avatar: userData.avatar
                  },
                  isVip: true  // 默认设置为VIP
                })
                
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                })
                
                // 加载题库列表
                that.loadExams()
              } else {
                wx.showToast({
                  title: response.message || '登录失败',
                  icon: 'none'
                })
              }
            })
            .catch(err => {
              wx.hideLoading()
              console.error('登录请求失败', err)
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              })
            })
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '获取登录码失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        wx.hideLoading()
        console.error('微信登录失败', err)
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    })
  },

  // 加载题库列表
  loadExams: function() {
    const that = this
    console.log('exams 被调用')
    apiGet('/api/exams')
      .then(res => {
        console.log('加载题库列表成功:', res)
        if (res.success && res.data && res.data.length > 0) {
          const exams = res.data
          // 默认选择第一个题库
          const defaultExam = exams.find(b => b.is_default) || exams[0]
          const defaultIndex = exams.findIndex(b => b === defaultExam)
          that.setData({
            exams: exams,
            currentExam: defaultExam,
            examIndex: defaultIndex >= 0 ? defaultIndex : 0
          })
          // 先加载考试指南获取题型分布
          that.loadExamGuide(defaultExam.exam_code)
        }
      })
      .catch(err => {
        console.error('加载题库列表失败:', err)
      })
  },

  // 加载考试指南（获取题型分布）
  loadExamGuide: function(examCode) {
    const that = this
    console.log('loadExamGuide 被调用，examCode:', examCode)
    apiGet('/api/guide', { exam_code: examCode })
      .then(res => {
        console.log('加载考试指南成功:', res)
        if (res.success && res.data) {
          const guide = res.data
          // 解析题型分布
          that.parseQuestionTypeDistribution(guide.questionTypeDistribution)
        } else {
          // 如果获取指南失败，使用默认配置
          console.warn('获取考试指南失败，使用默认配置')
        }
        // 加载题目
        that.loadQuestions()
      })
      .catch(err => {
        console.error('加载考试指南失败:', err)
        // 使用默认配置
        that.loadQuestions()
      })
  },

  // 解析题型分布配置
  parseQuestionTypeDistribution: function(distribution) {
    console.log('parseQuestionTypeDistribution:', distribution)
    if (!distribution || !Array.isArray(distribution)) {
      console.warn('题型分布数据无效')
      return
    }
    
    const examConfig = {
      judgment: 40,  // 默认值
      single: 140,   // 默认值
      multiple: 10   // 默认值
    }
    
    distribution.forEach(item => {
      const type = item.type
      const count = item.count
      
      if (type && count) {
        if (type.includes('判断') || type === 'judgment') {
          examConfig.judgment = parseInt(count) || 40
        } else if (type.includes('单选') || type === 'single') {
          examConfig.single = parseInt(count) || 140
        } else if (type.includes('多选') || type === 'multiple') {
          examConfig.multiple = parseInt(count) || 10
        }
      }
    })
    
    console.log('解析后的考试配置:', examConfig)
    const examQuestionCount = examConfig.judgment + examConfig.single + examConfig.multiple
    this.setData({ examConfig, examQuestionCount })
  },

  // 题库变化事件处理
  onExamChange: function(e) {
    const index = e.detail.value
    const exam = this.data.exams[index]
    if (exam) {
      this.setData({
        currentExam: exam,
        examIndex: index,
        currentQuestionIndex: 0,
        selectedOptions: [],
        showAnswer: false
      })
      // 先加载考试指南获取题型分布，再加载题目
      this.loadExamGuide(exam.exam_code)
    }
  },

  // 从后端API加载题目数据
  loadQuestions: function() {
    const that = this
    
    console.log('loadQuestions 被调用')
    
    const examCode = this.data.currentExam ? this.data.currentExam.exam_code : null
    const openid = this.data.userInfo ? this.data.userInfo.openid : null
    
    apiGet('/api/questions', { openid: openid, exam_code: examCode })
      .then(res => {
        console.log('加载题目成功，res:', res)
        if (res.success) {
          console.log('原始数据长度:', res.data.length)
          console.log('原始数据第一条:', res.data[0])
          
          const questions = res.data.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options || [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o && o.trim()),
            answer: q.answer,
            analysis: q.analysis || q.explanation || '暂无解析',
            type: q.type || q.question_type || 'single'
          }))
          console.log('转换后的题目数据:', questions[0])
          console.log('加载到的题目总数:', questions.length)
          
          // 初始化答题记录对象
            const questionAnswers = {}
            questions.forEach((q, index) => {
              questionAnswers[index] = null
            })
            
            that.setData({
              allQuestions: questions,
              currentQuestions: questions,
              loading: false,
              currentQuestionData: questions[0] || null,
              questionAnswers: questionAnswers
            }, function() {
            // 数据设置完成后验证
            console.log('数据设置完成后验证:')
            console.log('allQuestions.length:', that.data.allQuestions.length)
            console.log('currentQuestions.length:', that.data.currentQuestions.length)
            console.log('currentQuestionIndex:', that.data.currentQuestionIndex)
            console.log('currentQuestions[0]:', that.data.currentQuestions[0])
            
            // 检查第一个题目是否有问题
            if (that.data.currentQuestions.length > 0) {
              console.log('第一个题目的question:', that.data.currentQuestions[0].question)
              console.log('第一个题目的options:', that.data.currentQuestions[0].options)
              console.log('第一个题目的type:', that.data.currentQuestions[0].type)
            }
            
            // 更新计算属性
            that.updateComputedProperties()
            
            // 加载收藏列表
            that.loadUserFavorites()
            
            // 只有考试模式才调用 generateExamQuestions
            if (that.data.currentMode === 'exam') {
              that.generateExamQuestions()
            }
            
            console.log('最终状态:', {
              showAnswer: that.data.showAnswer,
              selectedOptions: that.data.selectedOptions,
              currentQuestionIndex: that.data.currentQuestionIndex,
              currentQuestions: that.data.currentQuestions.length
            })
          })
        } else {
          wx.showToast({
            title: res.message || '加载失败',
            icon: 'none'
          })
          that.setData({ loading: false })
        }
      })
      .catch(err => {
        console.error('加载题目失败', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        that.setData({ loading: false })
      })
  },

  // 生成考试题目
  generateExamQuestions: function() {
    const { allQuestions, examConfig, currentMode } = this.data
    if (currentMode !== 'exam') return

    const judgmentQuestions = allQuestions.filter(q => q.type === 'judgment')
    const singleQuestions = allQuestions.filter(q => q.type === 'single')
    const multipleQuestions = allQuestions.filter(q => q.type === 'multiple')

    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5)

    const examQuestions = [
      ...shuffle(judgmentQuestions).slice(0, examConfig.judgment),
      ...shuffle(singleQuestions).slice(0, examConfig.single),
      ...shuffle(multipleQuestions).slice(0, examConfig.multiple)
    ]

    const shuffledExamQuestions = shuffle(examQuestions)
    
    this.setData({
      examQuestions: shuffledExamQuestions,  // 保存原始考试题目列表
      currentQuestions: shuffledExamQuestions,
      currentQuestionIndex: 0,
      currentQuestionData: shuffledExamQuestions[0] || null,
      selectedOptions: [],
      showAnswer: false
    })
  },

  // 获取考试题目数量
  getExamQuestionCount: function() {
    const { examConfig } = this.data
    return examConfig.judgment + examConfig.single + examConfig.multiple
  },

  // 获取当前题目
  getCurrentQuestion: function() {
    return this.data.currentQuestions[this.data.currentQuestionIndex] || {}
  },

  // 获取题型标签
  getQuestionTypeLabel: function(type) {
    const labels = {
      judgment: '判断题',
      single: '单选题',
      multiple: '多选题'
    }
    return labels[type] || '单选题'
  },

  // 获取选项标签
  getOptionLabel: function(index) {
    return ['A', 'B', 'C', 'D'][index]
  },

  // 切换模式
  switchMode: function(e) {
    const mode = e.currentTarget.dataset.mode
    const { allQuestions, currentQuestionType } = this.data
    
    console.log('switchMode 被调用，mode:', mode, 'allQuestions.length:', allQuestions.length)
    
    // 检查 allQuestions 是否有数据
    if (!allQuestions || allQuestions.length === 0) {
      console.error('allQuestions 为空，无法切换模式')
      wx.showToast({
        title: '题目数据加载中，请稍候...',
        icon: 'none'
      })
      return
    }
    
    this.setData({ 
      currentMode: mode,
      currentQuestionIndex: 0,
      selectedOptions: [],
      showAnswer: false
    })
    
    if (mode === 'exam') {
      this.generateExamQuestions()
      // 更新计算属性，显示考试配置的题型分布
      this.updateComputedProperties()
    } else {
      // 直接设置 currentQuestions，而不是调用 switchQuestionType
      let newCurrentQuestions = allQuestions
      if (currentQuestionType !== 'all') {
        newCurrentQuestions = allQuestions.filter(q => q.type === currentQuestionType)
      }
      this.setData({
        currentQuestions: newCurrentQuestions,
        currentQuestionData: newCurrentQuestions[0] || null
      })
    }
  },

  // 切换题型筛选
  switchQuestionType: function(e) {
    const type = e.currentTarget.dataset.type
    const { allQuestions, examQuestions, currentMode } = this.data
    
    console.log('switchQuestionType 被调用，type:', type, 'allQuestions.length:', allQuestions.length, 'currentMode:', currentMode)
    
    // 检查题目数据是否有数据
    if (!allQuestions || allQuestions.length === 0) {
      console.error('allQuestions 为空，无法切换题型')
      wx.showToast({
        title: '题目数据加载中，请稍候...',
        icon: 'none'
      })
      return
    }
    
    let questions
    
    // 根据当前模式决定从哪个数据源筛选
    if (currentMode === 'exam') {
      // 考试模式：从保存的考试题目中筛选，保持数据源稳定
      questions = examQuestions.length > 0 ? examQuestions : allQuestions
    } else {
      // 练习模式：从全部题库中筛选
      questions = allQuestions
    }
    
    if (type !== 'all') {
      questions = questions.filter(q => q.type === type)
    }
    
    console.log('筛选后的题目数量:', questions.length)
    
    this.setData({ 
      currentQuestionType: type,
      currentQuestions: questions,
      currentQuestionIndex: 0,
      currentQuestionData: questions[0] || null,
      selectedOptions: [],
      showAnswer: false
    })
  },

  // 切换视图
  switchView: function(e) {
    const view = e.currentTarget.dataset.view
    const { allQuestions, currentQuestions, currentMode, currentQuestionType } = this.data
    
    console.log('switchView 被调用，view:', view, 'allQuestions.length:', allQuestions.length, 'currentQuestions.length:', currentQuestions.length)
    
    let newCurrentQuestions = currentQuestions
    
    // 如果切换到题库视图且当前没有题目数据
    if (view === 'home' && allQuestions.length > 0) {
      // 确保有题目数据
      if (currentQuestions.length === 0) {
        if (currentMode === 'exam') {
          this.generateExamQuestions()
          return
        } else {
          // 根据当前题型筛选题目
          if (currentQuestionType !== 'all') {
            newCurrentQuestions = allQuestions.filter(q => q.type === currentQuestionType)
          } else {
            newCurrentQuestions = allQuestions
          }
        }
      }
    }
    
    console.log('设置 newCurrentQuestions:', newCurrentQuestions.length)
    
    this.setData({ 
      currentView: view,
      currentQuestions: newCurrentQuestions,
      selectedOptions: [],
      showAnswer: false,
      answeredCount: 0,
      correctCount: 0,
      showResult: false
    })
  },

  // 通过索引选择选项（供内部调用）
  selectOptionByIndex: function(index) {
    const e = { currentTarget: { dataset: { index: index } } }
    this.selectOption(e)
  },

  // 选择选项
  selectOption: function(e) {
    console.log('selectOption 被调用！')
    console.log('事件对象:', e)
    
    if (!e || !e.currentTarget) {
      console.error('事件对象异常:', e)
      return
    }
    
    const index = parseInt(e.currentTarget.dataset.index)
    console.log('选中的选项索引:', index)
    
    const { selectedOptions, showAnswer, currentQuestions, allQuestions, currentMode, currentQuestionType, currentQuestionData } = this.data
    
    console.log('当前数据状态:', {
      currentQuestionsLength: currentQuestions.length,
      currentQuestionData: currentQuestionData,
      selectedOptions: selectedOptions,
      showAnswer: showAnswer
    })
    
    // 检查题目数据是否存在
    if (!currentQuestions || currentQuestions.length === 0) {
      console.error('currentQuestions 为空！尝试重新加载...')
      
      if (allQuestions && allQuestions.length > 0) {
        // 如果 allQuestions 有数据，重新设置 currentQuestions
        console.log('从 allQuestions 重新加载题目数据')
        let newCurrentQuestions = allQuestions
        
        if (currentMode === 'exam') {
          this.generateExamQuestions()
          return
        } else if (currentQuestionType !== 'all') {
          newCurrentQuestions = allQuestions.filter(q => q.type === currentQuestionType)
        }
        
        this.setData({
          currentQuestions: newCurrentQuestions,
          currentQuestionData: newCurrentQuestions[0] || null
        }, () => {
          // 数据加载完成后，重新调用 selectOption
          // 使用保存的 index 值，避免事件对象在异步回调中失效
          setTimeout(() => this.selectOptionByIndex(index), 100)
        })
        return
      } else {
        wx.showToast({
          title: '题目数据加载失败，请刷新页面',
          icon: 'none'
        })
        return
      }
    }
    
    // 检查当前题目是否存在
    if (!currentQuestionData || !currentQuestionData.type) {
      console.error('当前题目数据不存在！')
      wx.showToast({
        title: '题目数据异常',
        icon: 'none'
      })
      return
    }
    
    let newSelected = [...selectedOptions]
    
    // 多选题可以多选，单选题只能单选
    if (currentQuestionData.type === 'multiple') {
      if (newSelected.includes(index)) {
        newSelected = newSelected.filter(i => i !== index)
      } else {
        newSelected.push(index)
        newSelected.sort((a, b) => a - b)
      }
    } else {
      newSelected = [index]
    }
    
    // 如果之前已经显示过答案，选择新选项时重置状态
    const resetAnswer = showAnswer
    
    // 重新初始化 selectedFlags，清除之前的选中状态
    // 使用字符串键名，确保 setData 能正确更新
    const newSelectedFlags = {}
    newSelected.forEach(idx => {
      newSelectedFlags[idx.toString()] = true
    })
    
    console.log('newSelectedFlags 内容:', JSON.stringify(newSelectedFlags))
    console.log('newSelectedFlags[1]:', newSelectedFlags['1'])
    
    console.log('准备更新的数据:', {
      newSelected: newSelected,
      newSelectedFlags: newSelectedFlags
    })
    
    this.setData({ 
      selectedOptions: newSelected,
      // 添加选中状态标志用于模板渲染
      selectedFlags: newSelectedFlags,
      // 如果之前显示过答案，重置状态允许重新答题
      showAnswer: resetAnswer ? false : showAnswer
    }, () => {
      // 在回调中确认数据更新
      console.log('setData回调 - selectedFlags:', this.data.selectedFlags)
      console.log('setData回调 - selectedOptions:', this.data.selectedOptions)
      console.log('setData回调 - getOptionClass(0):', this.getOptionClass(0))
    })
    
    console.log('选中状态更新:', { selectedOptions: newSelected, selectedFlags: this.data.selectedFlags })
    
    // 所有题型统一：选择后不立即判断，等待用户点击提交按钮
    // 这样单选和多选的交互方式保持一致
    if (resetAnswer) {
      console.log('用户重新选择选项，等待提交')
    }
  },

  // 判断答案
  judgeAnswer: function() {
    const { selectedOptions, currentQuestionIndex, currentQuestions, answeredCount, correctCount, currentQuestionData } = this.data
    
    console.log('judgeAnswer called:', {
      selectedOptions: selectedOptions,
      correctAnswer: currentQuestionData ? currentQuestionData.answer : 'N/A',
      questionType: currentQuestionData ? currentQuestionData.type : 'N/A'
    })
    
    // 判断答案是否正确
    const correctAnswer = currentQuestionData.answer || ''
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    
    let isCorrect = true
    if (selectedOptions.length !== answerIndices.length) {
      isCorrect = false
    } else {
      for (let i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i] !== answerIndices[i]) {
          isCorrect = false
          break
        }
      }
    }
    
    this.setData({
      showAnswer: true,
      answeredCount: answeredCount + 1,
      correctCount: isCorrect ? correctCount + 1 : correctCount
    })
    
    // 显示答题结果提示
    console.log('准备显示Toast:', isCorrect ? '回答正确！' : '回答错误')
    wx.showToast({
      title: isCorrect ? '回答正确！' : '回答错误',
      icon: isCorrect ? 'success' : 'error',
      duration: 2000,
      complete: function() {
        console.log('Toast显示完成')
      }
    })
    
    // 如果是最后一题，显示结果
    if (currentQuestionIndex === currentQuestions.length - 1) {
      setTimeout(() => {
        this.setData({ showResult: true })
      }, 500)
    }
  },

  // 获取选项样式类
  getOptionClass: function(index) {
    const { selectedFlags, showAnswer, currentQuestionData } = this.data
    const classes = ['option-item']
    // 使用字符串键名访问 selectedFlags
    const indexStr = index.toString()
    
    console.log('getOptionClass', { index, indexStr, selectedFlags, hasFlag: selectedFlags[indexStr] })
    
    if (selectedFlags[indexStr]) {
      classes.push('selected')
    }
    
    if (showAnswer && currentQuestionData) {
      const correctAnswer = currentQuestionData.answer || ''
      // 只有当有答案时才判断正确/错误
      if (correctAnswer) {
        const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
        
        if (answerIndices.includes(index)) {
          classes.push('correct')
        } else if (selectedFlags[indexStr]) {
          classes.push('wrong')
        }
      }
    }
    
    return classes.join(' ')
  },

  // 是否是正确选项
  isCorrectOption: function(index) {
    const { currentQuestionData } = this.data
    if (!currentQuestionData) return false
    const correctAnswer = currentQuestionData.answer || ''
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    return answerIndices.includes(index)
  },

  // 选项是否被选中
  isOptionSelected: function(index) {
    const { selectedOptions } = this.data
    console.log('isOptionSelected', { index, selectedOptions, result: selectedOptions.includes(index) })
    return selectedOptions.includes(index)
  },

  // 是否选中了错误选项
  isSelectedWrong: function(index) {
    const { selectedFlags, currentQuestionData } = this.data
    // 使用字符串键名访问 selectedFlags
    if (!selectedFlags[index.toString()] || !currentQuestionData) return false
    
    const correctAnswer = currentQuestionData.answer || ''
    if (!correctAnswer) return false // 没有答案时不认为是错误选项
    
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    return !answerIndices.includes(index)
  },

  // 提交答案
  submitAnswer: function() {
    const { selectedOptions, currentQuestionIndex, currentQuestions, currentQuestionData } = this.data
    
    if (selectedOptions.length === 0) {
      wx.showToast({
        title: '请选择答案',
        icon: 'none'
      })
      return
    }
    
    // 判断答案是否正确
    const correctAnswer = currentQuestionData.answer || ''
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    
    let isCorrect = true
    if (selectedOptions.length !== answerIndices.length) {
      isCorrect = false
    } else {
      for (let i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i] !== answerIndices[i]) {
          isCorrect = false
          break
        }
      }
    }
    
    // 保存当前题目的答题记录
    const questionAnswers = { ...this.data.questionAnswers }
    questionAnswers[currentQuestionIndex] = {
      selectedOptions: [...selectedOptions],
      showAnswer: true,
      isCorrect: isCorrect
    }
    
    this.setData({
      showAnswer: true,
      answeredCount: this.data.answeredCount + 1,
      correctCount: isCorrect ? this.data.correctCount + 1 : this.data.correctCount,
      questionAnswers: questionAnswers
    })
    
    // 更新计算属性（正确率）
    this.updateComputedProperties()
    
    // 显示答题结果提示
    wx.showToast({
      title: isCorrect ? '回答正确！' : '回答错误',
      icon: isCorrect ? 'success' : 'error'
    })
    
    // 如果是最后一题，显示结果
    if (currentQuestionIndex === currentQuestions.length - 1) {
      setTimeout(() => {
        this.setData({ showResult: true })
      }, 500)
    }
  },

  // 重置答案
  resetAnswer: function() {
    this.setData({ 
      selectedOptions: [],
      selectedFlags: {},
      showAnswer: false
    })
  },

  // 下一题
  nextQuestion: function() {
    const { currentQuestionIndex, currentQuestions, questionAnswers } = this.data
    if (currentQuestionIndex < currentQuestions.length - 1) {
      const newIndex = currentQuestionIndex + 1
      // 从答题记录中恢复之前的答题状态
      const savedAnswer = questionAnswers[newIndex]
      let selectedOptions = []
      let selectedFlags = {}
      let showAnswer = false
      
      if (savedAnswer) {
        selectedOptions = savedAnswer.selectedOptions || []
        showAnswer = savedAnswer.showAnswer || false
        // 重建 selectedFlags
        selectedOptions.forEach(idx => {
          selectedFlags[idx.toString()] = true
        })
      }
      
      this.setData({ 
        currentQuestionIndex: newIndex,
        currentQuestionData: currentQuestions[newIndex],
        selectedOptions: selectedOptions,
        selectedFlags: selectedFlags,
        showAnswer: showAnswer
      })
      this.updateComputedProperties()
    }
  },

  // 上一题
  prevQuestion: function() {
    const { currentQuestionIndex, currentQuestions, questionAnswers } = this.data
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      // 从答题记录中恢复之前的答题状态
      const savedAnswer = questionAnswers[newIndex]
      let selectedOptions = []
      let selectedFlags = {}
      let showAnswer = false
      
      if (savedAnswer) {
        selectedOptions = savedAnswer.selectedOptions || []
        showAnswer = savedAnswer.showAnswer || false
        // 重建 selectedFlags
        selectedOptions.forEach(idx => {
          selectedFlags[idx.toString()] = true
        })
      }
      
      this.setData({ 
        currentQuestionIndex: newIndex,
        currentQuestionData: currentQuestions[newIndex],
        selectedOptions: selectedOptions,
        selectedFlags: selectedFlags,
        showAnswer: showAnswer
      })
      this.updateComputedProperties()
    }
  },

  // 获取进度百分比
  getProgressPercent: function() {
    const { currentQuestionIndex, currentQuestions } = this.data
    if (currentQuestions.length === 0) return 0
    return Math.round(((currentQuestionIndex + 1) / currentQuestions.length) * 100)
  },

  // 获取正确率
  getAccuracyRate: function() {
    const { answeredCount, correctCount } = this.data
    if (answeredCount === 0) return 0
    return Math.round((correctCount / answeredCount) * 100)
  },

  // 获取各题型数量
  getJudgmentCount: function() {
    const questions = this.data.allQuestions || []
    return questions.filter(q => q && q.type === 'judgment').length
  },

  getSingleCount: function() {
    const questions = this.data.allQuestions || []
    return questions.filter(q => q && q.type === 'single').length
  },

  getMultipleCount: function() {
    const questions = this.data.allQuestions || []
    return questions.filter(q => q && q.type === 'multiple').length
  },

  // 更新所有计算属性
  updateComputedProperties: function() {
    const { examConfig, currentQuestionIndex, currentQuestions, answeredCount, correctCount, allQuestions, currentMode } = this.data
    
    const examQuestionCount = examConfig.judgment + examConfig.single + examConfig.multiple
    const progressPercent = currentQuestions.length === 0 ? 0 : Math.round(((currentQuestionIndex + 1) / currentQuestions.length) * 100)
    const accuracyRate = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100)
    
    // 根据当前模式决定显示哪种题型分布
    let judgmentCount, singleCount, multipleCount, totalQuestionCount
    if (currentMode === 'exam') {
      // 考试模式：显示考试配置中的题目分布
      judgmentCount = examConfig.judgment
      singleCount = examConfig.single
      multipleCount = examConfig.multiple
      totalQuestionCount = examQuestionCount
    } else {
      // 练习模式：显示全部题库的题型分布
      judgmentCount = (allQuestions || []).filter(q => q && q.type === 'judgment').length
      singleCount = (allQuestions || []).filter(q => q && q.type === 'single').length
      multipleCount = (allQuestions || []).filter(q => q && q.type === 'multiple').length
      totalQuestionCount = (allQuestions || []).length
    }
    
    this.setData({
      examQuestionCount,
      progressPercent,
      accuracyRate,
      judgmentCount,
      singleCount,
      multipleCount,
      totalQuestionCount
    })
  },

  // 显示统计
  showStats: function() {
    this.setData({ showStatsModal: true })
  },

  // 关闭统计弹窗
  closeStatsModal: function() {
    this.setData({ showStatsModal: false })
  },

  // 关闭结果弹窗
  closeResultModal: function() {
    this.setData({ showResult: false })
  },

  // 阻止事件冒泡
  stopPropagation: function() {},

  // 重新开始
  restartExam: function() {
    this.setData({
      currentQuestionIndex: 0,
      selectedOptions: [],
      showAnswer: false,
      showResult: false,
      answeredCount: 0,
      correctCount: 0
    })
    if (this.data.currentMode === 'exam') {
      this.generateExamQuestions()
    }
  },

  // 显示登录弹窗
  showLoginModal: function() {
    this.setData({ showLoginModal: true })
  },

  // 关闭登录弹窗
  closeLoginModal: function() {
    this.setData({ showLoginModal: false })
  },

  // 显示付费弹窗
  showPayModal: function() {
    this.setData({ showPayModal: true })
  },

  // 关闭付费弹窗
  closePayModal: function() {
    this.setData({ showPayModal: false })
  },

  // 选择套餐
  selectPackage: function(e) {
    const packageType = e.currentTarget.dataset.type
    const { priceConfig } = this.data
    let price = 0
    let duration = ''
    let durationDays = 0
    
    switch(packageType) {
      case 'monthly':
        price = priceConfig.monthly
        duration = '1个月'
        durationDays = 30
        break
      case 'quarterly':
        price = priceConfig.quarterly
        duration = '3个月'
        durationDays = 90
        break
      case 'yearly':
        price = priceConfig.yearly
        duration = '1年'
        durationDays = 365
        break
    }
    
    this.setData({
      selectedPackage: packageType,
      selectedPrice: price,
      selectedDuration: duration,
      selectedDurationDays: durationDays
    })
  },

  applyVipSuccess: function(vipExpire) {
    wx.setStorageSync('isVip', true)
    wx.setStorageSync('vipEndTime', vipExpire)
    this.setData({
      isVip: true,
      vipEndTime: vipExpire,
      showPayModal: false
    })
    this.loadQuestions()
  },

  // 支付
  pay: function() {
    const that = this
    const { selectedPackage, selectedPrice, selectedDuration } = this.data
    
    if (!selectedPackage) {
      wx.showToast({
        title: '请选择套餐',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '支付中...' })
    
    apiPost('/api/user/pay/create', {
      openid: that.data.userInfo?.openid,
      package_type: selectedPackage
    })
      .then(res => {
        wx.hideLoading()
        if (!res.success) {
          wx.showToast({ title: res.message || '支付失败', icon: 'none' })
          return
        }
        const payData = res.data
        if (payData.mock) {
          that.applyVipSuccess(payData.vip_expire)
          wx.showToast({ title: payData.message || '开通成功', icon: 'success' })
          return
        }
        wx.requestPayment({
          timeStamp: payData.timeStamp,
          nonceStr: payData.nonceStr,
          package: payData.package,
          signType: payData.signType,
          paySign: payData.paySign,
          success: function() {
            that.applyVipSuccess(payData.vip_expire)
            wx.showToast({ title: '支付成功', icon: 'success' })
          },
          fail: function(err) {
            console.error('微信支付失败', err)
            wx.showToast({ title: '支付已取消', icon: 'none' })
          }
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('支付请求失败', err)
        wx.showToast({ title: '支付失败', icon: 'none' })
      })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          // 清除本地缓存
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('isVip')
          wx.removeStorageSync('vipEndTime')
          
          // 重新加载页面
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  // 获取会员有效期文本
  getVipEndTimeText: function() {
    const { vipEndTime } = this.data
    if (!vipEndTime) return ''
    
    const date = new Date(vipEndTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  },

  // 检查当前题目是否已收藏
  isCurrentQuestionFavorited: function() {
    const { currentQuestionData, currentFavoriteIds } = this.data
    return currentQuestionData && currentFavoriteIds.includes(currentQuestionData.id)
  },

  // 切换收藏状态
  toggleFavorite: function() {
    const that = this
    const { userInfo, currentExam, currentQuestionData, currentFavoriteIds } = this.data
    
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    if (!currentExam || !currentExam.exam_code) {
      wx.showToast({ title: '请选择考试题库', icon: 'none' })
      return
    }
    
    if (!currentQuestionData || !currentQuestionData.id) {
      wx.showToast({ title: '题目数据异常', icon: 'none' })
      return
    }
    
    const isFavorited = currentFavoriteIds.includes(currentQuestionData.id)
    
    if (isFavorited) {
      // 取消收藏
      removeFavorite(userInfo.openid, currentExam?.exam_code, currentQuestionData.id)
        .then(res => {
          if (res.success) {
            const newFavoriteIds = currentFavoriteIds.filter(id => id !== currentQuestionData.id)
            that.setData({ currentFavoriteIds: newFavoriteIds })
            wx.showToast({ title: '已取消收藏', icon: 'success' })
          } else {
            wx.showToast({ title: res.message || '操作失败', icon: 'none' })
          }
        })
        .catch(err => {
          wx.showToast({ title: '操作失败', icon: 'none' })
        })
    } else {
      // 添加收藏
      addFavorite(userInfo.openid, currentExam?.exam_code, currentQuestionData.id)
        .then(res => {
          if (res.success) {
            const newFavoriteIds = [...currentFavoriteIds, currentQuestionData.id]
            that.setData({ currentFavoriteIds: newFavoriteIds })
            wx.showToast({ title: '收藏成功', icon: 'success' })
          } else {
            wx.showToast({ title: res.message || '操作失败', icon: 'none' })
          }
        })
        .catch(err => {
          wx.showToast({ title: '操作失败', icon: 'none' })
        })
    }
  },

  // 加载收藏列表
  loadFavorites: function() {
    const that = this
    const { userInfo, currentExam } = this.data
    
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    that.setData({ favoritesLoading: true })
    
    getFavorites(userInfo.openid, currentExam?.exam_code)
      .then(res => {
        that.setData({ favoritesLoading: false })
        if (res.success) {
          const favorites = res.data.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options || [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o && o.trim()),
            answer: q.answer,
            analysis: q.analysis || q.explanation || '暂无解析',
            type: q.type || q.question_type || 'single'
          }))
          that.setData({ favorites })
        } else {
          wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        }
      })
      .catch(err => {
        that.setData({ favoritesLoading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 显示收藏列表弹窗
  showFavorites: function() {
    this.loadFavorites()
    this.setData({ showFavoritesModal: true })
  },

  // 关闭收藏弹窗
  closeFavoritesModal: function() {
    this.setData({ showFavoritesModal: false })
  },

  // 从收藏中移除题目
  removeFromFavorites: function(e) {
    const that = this
    const questionId = e.currentTarget.dataset.questionId
    const { userInfo, currentExam, currentFavoriteIds, favorites } = this.data
    
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认移除',
      content: '确定要从收藏中移除这道题吗？',
      success: function(res) {
        if (res.confirm) {
          removeFavorite(userInfo.openid, currentExam?.exam_code, questionId)
            .then(res => {
              if (res.success) {
                const newFavoriteIds = currentFavoriteIds.filter(id => id !== questionId)
                const newFavorites = favorites.filter(f => f.id !== questionId)
                that.setData({ 
                  currentFavoriteIds: newFavoriteIds,
                  favorites: newFavorites 
                })
                wx.showToast({ title: '已移除', icon: 'success' })
              } else {
                wx.showToast({ title: res.message || '操作失败', icon: 'none' })
              }
            })
            .catch(err => {
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
        }
      }
    })
  },

  // 查看收藏题目详情
  viewFavoriteQuestion: function(e) {
    const questionId = e.currentTarget.dataset.questionId
    const { favorites, currentQuestionIndex, currentQuestions } = this.data
    
    const question = favorites.find(f => f.id === questionId)
    if (question) {
      // 在当前题目列表中查找对应题目并定位
      const index = currentQuestions.findIndex(q => q.id === questionId)
      if (index !== -1) {
        this.setData({ 
          currentQuestionIndex: index,
          currentQuestionData: currentQuestions[index],
          showFavoritesModal: false,
          selectedOptions: [],
          selectedFlags: {},
          showAnswer: false
        })
      } else {
        wx.showToast({ title: '该题目不在当前题库中', icon: 'none' })
      }
    }
  },

  // 加载用户收藏列表（用于初始化currentFavoriteIds）
  loadUserFavorites: function() {
    const that = this
    const { userInfo, currentExam } = this.data
    
    if (!userInfo || !userInfo.openid || !currentExam || !currentExam.exam_code) {
      return
    }
    
    getFavorites(userInfo.openid, currentExam.exam_code)
      .then(res => {
        if (res.success) {
          const currentFavoriteIds = res.data.map(q => q.id)
          that.setData({ currentFavoriteIds })
        }
      })
      .catch(err => {
        console.error('加载收藏列表失败', err)
      })
  }
})