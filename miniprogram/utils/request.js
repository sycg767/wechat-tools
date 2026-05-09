const app = getApp()

// 统一的错误归一化：把 wx.request fail 错误信息整理成用户能看懂的中文提示
function normalizeFailMessage(err) {
  let msg = (err && err.errMsg) || '请求失败'
  if (msg.includes('timeout')) {
    return '连接超时，请检查后端服务或域名配置是否正确'
  }
  if (msg.includes('fail') || msg.includes('abort')) {
    return '网络连接失败，请确认当前网络和服务域名可正常访问'
  }
  return msg
}

// 把后端返回的非业务异常（比如 502 网关、HTML 错误页）也归一成可读消息
function extractServerMessage(res) {
  const data = res && res.data
  if (data && typeof data === 'object' && data.message) {
    return data.message
  }
  if (typeof data === 'string' && data.length < 200) {
    return data
  }
  return `服务异常 (HTTP ${res && res.statusCode})`
}

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: options.header || {},
      timeout: options.timeout,
      success: (res) => {
        // 防御 res.data 不存在或被网关替换成 HTML/字符串
        const data = res && res.data
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          data &&
          typeof data === 'object' &&
          data.code === 200
        ) {
          resolve(data)
          return
        }
        reject(new Error(extractServerMessage(res)))
      },
      fail: (error) => reject(new Error(normalizeFailMessage(error)))
    })
  })
}

module.exports = {
  request,
  get(url, data, options = {}) {
    return request({ url, data, method: 'GET', ...options })
  },
  post(url, data, header, options = {}) {
    return request({ url, data, method: 'POST', header, ...options })
  }
}
