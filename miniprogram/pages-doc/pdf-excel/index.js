const { submitFileTask, onFileSelected } = require('../../utils/file-task')

Page({
  data: {
    selectedFile: null
  },

  handleFileSelected(event) {
    onFileSelected(this, event)
  },

  async handleSubmit() {
    await submitFileTask(this, {
      endpoint: '/tool/pdf-to-excel',
      toolType: 'pdf-excel',
      allowedExtensions: ['.pdf'],
      emptyTip: '请先选择 PDF 文件',
      extensionTip: '只支持 PDF 文件'
    })
  }
})
