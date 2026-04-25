const app = getApp()

function upload(url, filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
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
  })
}

module.exports = upload
