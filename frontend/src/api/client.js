const API_BASE = import.meta.env.VITE_API_BASE || ''

function getToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
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
 * @param {Response} res - fetch响应对象
 * @returns {Promise<Object>} - 处理后的响应数据
 */
async function handleResponse(res) {
  let data
  try {
    data = await res.json()
  } catch {
    data = { success: false, message: '响应解析失败' }
  }

  // 处理HTTP状态码
  if (!res.ok) {
    const errorMessage = data.message || `请求失败 (${res.status})`
    
    // 处理401未授权
    if (res.status === 401) {
      data.code = 'UNAUTHORIZED'
      data.message = data.message || '登录已过期，请重新登录'
      // 清除本地存储的用户信息
      clearStoredUser()
    }
    
    // 处理403禁止访问
    if (res.status === 403) {
      data.code = 'FORBIDDEN'
      data.message = data.message || '无权访问'
    }
    
    // 处理500服务器错误
    if (res.status >= 500) {
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

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.append(k, v)
  })
  const query = qs.toString()
  const url = `${API_BASE}${path}${query ? `?${query}` : ''}`
  
  try {
    const res = await fetch(url, { headers: authHeaders() })
    return handleResponse(res)
  } catch (error) {
    console.error('API请求失败:', error)
    return {
      success: false,
      message: '网络请求失败，请检查网络连接',
      code: 'NETWORK_ERROR'
    }
  }
}

export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    })
    return handleResponse(res)
  } catch (error) {
    console.error('API请求失败:', error)
    return {
      success: false,
      message: '网络请求失败，请检查网络连接',
      code: 'NETWORK_ERROR'
    }
  }
}

export async function apiDelete(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`
  
  try {
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
    return handleResponse(res)
  } catch (error) {
    console.error('API请求失败:', error)
    return {
      success: false,
      message: '网络请求失败，请检查网络连接',
      code: 'NETWORK_ERROR'
    }
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem('user')
}

// 收藏相关API

export async function addFavorite(openid, bank_code, question_id) {
  return apiPost('/api/favorites/add', { openid, bank_code, question_id })
}

export async function removeFavorite(openid, bank_code, question_id) {
  return apiPost('/api/favorites/remove', { openid, bank_code, question_id })
}

export async function getFavorites(openid, bank_code = null) {
  const params = { openid }
  if (bank_code) {
    params.bank_code = bank_code
  }
  return apiGet('/api/favorites', params)
}

export async function checkFavorite(openid, bank_code, question_id) {
  return apiGet('/api/favorites/check', { openid, bank_code, question_id })
}

export { API_BASE }
