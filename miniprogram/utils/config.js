/**
 * API 网关地址（Spring Cloud Gateway）
 * 开发：本机网关 8080；生产：改为 HTTPS 域名并在微信公众平台配置 request 合法域名
 */
const API_BASE = 'http://localhost:3001'

module.exports = {
  API_BASE
}
