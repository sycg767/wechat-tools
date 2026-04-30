const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    mode: 'csv-excel', // csv-excel or excel-csv
    selectedFile: null
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      mode,
      selectedFile: null
    })
  },

  handleFileSelected(event) {
    this.setData({
      selectedFile: event.detail.file
    })
  },

  async handleSubmit() {
    const { selectedFile, mode } = this.data
    if (!selectedFile) {
      wx.showToast({ title: '请先选择文件', icon: 'none' })
      return
    }

    const isCsvToExcel = mode === 'csv-excel'
    
    if (isCsvToExcel && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      wx.showToast({ title: '请选择 CSV 文件', icon: 'none' })
      return
    }
    if (!isCsvToExcel && !selectedFile.name.toLowerCase().endsWith('.xls') && !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      wx.showToast({ title: '请选择 Excel 文件', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '上传中 0%' })
      const apiUrl = isCsvToExcel ? '/tool/csv-to-excel' : '/tool/excel-to-csv'
      const result = await upload(apiUrl, selectedFile.path, {
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
        toolType: mode,
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