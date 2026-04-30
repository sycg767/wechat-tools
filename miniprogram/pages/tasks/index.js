const request = require('../../utils/request')
const taskStore = require('../../utils/task-store')
const { formatRelativeTime } = require('../../utils/time')

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
      updatedAtText: formatRelativeTime(task.updatedAt)
    }
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
