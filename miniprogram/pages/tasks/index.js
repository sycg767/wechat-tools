const request = require('../../utils/request')
const taskStore = require('../../utils/task-store')
const { formatRelativeTime } = require('../../utils/time')
require('../../utils/file-task')
require('../../utils/ai-config')

const TOOL_MAP = {
  'pdf-merge': 'PDF 合并',
  'pdf-split': 'PDF 拆分',
  'pdf-word': 'PDF 转 Word',
  'word-pdf': 'Word 转 PDF',
  'pdf-excel': 'PDF 转 Excel',
  'pdf-watermark': 'PDF 水印',
  'pdf-add-watermark': 'PDF 水印',
  'compress-image': '图片压缩',
  'id-photo-bg': '证件照换底',
  'csv-excel': 'CSV 转 Excel',
  'excel-csv': 'Excel 转 CSV',
  'rename': '批量重命名',
  'random-gen': '随机生成',
  'qr-generate': '二维码生成',
  'qr-decode': '二维码识别',
  'king-score-ocr': '战绩识别',
  'pdf-page-manage': 'PDF 页面管理',
  'pdf-images': 'PDF 转图片',
  'md-pdf': 'Markdown 转 PDF',
  'md-word': 'Markdown 转 Word',
  'pdf-sign': 'PDF 电子签字'
}

Page({
  data: {
    tasks: []
  },

  onShow() {
    this.loadTasks()
  },

  loadTasks() {
    const tasks = taskStore.getTasks().map(this.decorateTask)
    this.setData({ tasks })
    tasks.filter((item) => item.status === 'PROCESSING').forEach((item) => {
      this.refreshTask(item.taskId)
    })
  },

  decorateTask(task) {
    return {
      ...task,
      toolTypeText: TOOL_MAP[task.toolType] || task.toolType || '工具',
      updatedAtText: formatRelativeTime(task.updatedAt)
    }
  },

  goToHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  async refreshTask(taskId) {
    try {
      const res = await request.get(`/file/status/${taskId}`)
      taskStore.upsertTask(res.data)
      this.setData({ tasks: taskStore.getTasks().map(this.decorateTask) })
    } catch (error) {
      this.setData({ tasks: taskStore.getTasks().map(this.decorateTask) })
    }
  },

  handleTaskTap(event) {
    const { taskId } = event.currentTarget.dataset
    wx.navigateTo({ url: `/pages/task-detail/index?taskId=${taskId}` })
  }
})
