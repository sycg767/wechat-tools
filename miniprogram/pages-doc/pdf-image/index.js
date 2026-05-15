const { submitFileTask, onFileSelected } = require('../../utils/file-task')

const DPI_OPTIONS = [
  { label: '标准', value: 144 },
  { label: '高清', value: 200 }
]

Page({
  data: {
    selectedFile: null,
    format: 'png',
    dpi: 144,
    range: '',
    dpiOptions: DPI_OPTIONS
  },

  handleFileSelected(event) {
    onFileSelected(this, event)
  },

  handleFormatChange(e) {
    this.setData({
      format: e.currentTarget.dataset.format || 'png'
    })
  },

  handleDpiChange(e) {
    const value = Number(e.currentTarget.dataset.value) || 144
    this.setData({ dpi: value })
  },

  handleRangeInput(e) {
    this.setData({ range: e.detail.value || '' })
  },

  async handleSubmit() {
    const { format, dpi, range } = this.data
    await submitFileTask(this, {
      endpoint: '/tool/pdf-to-images',
      toolType: 'pdf-images',
      allowedExtensions: ['.pdf'],
      emptyTip: '请先选择 PDF 文件',
      extensionTip: '只支持 PDF 文件',
      extraFormData: {
        format,
        dpi,
        range: (range || '').trim()
      }
    })
  }
})
