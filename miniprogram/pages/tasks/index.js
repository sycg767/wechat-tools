const request = require('../../utils/request')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    tasks: []
  },

  onShow() {
    this.loadTasks()
  },

  loadTasks() {
    const tasks = taskStore.getTasks()
    this.setData({ tasks })
    tasks.filter((item) => item.status === 'PROCESSING').forEach((item) => {
      this.refreshTask(item.taskId)
    })
  },

  async refreshTask(taskId) {
    try {
      const res = await request.get(`/file/status/${taskId}`)
      taskStore.upsertTask(res.data)
      this.setData({ tasks: taskStore.getTasks() })
    } catch (error) {
      this.setData({ tasks: taskStore.getTasks() })
    }
  },

  handleTaskTap(event) {
    const { taskId } = event.currentTarget.dataset
    wx.navigateTo({ url: `/pages/task-detail/index?taskId=${taskId}` })
  }
})
