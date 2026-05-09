const { submitFileTask, onFileSelected } = require('../../utils/file-task')

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
    onFileSelected(this, event)
  },

  handleColorChange(event) {
    this.setData({ bgColor: event.currentTarget.dataset.value })
  },

  async handleSubmit() {
    await submitFileTask(this, {
      endpoint: '/tool/change-id-photo-bg',
      toolType: 'id-photo-bg',
      emptyTip: '请先选择图片',
      extraFormData: { bgColor: this.data.bgColor }
    })
  }
})
