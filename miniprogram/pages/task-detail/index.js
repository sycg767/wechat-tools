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
    return {
      ...task,
      canOpen: canOpenFile(task.resultFileName || ''),
      isImage: isImageFile(task.resultFileName || '')
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
      await saveImageToAlbum(task.resultUrl)
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
  }
})
