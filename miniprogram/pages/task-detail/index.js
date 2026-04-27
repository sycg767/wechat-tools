const request = require('../../utils/request')
const { openFile, canOpenFile, isImageFile, saveImageToAlbum } = require('../../utils/open-file')
const taskStore = require('../../utils/task-store')

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
    return {
      ...task,
      canOpen: canOpenFile(task.resultFileName || ''),
      isImage: isImageFile(task.resultFileName || ''),
      strategyTraceText,
      qualityGateText
    }
  },

  async loadTask() {
    this.clearPolling()
    try {
      const res = await request.get(`/file/status/${this.taskId}`)
      const task = this.decorateTask(res.data)
      taskStore.upsertTask(task)
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
