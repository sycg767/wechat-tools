const taskStore = require('../../utils/task-store')
const request = require('../../utils/request')
const upload = require('../../utils/upload')

Page({
  data: {
    selectedFile: null,
    type: 'text', // text, image
    layout: 'center', // center, manual, tile
    watermarkText: '',
    imagePath: '',
    opacity: 0.5,
    rotation: 45,
    scale: 1.0,
    fontSize: 30,
    color: '#969696',
    colors: ['#969696', '#000000', '#FF3B30', '#007AFF', '#4CD964', '#FFCC00'],
    previewUrl: '',
    previewWidth: 0,
    previewHeight: 0,
    pdfWidth: 0,
    pdfHeight: 0,
    x: 0,
    y: 0,
    markerX: 0,
    markerY: 0
  },

  onFileSelect(e) {
    this.setData({
      selectedFile: e.detail.file
    }, () => {
      this.generatePreview()
    })
  },

  async generatePreview() {
    const { selectedFile } = this.data
    if (!selectedFile) return

    try {
      wx.showLoading({ title: '上传预览文件 0%' })
      const res = await upload('/tool/pdf-preview', selectedFile.path, {}, {
        onProgress: ({ progress }) => {
          wx.showLoading({ title: `上传预览文件 ${progress}%` })
        },
        onResponsePending: () => {
          wx.showLoading({ title: '预览处理中' })
        }
      })
      this.setData({
        previewUrl: res.data.preview,
        pdfWidth: res.data.width,
        pdfHeight: res.data.height
      })
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('预览失败', error)
    }
  },

  handlePreviewTap(e) {
    if (this.data.layout !== 'manual') return

    const query = wx.createSelectorQuery()
    query.select('.preview-box').boundingClientRect()
    query.exec(res => {
      const boxRect = res[0]
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (!boxRect || !touch || !this.data.pdfWidth || !this.data.pdfHeight) return

      const boxX = touch.clientX - boxRect.left
      const boxY = touch.clientY - boxRect.top

      const viewW = boxRect.width
      const viewH = boxRect.height
      const pdfW = this.data.pdfWidth
      const pdfH = this.data.pdfHeight

      const ratio = Math.min(viewW / pdfW, viewH / pdfH)
      const contentW = pdfW * ratio
      const contentH = pdfH * ratio
      const offsetX = (viewW - contentW) / 2
      const offsetY = (viewH - contentH) / 2

      const clampedXInContent = Math.max(0, Math.min(boxX - offsetX, contentW))
      const clampedYInContent = Math.max(0, Math.min(boxY - offsetY, contentH))

      const markerX = offsetX + clampedXInContent
      const markerY = offsetY + clampedYInContent

      const pdfX = (clampedXInContent / contentW) * pdfW
      const pdfY = (1 - (clampedYInContent / contentH)) * pdfH

      this.setData({
        x: Math.round(Math.max(0, Math.min(pdfX, pdfW))),
        y: Math.round(Math.max(0, Math.min(pdfY, pdfH))),
        markerX,
        markerY
      })
    })
  },

  chooseWatermarkImage() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        this.setData({
          imagePath: res.tempFilePaths[0]
        })
      }
    })
  },

  onFileClear() {
    this.setData({
      selectedFile: null,
      previewUrl: ''
    })
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [field]: value
    })
    
    // 如果切换布局到居中，重置坐标
    if (field === 'layout' && value === 'center') {
      this.setData({
        x: Math.round(this.data.pdfWidth / 2),
        y: Math.round(this.data.pdfHeight / 2)
      })
    }
  },

  handleSliderChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [field]: e.detail.value
    })
  },

  selectColor(e) {
    this.setData({
      color: e.currentTarget.dataset.color
    })
  },

  async handleSubmit() {
    const { selectedFile, type, layout, watermarkText, imagePath, opacity, rotation, scale, fontSize, color, x, y } = this.data
    
    if (!selectedFile) {
      wx.showToast({ title: '请选择 PDF 文件', icon: 'none' })
      return
    }

    if (type === 'text' && !watermarkText) {
      wx.showToast({ title: '请输入水印文字', icon: 'none' })
      return
    }
    if (type === 'image' && !imagePath) {
      wx.showToast({ title: '请选择水印图片', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '上传中 0%' })

      let endpoint = '/tool/pdf-add-watermark'
      let result;

      const formData = {
        type,
        layout,
        watermarkText: type === 'text' ? watermarkText : '',
        opacity,
        rotation,
        scale,
        fontSize,
        color,
        x,
        y,
        originalFileName: selectedFile.name
      }

      if (type === 'image') {
        result = await this.uploadWithImage(endpoint, selectedFile.path, imagePath, formData)
      } else {
        result = await upload(endpoint, selectedFile.path, formData, {
          onProgress: ({ progress }) => {
            wx.showLoading({ title: `上传中 ${progress}%` })
          },
          onResponsePending: () => {
            wx.showLoading({ title: '处理中' })
          }
        })
      }

      wx.showLoading({ title: '提交任务中' })

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'pdf-add-watermark',
        sourceFileName: selectedFile.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
      })

      wx.navigateTo({
        url: `/pages/task-detail/index?taskId=${result.data}`
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    }
  },

  uploadWithImage(endpoint, filePath, imagePath, formData) {
    return new Promise((resolve, reject) => {
      const imageUploadTask = wx.uploadFile({
        url: getApp().globalData.baseUrl + '/file/upload',
        filePath: imagePath,
        name: 'file',
        success: async (res) => {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            try {
              wx.showLoading({ title: '上传主文件 0%' })
              const taskRes = await upload(endpoint, filePath, {
                ...formData,
                imageFileId: data.data.fileId
              }, {
                onProgress: ({ progress }) => {
                  wx.showLoading({ title: `上传主文件 ${progress}%` })
                },
                onResponsePending: () => {
                  wx.showLoading({ title: '主文件处理中' })
                }
              })
              resolve(taskRes)
            } catch (e) {
              reject(e)
            }
          } else {
            reject(new Error(data.message))
          }
        },
        fail: reject
      })

      if (imageUploadTask && typeof imageUploadTask.onProgressUpdate === 'function') {
        imageUploadTask.onProgressUpdate(({ progress }) => {
          wx.showLoading({ title: `上传水印图 ${progress}%` })
        })
      }
    })
  }
})