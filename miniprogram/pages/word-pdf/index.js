const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    selectedFile: null
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    })
  },

  async handleSubmit() {
    const { selectedFile } = this.data
    if (!selectedFile) {
      wx.showToast({ title: '请先选择 Word 文件', icon: 'none' })
      return
    }

    const fileName = (selectedFile.name || '').toLowerCase()
    if (!fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
      wx.showToast({ title: '只支持 Word 文件', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交中' })
      const result = await upload('/tool/word-to-pdf', selectedFile.path, {
        originalFileName: selectedFile.name
      })
      wx.hideLoading()

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'word-pdf',
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
