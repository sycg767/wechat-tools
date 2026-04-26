const taskStore = require('../../utils/task-store')
const request = require('../../utils/request')

Page({
  data: {
    selectedFiles: [],
    fileName: '',
    draggingIndex: -1,
    startY: 0,
    itemHeight: 64 // 预估条目高度，单位 px
  },

  chooseFiles() {
    wx.chooseMessageFile({
      count: 10 - this.data.selectedFiles.length,
      type: 'file',
      extension: ['pdf'],
      success: (res) => {
        const newFiles = res.tempFiles.map(file => ({
          ...file,
          sizeText: (file.size / 1024).toFixed(2) + ' KB'
        }))
        this.setData({
          selectedFiles: [...this.data.selectedFiles, ...newFiles]
        })
      }
    })
  },

  removeFile(e) {
    const { index } = e.currentTarget.dataset
    const { selectedFiles } = this.data
    selectedFiles.splice(index, 1)
    this.setData({ selectedFiles })
  },

  touchStart(e) {
    const { index } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    this.setData({
      draggingIndex: index,
      startY: e.touches[0].clientY
    })
  },

  touchMove(e) {
    const { draggingIndex, startY, selectedFiles, itemHeight } = this.data
    if (draggingIndex === -1) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY
    
    const newFiles = [...selectedFiles]
    newFiles[draggingIndex].offset = deltaY

    // 实时计算目标位置并让其他项产生位移感
    const targetIndex = Math.max(0, Math.min(selectedFiles.length - 1, draggingIndex + Math.round(deltaY / itemHeight)))
    
    newFiles.forEach((item, idx) => {
      if (idx === draggingIndex) return
      
      // 如果当前项在拖拽项和目标位置之间，则产生反向位移
      if (draggingIndex < targetIndex && idx > draggingIndex && idx <= targetIndex) {
        item.offset = -itemHeight
      } else if (draggingIndex > targetIndex && idx < draggingIndex && idx >= targetIndex) {
        item.offset = itemHeight
      } else {
        item.offset = 0
      }
    })
    
    this.setData({ selectedFiles: newFiles })
  },

  touchEnd(e) {
    const { draggingIndex, selectedFiles, startY, itemHeight } = this.data
    if (draggingIndex === -1) return

    const currentY = e.changedTouches[0].clientY
    const deltaY = currentY - startY
    const targetIndex = Math.max(0, Math.min(selectedFiles.length - 1, draggingIndex + Math.round(deltaY / itemHeight)))

    const newFiles = [...selectedFiles]
    const [movedItem] = newFiles.splice(draggingIndex, 1)
    newFiles.splice(targetIndex, 0, movedItem)

    // 重置所有偏移
    newFiles.forEach(item => item.offset = 0)

    this.setData({
      selectedFiles: newFiles,
      draggingIndex: -1
    })
  },

  handleFileNameInput(e) {
    this.setData({
      fileName: e.detail.value
    })
  },

  async handleSubmit() {
    const { selectedFiles } = this.data
    if (selectedFiles.length < 2) {
      wx.showToast({ title: '请至少选择两个 PDF 文件', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '上传文件中' })
      
      const fileIds = []
      for (let i = 0; i < selectedFiles.length; i++) {
        wx.showLoading({ title: `上传中 (${i + 1}/${selectedFiles.length})` })
        const res = await this.uploadOneFile(selectedFiles[i])
        fileIds.push(res.data.fileId)
      }
      
      wx.showLoading({ title: '提交合并任务' })
      const result = await request.post('/tool/pdf-merge-by-ids', {
        fileIds,
        fileName: this.data.fileName
      })
      
      wx.hideLoading()

      taskStore.upsertTask({
        taskId: result.data,
        toolType: 'pdf-merge',
        sourceFileName: this.data.fileName || '合并文档',
        createdAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
      })

      wx.navigateTo({ url: `/pages/task-detail/index?taskId=${result.data}` })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    }
  },
  
  uploadOneFile(file) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: getApp().globalData.baseUrl + '/file/upload',
        filePath: file.path,
        name: 'file',
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 200) {
              resolve(data)
            } else {
              reject(new Error(data.message))
            }
          } catch (e) {
            reject(new Error('解析响应失败'))
          }
        },
        fail: reject
      })
    })
  }
})