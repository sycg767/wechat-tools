const STORAGE_KEY = 'tool_tasks'
const MAX_TASKS = 20

function getTasks() {
  return wx.getStorageSync(STORAGE_KEY) || []
}

function saveTasks(tasks) {
  wx.setStorageSync(STORAGE_KEY, tasks.slice(0, MAX_TASKS))
}

function upsertTask(task) {
  const tasks = getTasks()
  const index = tasks.findIndex((item) => item.taskId === task.taskId)
  const merged = {
    ...(index >= 0 ? tasks[index] : {}),
    ...task
  }

  if (index >= 0) {
    tasks.splice(index, 1)
  }

  tasks.unshift(merged)
  saveTasks(tasks)
  return merged
}

function getTask(taskId) {
  return getTasks().find((item) => item.taskId === taskId) || null
}

module.exports = {
  getTasks,
  getTask,
  upsertTask
}
