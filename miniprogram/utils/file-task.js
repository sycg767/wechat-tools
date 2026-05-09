const upload = require('./upload')
const taskStore = require('./task-store')

/**
 * 「上传文件 → 建任务 → 跳转任务详情」的统一封装。
 *
 * 通过把每个工具页都长得一模一样的逻辑收口在这里，让 Page 只描述「我是谁、接什么文件」。
 *
 * @param {object} page Page 实例（通常传 this）。要求 page.data.selectedFile 已被赋值。
 * @param {object} opts
 * @param {string} opts.endpoint   后端接口路径，例如 '/tool/pdf-to-word'
 * @param {string} opts.toolType   任务类型，对应后端 createTask 的 type，例如 'pdf-word'
 * @param {string[]} [opts.allowedExtensions] 允许的小写后缀数组，如 ['.pdf']
 * @param {string} [opts.emptyTip='请先选择文件']
 * @param {string} [opts.extensionTip='文件格式不支持']
 * @param {object} [opts.extraFormData] 额外的表单字段（例如 quality / bgColor）
 */
async function submitFileTask(page, opts) {
  const {
    endpoint,
    toolType,
    allowedExtensions,
    emptyTip = '请先选择文件',
    extensionTip = '文件格式不支持',
    extraFormData = {}
  } = opts || {}

  const { selectedFile } = page.data || {}
  if (!selectedFile) {
    wx.showToast({ title: emptyTip, icon: 'none' })
    return null
  }

  if (Array.isArray(allowedExtensions) && allowedExtensions.length) {
    const lower = (selectedFile.name || '').toLowerCase()
    const ok = allowedExtensions.some((ext) => lower.endsWith(ext))
    if (!ok) {
      wx.showToast({ title: extensionTip, icon: 'none' })
      return null
    }
  }

  try {
    wx.showLoading({ title: '上传中 0%', mask: true })
    const result = await upload(
      endpoint,
      selectedFile.path,
      { originalFileName: selectedFile.name, ...extraFormData },
      {
        onProgress: ({ progress }) => {
          wx.showLoading({ title: `上传中 ${progress}%`, mask: true })
        },
        onResponsePending: () => {
          wx.showLoading({ title: '等待响应', mask: true })
        }
      }
    )
    wx.showLoading({ title: '提交任务中', mask: true })

    const taskId = result.data
    taskStore.upsertTask({
      taskId,
      toolType,
      sourceFileName: selectedFile.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'PROCESSING',
      resultUrl: '',
      resultFileName: ''
    })

    wx.hideLoading()
    wx.navigateTo({ url: `/pages/task-detail/index?taskId=${taskId}` })
    return taskId
  } catch (error) {
    wx.hideLoading()
    wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' })
    return null
  }
}

/** 多数页面共用的文件选中回调，省一行模板代码。 */
function onFileSelected(page, event) {
  page.setData({ selectedFile: event.detail.file })
}

module.exports = {
  submitFileTask,
  onFileSelected
}
