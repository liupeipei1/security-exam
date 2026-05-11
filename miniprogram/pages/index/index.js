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
    // 当前选中的答案
    selectedOptions: [],
    // 是否显示答案
    showAnswer: false,
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
      judgment: 10,
      single: 10,
      multiple: 5
    },
    // 会员信息
    vipEndTime: null,
    // 价格配置
    priceConfig: {
      monthly: 19.9,
      quarterly: 49.9,
      yearly: 129.9
    }
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
    const isVip = wx.getStorageSync('isVip')
    const vipEndTime = wx.getStorageSync('vipEndTime')
    
    if (userInfo) {
      that.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isVip: isVip,
        vipEndTime: vipEndTime
      })
      
      // 验证会员状态
      that.checkVipStatus()
    } else {
      that.setData({
        loading: false,
        isLoggedIn: false
      })
    }
  },

  // 检查会员状态
  checkVipStatus: function() {
    const that = this
    const userInfo = this.data.userInfo
    
    if (!userInfo || !userInfo.openid) {
      that.setData({ loading: false })
      return
    }
    
    wx.request({
      url: 'http://localhost:3001/api/user/vip-status',
      method: 'GET',
      data: { openid: userInfo.openid },
      success: function(res) {
        if (res.data.success) {
          const vipData = res.data.data
          wx.setStorageSync('isVip', vipData.is_vip)
          wx.setStorageSync('vipEndTime', vipData.vip_expire)
          
          that.setData({
            isVip: vipData.is_vip,
            vipEndTime: vipData.vip_expire
          })
        }
        that.loadQuestions()
      },
      fail: function() {
        that.loadQuestions()
      }
    })
  },

  // 微信登录
  wxLogin: function() {
    const that = this
    
    wx.showLoading({ title: '登录中...' })
    
    wx.login({
      success: function(res) {
        if (res.code) {
          // 发送code到后端获取openid和用户信息
          wx.request({
            url: 'http://localhost:3001/api/auth/login',
            method: 'POST',
            data: { code: res.code },
            success: function(response) {
              wx.hideLoading()
              
              if (response.data.success) {
                const userData = response.data.data
                
                // 保存用户信息到本地缓存
                wx.setStorageSync('userInfo', {
                  id: userData.id,
                  openid: userData.openid,
                  nickname: userData.nickname,
                  avatar: userData.avatar
                })
                wx.setStorageSync('isVip', userData.is_vip)
                wx.setStorageSync('vipEndTime', userData.vip_expire)
                
                that.setData({
                  isLoggedIn: true,
                  userInfo: {
                    id: userData.id,
                    openid: userData.openid,
                    nickname: userData.nickname,
                    avatar: userData.avatar
                  },
                  isVip: userData.is_vip,
                  vipEndTime: userData.vip_expire
                })
                
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                })
                
                // 加载题目数据
                that.loadQuestions()
              } else {
                wx.showToast({
                  title: response.data.message || '登录失败',
                  icon: 'none'
                })
              }
            },
            fail: function(err) {
              wx.hideLoading()
              console.error('登录请求失败', err)
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              })
            }
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

  // 从后端API加载题目数据
  loadQuestions: function() {
    const that = this
    
    // 如果不是会员，不加载题目
    if (!this.data.isVip) {
      that.setData({ loading: false })
      return
    }
    
    wx.request({
      url: 'http://localhost:3001/api/questions',
      method: 'GET',
      data: { openid: this.data.userInfo?.openid },
      success: function(res) {
        console.log('加载题目成功', res.data)
        if (res.data.success) {
          const questions = res.data.data.map(q => ({
            id: q.id,
            question: q.question,
            options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o && o.trim()),
            answer: q.answer,
            analysis: q.analysis || '暂无解析',
            type: q.question_type || 'single'
          }))
          that.setData({
            allQuestions: questions,
            currentQuestions: questions,
            loading: false
          })
          that.generateExamQuestions()
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          })
          that.setData({ loading: false })
        }
      },
      fail: function(err) {
        console.error('加载题目失败', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        that.setData({ loading: false })
      }
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

    this.setData({
      currentQuestions: shuffle(examQuestions),
      currentQuestionIndex: 0,
      selectedOptions: [],
      showAnswer: false
    })
  },

  // 获取考试题目数量
  get examQuestionCount() {
    const { examConfig } = this.data
    return examConfig.judgment + examConfig.single + examConfig.multiple
  },

  // 获取当前题目
  get currentQuestion() {
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
    this.setData({ 
      currentMode: mode,
      currentQuestionIndex: 0,
      selectedOptions: [],
      showAnswer: false
    })
    
    if (mode === 'exam') {
      this.generateExamQuestions()
    } else {
      this.switchQuestionType({ currentTarget: { dataset: { type: this.data.currentQuestionType } } })
    }
  },

  // 切换题型筛选
  switchQuestionType: function(e) {
    const type = e.currentTarget.dataset.type
    let questions = this.data.allQuestions
    
    if (type !== 'all') {
      questions = questions.filter(q => q.type === type)
    }
    
    this.setData({ 
      currentQuestionType: type,
      currentQuestions: questions,
      currentQuestionIndex: 0,
      selectedOptions: [],
      showAnswer: false
    })
  },

  // 切换视图
  switchView: function(e) {
    const view = e.currentTarget.dataset.view
    this.setData({ currentView: view })
  },

  // 选择选项
  selectOption: function(e) {
    if (this.data.showAnswer) return
    
    const index = parseInt(e.currentTarget.dataset.index)
    const { currentQuestion, selectedOptions } = this.data
    
    let newSelected = [...selectedOptions]
    
    // 多选题可以多选，单选题只能单选
    if (currentQuestion.type === 'multiple') {
      if (newSelected.includes(index)) {
        newSelected = newSelected.filter(i => i !== index)
      } else {
        newSelected.push(index)
        newSelected.sort((a, b) => a - b)
      }
    } else {
      newSelected = [index]
    }
    
    this.setData({ selectedOptions: newSelected })
  },

  // 获取选项样式类
  getOptionClass: function(index) {
    const { selectedOptions, showAnswer, currentQuestion } = this.data
    const classes = ['option-item']
    
    if (selectedOptions.includes(index)) {
      classes.push('selected')
    }
    
    if (showAnswer) {
      const correctAnswer = currentQuestion.answer || ''
      const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
      
      if (answerIndices.includes(index)) {
        classes.push('correct')
      } else if (selectedOptions.includes(index)) {
        classes.push('wrong')
      }
    }
    
    return classes.join(' ')
  },

  // 是否是正确选项
  isCorrectOption: function(index) {
    const { currentQuestion } = this.data
    const correctAnswer = currentQuestion.answer || ''
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    return answerIndices.includes(index)
  },

  // 是否选中了错误选项
  isSelectedWrong: function(index) {
    const { selectedOptions, currentQuestion } = this.data
    if (!selectedOptions.includes(index)) return false
    
    const correctAnswer = currentQuestion.answer || ''
    const answerIndices = correctAnswer.split('').map(c => c.charCodeAt(0) - 65)
    return !answerIndices.includes(index)
  },

  // 提交答案
  submitAnswer: function() {
    const { selectedOptions, currentQuestion, currentQuestionIndex, currentQuestions } = this.data
    
    if (selectedOptions.length === 0) {
      wx.showToast({
        title: '请选择答案',
        icon: 'none'
      })
      return
    }
    
    // 判断答案是否正确
    const correctAnswer = currentQuestion.answer || ''
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
      answeredCount: this.data.answeredCount + 1,
      correctCount: isCorrect ? this.data.correctCount + 1 : this.data.correctCount
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
      showAnswer: false
    })
  },

  // 下一题
  nextQuestion: function() {
    const { currentQuestionIndex, currentQuestions } = this.data
    if (currentQuestionIndex < currentQuestions.length - 1) {
      this.setData({ 
        currentQuestionIndex: currentQuestionIndex + 1,
        selectedOptions: [],
        showAnswer: false
      })
    }
  },

  // 上一题
  prevQuestion: function() {
    const { currentQuestionIndex } = this.data
    if (currentQuestionIndex > 0) {
      this.setData({ 
        currentQuestionIndex: currentQuestionIndex - 1,
        selectedOptions: [],
        showAnswer: false
      })
    }
  },

  // 获取进度百分比
  get progressPercent() {
    const { currentQuestionIndex, currentQuestions } = this.data
    if (currentQuestions.length === 0) return 0
    return Math.round(((currentQuestionIndex + 1) / currentQuestions.length) * 100)
  },

  // 获取正确率
  get accuracyRate() {
    const { answeredCount, correctCount } = this.data
    if (answeredCount === 0) return 0
    return Math.round((correctCount / answeredCount) * 100)
  },

  // 获取各题型数量
  get judgmentCount() {
    return this.data.allQuestions.filter(q => q.type === 'judgment').length
  },

  get singleCount() {
    return this.data.allQuestions.filter(q => q.type === 'single').length
  },

  get multipleCount() {
    return this.data.allQuestions.filter(q => q.type === 'multiple').length
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
    
    // 调用后端支付接口
    wx.request({
      url: 'http://localhost:3001/api/user/buy-vip',
      method: 'POST',
      data: {
        openid: that.data.userInfo?.openid,
        package_type: selectedPackage
      },
      success: function(res) {
        wx.hideLoading()
        
        if (res.data.success) {
          // 更新本地会员状态
          const newEndTime = res.data.data.vip_expire
          wx.setStorageSync('isVip', true)
          wx.setStorageSync('vipEndTime', newEndTime)
          
          that.setData({
            isVip: true,
            vipEndTime: newEndTime,
            showPayModal: false
          })
          
          wx.showToast({
            title: '开通成功',
            icon: 'success'
          })
          
          // 加载题目数据
          that.loadQuestions()
        } else {
          wx.showToast({
            title: res.data.message || '支付失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        wx.hideLoading()
        console.error('支付请求失败', err)
        wx.showToast({
          title: '支付失败',
          icon: 'none'
        })
      }
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
  }
})