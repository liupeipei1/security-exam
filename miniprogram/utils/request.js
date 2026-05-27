const { API_BASE } = require('./config')

function getToken() {
  try {
    const user = wx.getStorageSync('user')
    return user?.token || null
  } catch {
    return null
  }
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * 统一处理API响应
 * @param {Object} res - wx.request响应对象
 * @returns {Object} - 处理后的响应数据
 */
function handleResponse(res) {
  let data = res.data || {}
  
  // 处理HTTP状态码
  if (res.statusCode && res.statusCode !== 200) {
    const errorMessage = data.message || `请求失败 (${res.statusCode})`
    
    // 处理401未授权
    if (res.statusCode === 401) {
      data.code = 'UNAUTHORIZED'
      data.message = data.message || '登录已过期，请重新登录'
      // 清除本地存储的用户信息
      clearStoredUser()
    }
    
    // 处理403禁止访问
    if (res.statusCode === 403) {
      data.code = 'FORBIDDEN'
      data.message = data.message || '无权访问'
    }
    
    // 处理500服务器错误
    if (res.statusCode >= 500) {
      data.code = 'SERVER_ERROR'
      data.message = data.message || '服务器内部错误'
    }
  }

  // 处理needVip状态（后端返回的VIP权限不足）
  if (data.code === 'NEED_VIP' || data.message?.includes('VIP') || data.message?.includes('会员')) {
    data.needVip = true
  }

  return data
}

function apiGet(path, params = {}) {
  return new Promise((resolve) => {
    // 小程序不支持URLSearchParams，使用传统方式拼接
    const queryParts = []
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') {
        queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      }
    })
    const query = queryParts.join('&')
    const url = `${API_BASE}${path}${query ? `?${query}` : ''}`
    
    wx.request({
      url: url,
      method: 'GET',
      header: authHeaders(),
      success: (res) => {
        resolve(handleResponse(res))
      },
      fail: (error) => {
        console.error('API请求失败:', error)
        resolve({
          success: false,
          message: '网络请求失败，请检查网络连接',
          code: 'NETWORK_ERROR'
        })
      }
    })
  })
}

function apiPost(path, body) {
  return new Promise((resolve) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: 'POST',
      header: authHeaders(),
      data: body,
      success: (res) => {
        resolve(handleResponse(res))
      },
      fail: (error) => {
        console.error('API请求失败:', error)
        resolve({
          success: false,
          message: '网络请求失败，请检查网络连接',
          code: 'NETWORK_ERROR'
        })
      }
    })
  })
}

function apiDelete(path, params = {}) {
  return new Promise((resolve) => {
    // 小程序不支持URLSearchParams，使用传统方式拼接
    const queryParts = []
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') {
        queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      }
    })
    const query = queryParts.join('&')
    const url = `${API_BASE}${path}${query ? `?${query}` : ''}`
    
    wx.request({
      url: url,
      method: 'DELETE',
      header: authHeaders(),
      success: (res) => {
        resolve(handleResponse(res))
      },
      fail: (error) => {
        console.error('API请求失败:', error)
        resolve({
          success: false,
          message: '网络请求失败，请检查网络连接',
          code: 'NETWORK_ERROR'
        })
      }
    })
  })
}

function getStoredUser() {
  try {
    return wx.getStorageSync('user') || null
  } catch {
    return null
  }
}

function setStoredUser(user) {
  wx.setStorageSync('user', user)
}

function clearStoredUser() {
  wx.removeStorageSync('user')
}

module.exports = {
  apiGet,
  apiPost,
  apiDelete,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  API_BASE
}
