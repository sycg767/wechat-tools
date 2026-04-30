const request = require('../../utils/request')
const { openFile, canOpenFile, isImageFile, saveImageToAlbum } = require('../../utils/open-file')
const taskStore = require('../../utils/task-store')
const { formatRelativeTime } = require('../../utils/time')

Page({
  data: {
    task: null,
    loading: true
  },

  onLoad(query) {
    const taskId = query.taskId
    if (!taskId) {
      wx.showToast({ title: '任务不存在', icon: 'none' })
      return
    }

    const localTask = taskStore.getTask(taskId)
    if (localTask) {
      this.setData({
        task: this.decorateTask(localTask),
        loading: false
      })
    }

    this.taskId = taskId
    this.loadTask()
  },

  onUnload() {
    this.clearPolling()
  },

  clearPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  },

  decorateTask(task) {
    const strategyTraceText = Array.isArray(task.strategyTrace) ? task.strategyTrace.join(' -> ') : ''
    const qualityGateText = task.qualityGate
      ? `通过:${task.qualityGate.passed ? '是' : '否'} 变化:${task.qualityGate.changeRatio || 0}%`
      : ''
    
    const statusMap = {
      'PROCESSING': '处理中',
      'SUCCESS': '已完成',
      'FAIL': '处理失败'
    }

    const toolMap = {
      'pdf-merge': 'PDF 合并',
      'pdf-split': 'PDF 拆分',
      'pdf-word': 'PDF 转 Word',
      'word-pdf': 'Word 转 PDF',
      'pdf-excel': 'PDF 转 Excel',
      'pdf-watermark': 'PDF 水印',
      'compress-image': '图片压缩',
      'id-photo-bg': '证件照换底',
      'csv-excel': 'CSV/Excel 转换',
      'rename': '批量重命名',
      'eat-what': '吃什么',
      'random-gen': '随机生成',
      'qr-generate': '二维码生成',
      'qr-decode': '二维码识别',
      'king-score-ocr': '战绩识别',
      'pdf-page-manage': 'PDF 页面管理'
    }

    return {
      ...task,
      statusText: statusMap[task.status] || task.status,
      toolTypeText: toolMap[task.toolType] || task.toolType || '未知工具',
      canOpen: canOpenFile(task.resultFileName || ''),
      isImage: isImageFile(task.resultFileName || ''),
      strategyTraceText,
      qualityGateText,
      updatedAtText: formatRelativeTime(task.updatedAt)
    }
  },

  async loadTask() {
    this.clearPolling()
    try {
      const res = await request.get(`/file/status/${this.taskId}`)
      // 确保后端返回的 sourceFileName 能够覆盖本地可能不准确的缓存
      const task = this.decorateTask(res.data)
      taskStore.upsertTask(res.data)
      this.setData({ task, loading: false })

      if (task.status === 'PROCESSING') {
        this.pollTimer = setTimeout(() => this.loadTask(), 1500)
      }
    } catch (error) {
      const task = this.data.task || taskStore.getTask(this.taskId)
      this.setData({ task: task ? this.decorateTask(task) : null, loading: false })
      if (!task) {
        wx.showToast({ title: error.message || '任务状态获取失败', icon: 'none' })
      }
    }
  },

  async handleOpenFile() {
    const { task } = this.data
    if (!task || !task.resultUrl) {
      return
    }

    try {
      await openFile(task.resultUrl, task.resultFileName)
    } catch (error) {
      wx.showToast({ title: error.message || '打开文件失败', icon: 'none' })
    }
  },

  async handleSaveImage() {
    const { task } = this.data
    if (!task || !task.resultUrl || !task.isImage) {
      return
    }

    try {
      wx.showLoading({ title: '保存中' })
      await saveImageToAlbum(task.resultUrl, task.resultFileName)
      wx.hideLoading()
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (error) {
      wx.hideLoading()
      const message = error.message || '保存失败'
      if (message.includes('权限')) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许“保存到相册”权限后重试。',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({})
            }
          }
        })
        return
      }
      wx.showToast({ title: message, icon: 'none' })
    }
  },

  async handleShareFile() {
    const { task } = this.data
    if (!task || !task.resultUrl) return

    try {
      wx.showLoading({ title: '准备中' })
      
      // 1. 下载文件获取临时路径
      const downloadRes = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: task.resultUrl,
          success: (res) => {
            if (res.statusCode === 200) resolve(res)
            else reject(new Error('下载失败'))
          },
          fail: reject
        })
      })

      wx.hideLoading()

      // 2. 调用微信转发文件接口
      await new Promise((resolve, reject) => {
        wx.shareFileMessage({
          filePath: downloadRes.tempFilePath,
          fileName: task.resultFileName || '文件',
          success: resolve,
          fail: (err) => {
            // 如果用户取消分享，不视为错误
            if (err.errMsg.includes('cancel')) resolve()
            else reject(err)
          }
        })
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '分享失败', icon: 'none' })
    }
  }
})
