function getFileNameFromUrl(url) {
  if (!url) {
    return ''
  }
  const cleanUrl = url.split('?')[0]
  const segments = cleanUrl.split('/')
  return segments[segments.length - 1] || ''
}

function showSavedFileInfo(filePath, fileName) {
  wx.showModal({
    title: '下载完成',
    content: `文件名：${fileName || '未命名文件'}\n路径：${filePath}\n\n当前为小程序内部保存路径，已自动复制到剪贴板。若需验证系统另存为，请在 PC 微信客户端中测试。`,
    showCancel: false
  })
}

function copyPath(filePath, onDone) {
  wx.setClipboardData({
    data: filePath,
    success: onDone,
    fail: onDone
  })
}

function saveDownloadedFile(tempFilePath, fileName, onSaved) {
  const fileSystemManager = wx.getFileSystemManager && wx.getFileSystemManager()
  if (fileSystemManager && typeof fileSystemManager.saveFile === 'function') {
    const extension = fileName && fileName.includes('.') ? `.${fileName.split('.').pop()}` : ''
    const targetPath = `${wx.env.USER_DATA_PATH}/${Date.now()}${extension}`
    fileSystemManager.saveFile({
      tempFilePath,
      filePath: targetPath,
      success: (saveRes) => {
        const savedFilePath = saveRes.savedFilePath || targetPath
        copyPath(savedFilePath, () => {
          onSaved(savedFilePath)
        })
      },
      fail: () => {
        copyPath(tempFilePath, () => {
          onSaved(tempFilePath)
        })
      }
    })
    return
  }

  copyPath(tempFilePath, () => {
    onSaved(tempFilePath)
  })
}

function download(url, fileName = '') {
  const resolvedFileName = fileName || getFileNameFromUrl(url)
  wx.showLoading({ title: '下载中' })
  wx.downloadFile({
    url,
    success: (res) => {
      wx.hideLoading()
      if (res.statusCode !== 200) {
        wx.showToast({ title: '下载失败', icon: 'none' })
        return
      }

      saveDownloadedFile(res.tempFilePath, resolvedFileName, (filePath) => {
        showSavedFileInfo(filePath, resolvedFileName)
      })
    },
    fail: () => {
      wx.hideLoading()
      wx.showToast({ title: '下载失败', icon: 'none' })
    }
  })
}

module.exports = download
