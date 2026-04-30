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
        const data = JSON.parse(res.data)
        if (res.statusCode >= 200 && res.statusCode < 300 && data.code === 200) {
          resolve(data)
          return
        }
        reject(new Error(data.message || '上传失败'))
      },
      fail: (error) => reject(new Error(error.errMsg || '上传失败'))
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
