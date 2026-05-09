// 按 envVersion 自动切换 baseUrl，避免开发/测试/生产环境写错联调到线上
function resolveBaseUrl() {
  const fallback = 'https://tools.410622.xyz/api'
  try {
    const accountInfo = wx.getAccountInfoSync && wx.getAccountInfoSync()
    const env = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion
    // develop=开发版（本地调试）、trial=体验版、release=正式版
    const map = {
      develop: 'http://localhost:8080/api',
      trial: 'https://tools.410622.xyz/api',
      release: 'https://tools.410622.xyz/api'
    }
    return map[env] || fallback
  } catch (e) {
    return fallback
  }
}

App({
  globalData: {
    baseUrl: resolveBaseUrl()
  }
})
