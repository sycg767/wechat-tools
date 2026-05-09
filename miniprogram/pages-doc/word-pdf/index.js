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
      endpoint: '/tool/word-to-pdf',
      toolType: 'word-pdf',
      allowedExtensions: ['.doc', '.docx'],
      emptyTip: '请先选择 Word 文件',
      extensionTip: '只支持 Word 文件'
    })
  }
})
