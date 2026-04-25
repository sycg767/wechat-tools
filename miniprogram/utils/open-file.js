const SUPPORTED_FILE_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf']

function getFileType(fileName = '') {
  if (!fileName.includes('.')) {
    return ''
  }
  return fileName.split('.').pop().toLowerCase()
}

function canOpenFile(fileName = '') {
  return SUPPORTED_FILE_TYPES.includes(getFileType(fileName))
}

function openFile(url, fileName = '') {
  return new Promise((resolve, reject) => {
    const fileType = getFileType(fileName)
    if (!canOpenFile(fileName)) {
      reject(new Error('当前文件类型不支持直接打开，请改用支持的文档格式'))
      return
    }

    wx.showLoading({ title: '打开中' })
    
    // 微信小程序 wx.downloadFile 下载后的临时路径是随机生成的哈希名
    // 为了让 openDocument 预览时显示正确的文件名，我们需要手动重命名临时文件
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading()
          reject(new Error('下载失败'))
          return
        }

        const fs = wx.getFileSystemManager()
        // 构造一个带有正确文件名的临时路径
        const tempPath = `${wx.env.USER_DATA_PATH}/${fileName}`
        
        fs.saveFile({
          tempFilePath: res.tempFilePath,
          filePath: tempPath,
          success: (saveRes) => {
            wx.openDocument({
              filePath: saveRes.savedFilePath,
              showMenu: true,
              fileType,
              success: () => {
                wx.hideLoading()
                resolve()
              },
              fail: (error) => {
                wx.hideLoading()
                reject(new Error(error.errMsg || '打开文件失败'))
              }
            })
          },
          fail: (error) => {
            // 如果 saveFile 失败，尝试直接打开（虽然文件名可能不对）
            wx.openDocument({
              filePath: res.tempFilePath,
              showMenu: true,
              fileType,
              success: () => {
                wx.hideLoading()
                resolve()
              },
              fail: (openError) => {
                wx.hideLoading()
                reject(new Error(openError.errMsg || '打开文件失败'))
              }
            })
          }
        })
      },
      fail: (error) => {
        wx.hideLoading()
        reject(new Error(error.errMsg || '下载失败'))
      }
    })
  })
}

module.exports = {
  openFile,
  canOpenFile
}
