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
      wx.showToast({ title: '请先选择 PDF 文件', icon: 'none' })
      return
    }
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      wx.showToast({ title: '只支持 PDF 文件', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '上传中 0%' })
      const result = await upload('/tool/pdf-to-word', selectedFile.path, {
        originalFileName: selectedFile.name
      }, {
        onProgress: ({ progress }) => {
          wx.showLoading({ title: `上传中 ${progress}%` })
        },
        onResponsePending: () => {
          wx.showLoading({ title: '等待响应' })
        }
      })
      wx.showLoading({ title: '提交任务中' })

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'pdf-word',
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
  }
})
