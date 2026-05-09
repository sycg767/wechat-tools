const { submitFileTask, onFileSelected } = require('../../utils/file-task')

Page({
  data: {
    selectedFile: null,
    quality: 80,
    estimatedSizeText: '',
    estimatedReduceText: '',
    originalSizeText: ''
  },

  formatFileSize(size = 0) {
    if (!size || size <= 0) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
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
      this.setData({ estimatedSizeText: '', estimatedReduceText: '', originalSizeText: '' })
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
    onFileSelected(this, event)
    this.updateEstimate()
  },

  handleQualityChanging(event) {
    this.setData({ quality: event.detail.value }, () => this.updateEstimate())
  },

  handleQualityChange(event) {
    this.setData({ quality: event.detail.value }, () => this.updateEstimate())
  },

  async handleSubmit() {
    await submitFileTask(this, {
      endpoint: '/tool/compress-image',
      toolType: 'compress-image',
      emptyTip: '请先选择图片',
      extraFormData: { quality: this.data.quality / 100 }
    })
  }
})
