const { submitFileTask, onFileSelected } = require('../../utils/file-task')

Page({
  data: {
    mode: 'csv-excel', // csv-excel or excel-csv
    selectedFile: null
  },

  switchMode(e) {
    this.setData({
      mode: e.currentTarget.dataset.mode,
      selectedFile: null
    })
  },

  handleFileSelected(event) {
    onFileSelected(this, event)
  },

  async handleSubmit() {
    const isCsvToExcel = this.data.mode === 'csv-excel'
    await submitFileTask(this, {
      endpoint: isCsvToExcel ? '/tool/csv-to-excel' : '/tool/excel-to-csv',
      toolType: this.data.mode,
      allowedExtensions: isCsvToExcel ? ['.csv'] : ['.xls', '.xlsx'],
      emptyTip: '请先选择文件',
      extensionTip: isCsvToExcel ? '请选择 CSV 文件' : '请选择 Excel 文件'
    })
  }
})
