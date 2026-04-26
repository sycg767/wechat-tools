const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    selectedFile: null,
    bgColor: 'blue',
    colorOptions: [
      { label: '蓝底', value: 'blue', previewClass: 'preview-blue' },
      { label: '白底', value: 'white', previewClass: 'preview-white' },
      { label: '红底', value: 'red', previewClass: 'preview-red' }
    ]
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    })
  },

  handleColorChange(event) {
    this.setData({
      bgColor: event.currentTarget.dataset.value
    })
  },

  async handleSubmit() {
    const { selectedFile, bgColor } = this.data
    if (!selectedFile) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交中' })
      const result = await upload('/tool/change-id-photo-bg', selectedFile.path, {
        originalFileName: selectedFile.name,
        bgColor
      })
      wx.hideLoading()

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'id-photo-bg',
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
