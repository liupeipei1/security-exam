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

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.append(k, v)
  })
  const query = qs.toString()
  const url = `${API_BASE}${path}${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders() })
  return res.json()
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  return res.json()
}

export async function apiDelete(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  return res.json()
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

export { API_BASE }
