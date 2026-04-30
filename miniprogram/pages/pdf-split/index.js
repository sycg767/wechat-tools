const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    selectedFile: null,
    range: '',
    taskId: ''
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    })
  },

  handleRangeInput(e) {
    this.setData({
      range: e.detail.value
    })
  },

  async handleSubmit() {
    const { selectedFile, range } = this.data
    if (!selectedFile) {
      wx.showToast({ title: '请先选择 PDF 文件', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交中' })
      const result = await upload('/tool/pdf-split', selectedFile.path, {
        originalFileName: selectedFile.name,
        range: range
      })
      wx.hideLoading()

      this.setData({ taskId: result.data })

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'pdf-split',
        sourceFileName: selectedFile.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
      })

      wx.navigateTo({ url: `/pages/task-detail/index?taskId=${result.data}` })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    }
  },

  handleTaskComplete(e) {
    // 任务完成后的处理
  }
})