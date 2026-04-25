const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    selectedFile: null,
    quality: 80
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    })
  },

  handleQualityChange(event) {
    this.setData({
      quality: event.detail.value
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
