export const WECHAT_CONFIG = {
  appId: import.meta.env.VITE_WECHAT_APPID || ''
}

if (typeof window !== 'undefined') {
  window.WECHAT_CONFIG = WECHAT_CONFIG
}
