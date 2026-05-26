const { API_BASE } = require('./config.js')

function buildHeader(extra) {
  const header = { 'Content-Type': 'application/json', ...(extra || {}) }
  const userInfo = wx.getStorageSync('userInfo')
  if (userInfo && userInfo.token) {
    header.Authorization = 'Bearer ' + userInfo.token
  }
  return header
}

function request(options) {
  return wx.request({
    ...options,
    url: (options.url && options.url.startsWith('http')) ? options.url : API_BASE + options.url,
    header: buildHeader(options.header)
  })
}

module.exports = { request, API_BASE }
