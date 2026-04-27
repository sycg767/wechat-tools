const SUPPORTED_DOCUMENT_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'zip']
const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp']

function getFileType(fileName = '') {
  if (!fileName.includes('.')) {
    return ''
  }
  return fileName.split('.').pop().toLowerCase()
}

function isImageFile(fileName = '') {
  return SUPPORTED_IMAGE_TYPES.includes(getFileType(fileName))
}

function canOpenFile(fileName = '') {
  const fileType = getFileType(fileName)
  return SUPPORTED_DOCUMENT_TYPES.includes(fileType) || SUPPORTED_IMAGE_TYPES.includes(fileType)
}

function downloadToTempFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('下载失败'))
          return
        }
        resolve(res.tempFilePath)
      },
      fail: (error) => {
        reject(new Error(error.errMsg || '下载失败'))
      }
    })
  })
}

function previewImage(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const tempFilePath = await downloadToTempFile(url)
      wx.previewImage({
        current: tempFilePath,
        urls: [tempFilePath],
        success: () => resolve(),
        fail: (error) => reject(new Error(error.errMsg || '预览图片失败'))
      })
    } catch (error) {
      reject(error)
    }
  })
}

function ensureImageFileName(fileName = '') {
  const normalized = String(fileName || '').trim().replace(/[\\/:*?"<>|]/g, '_')
  if (isImageFile(normalized)) {
    return normalized
  }
  return `image_${Date.now()}.png`
}

function saveLocalImageFile(tempFilePath, fileName) {
  const targetPath = `${wx.env.USER_DATA_PATH}/${ensureImageFileName(fileName)}`
  const fs = wx.getFileSystemManager()
  return new Promise((resolve) => {
    fs.saveFile({
      tempFilePath,
      filePath: targetPath,
      success: (res) => resolve(res.savedFilePath || targetPath),
      fail: () => resolve(tempFilePath)
    })
  })
}

function saveImageToAlbum(url, fileName = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const tempFilePath = await downloadToTempFile(url)
      const localFilePath = await saveLocalImageFile(tempFilePath, fileName)
      wx.saveImageToPhotosAlbum({
        filePath: localFilePath,
        success: () => resolve(),
        fail: (error) => {
          const msg = error.errMsg || ''
          if (msg.includes('auth deny') || msg.includes('auth denied')) {
            reject(new Error('请先允许小程序保存到相册权限'))
            return
          }
          reject(new Error(msg || '保存到相册失败'))
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

function openDocument(url, fileName, fileType) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '打开中' })

    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading()
          reject(new Error('下载失败'))
          return
        }

        const fs = wx.getFileSystemManager()
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
          fail: () => {
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

function openFile(url, fileName = '') {
  const fileType = getFileType(fileName)
  if (!canOpenFile(fileName)) {
    return Promise.reject(new Error('当前文件类型暂不支持在小程序内直接打开'))
  }

  if (isImageFile(fileName)) {
    return previewImage(url)
  }

  return openDocument(url, fileName, fileType)
}

module.exports = {
  openFile,
  canOpenFile,
  isImageFile,
  saveImageToAlbum
}
