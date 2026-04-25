const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    selectedFile: null,
    quality: 80,
    estimatedSizeText: '',
    estimatedReduceText: '',
    originalSizeText: ''
  },

  formatFileSize(size = 0) {
    if (!size || size <= 0) {
      return '0 B'
    }
    if (size < 1024) {
      return `${size} B`
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  },

  estimateCompressedSize(originalSize, quality) {
    const q = Math.max(10, Math.min(100, quality)) / 100
    // 经验估算：质量越低，体积下降越明显；该值仅用于前端提示
    const estimatedRatio = 0.18 + 0.82 * Math.pow(q, 1.55)
    const estimatedSize = Math.max(1, Math.round(originalSize * estimatedRatio))
    return Math.min(originalSize, estimatedSize)
  },

  updateEstimate() {
    const { selectedFile, quality } = this.data
    if (!selectedFile || !selectedFile.size) {
      this.setData({
        estimatedSizeText: '',
        estimatedReduceText: '',
        originalSizeText: ''
      })
      return
    }

    const originalSize = selectedFile.size
    const estimatedSize = this.estimateCompressedSize(originalSize, quality)
    const reducePercent = Math.max(0, Math.round((1 - estimatedSize / originalSize) * 100))

    this.setData({
      originalSizeText: this.formatFileSize(originalSize),
      estimatedSizeText: this.formatFileSize(estimatedSize),
      estimatedReduceText: `${reducePercent}%`
    })
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    }, () => {
      this.updateEstimate()
    })
  },

  handleQualityChanging(event) {
    this.setData({
      quality: event.detail.value
    }, () => {
      this.updateEstimate()
    })
  },

  handleQualityChange(event) {
    this.setData({
      quality: event.detail.value
    }, () => {
      this.updateEstimate()
    })
  },

  async handleSubmit() {
    const { selectedFile, quality } = this.data
    if (!selectedFile) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交中' })
      const result = await upload('/tool/compress-image', selectedFile.path, {
        originalFileName: selectedFile.name,
        quality: quality / 100
      })
      wx.hideLoading()

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'compress-image',
        sourceFileName: selectedFile.name,
        createdAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
      })

      wx.navigateTo({ url: `/pages/task-detail/index?taskId=${result.data}` })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    }
  }
})
