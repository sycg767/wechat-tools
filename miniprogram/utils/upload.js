const app = getApp()

function upload(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    let responsePendingNotified = false

    const notifyResponsePending = () => {
      if (responsePendingNotified) {
        return
      }
      responsePendingNotified = true
      if (typeof options.onResponsePending === 'function') {
        options.onResponsePending()
      }
    }

    const uploadTask = wx.uploadFile({
      url: `${app.globalData.baseUrl}${url}`,
      filePath,
      name: 'file',
      formData,
      success: (res) => {
        // wx.uploadFile 返回的 res.data 是字符串，需要先 parse；网关错误/超大响应可能是 HTML 直接 throw
        let data
        try {
          data = JSON.parse(res.data)
        } catch (e) {
          reject(new Error(`服务异常 (HTTP ${res.statusCode})`))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && data && data.code === 200) {
          resolve(data)
          return
        }
        reject(new Error((data && data.message) || `上传失败 (HTTP ${res.statusCode})`))
      },
      fail: (error) => {
        let msg = (error && error.errMsg) || '上传失败'
        if (msg.includes('timeout')) msg = '上传超时，请检查网络后重试'
        else if (msg.includes('fail') || msg.includes('abort')) msg = '网络异常，上传失败'
        reject(new Error(msg))
      }
    })

    if (uploadTask && typeof uploadTask.onProgressUpdate === 'function') {
      uploadTask.onProgressUpdate((progress) => {
        if (typeof options.onProgress === 'function') {
          options.onProgress(progress)
        }
        if (progress && progress.progress >= 100) {
          notifyResponsePending()
        }
      })
    }
  })
}

module.exports = upload
