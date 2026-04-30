const app = getApp()

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: options.header || {},
      timeout: options.timeout,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data.code === 200) {
          resolve(res.data)
          return
        }
        reject(new Error(res.data.message || '请求失败'))
      },
      fail: (error) => {
        let msg = error.errMsg || '请求失败'
        if (msg.includes('timeout')) {
          msg = '连接超时，请检查后端服务或域名配置是否正确'
        } else if (msg.includes('fail')) {
          msg = '网络连接失败，请确认当前网络和服务域名可正常访问'
        }
        reject(new Error(msg))
      }
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
