const request = require('../../utils/request')
const { openFile, canOpenFile } = require('../../utils/open-file')
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
        task: {
          ...localTask,
          canOpen: canOpenFile(localTask.resultFileName || '')
        },
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

  async loadTask() {
    this.clearPolling()
    try {
      const res = await request.get(`/file/status/${this.taskId}`)
      const task = {
        ...res.data,
        canOpen: canOpenFile(res.data.resultFileName || '')
      }
      taskStore.upsertTask(task)
      this.setData({ task, loading: false })

      if (task.status === 'PROCESSING') {
        this.pollTimer = setTimeout(() => this.loadTask(), 1500)
      }
    } catch (error) {
      const task = this.data.task || taskStore.getTask(this.taskId)
      this.setData({ task: task || null, loading: false })
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
  }
})
