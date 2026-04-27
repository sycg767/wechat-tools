Page({
  data: {
    tools: [
      {
        title: '文件重命名',
        desc: '上传文件并生成新的文件名',
        path: '/pages/rename/rename',
        iconClass: 'icon-rename',
        tag: '常用'
      },
      {
        title: 'PDF 转 Word',
        desc: '上传 PDF 并生成 Word 文档',
        path: '/pages/pdf-word/index',
        iconClass: 'icon-pdf-word',
        tag: '推荐'
      },
      {
        title: 'PDF 转 Excel',
        desc: '页面骨架已完成，等待后端接口',
        path: '/pages/pdf-excel/index',
        iconClass: 'icon-pdf-excel',
        tag: '开发中',
        disabled: false
      },
      {
        title: '图片压缩',
        desc: '页面骨架已完成，等待后端接口',
        path: '/pages/compress-image/index',
        iconClass: 'icon-image',
        tag: '开发中',
        disabled: false
      },
      {
        title: '证件照换底色',
        desc: '上传人像照片并切换红蓝白背景',
        path: '/pages/id-photo-bg/index',
        iconClass: 'icon-id-photo',
        tag: '新增'
      },
      {
        title: 'PDF 合并',
        desc: '将多个 PDF 文件合并为一个',
        path: '/pages/pdf-merge/index',
        iconClass: 'icon-pdf-merge',
        tag: '新增'
      },
      {
        title: 'PDF 拆分',
        desc: '提取 PDF 指定页面',
        path: '/pages/pdf-split/index',
        iconClass: 'icon-pdf-split',
        tag: '新增'
      },
      {
        title: 'PDF 水印',
        desc: '为 PDF 添加或去除水印',
        path: '/pages/pdf-watermark/index',
        iconClass: 'icon-pdf-watermark',
        tag: '新增'
      },
      {
        title: 'Word 转 PDF',
        desc: '上传 Word 并生成 PDF 文件',
        path: '/pages/word-pdf/index',
        iconClass: 'icon-word-pdf',
        tag: '新增'
      },
      {
        title: 'CSV / Excel 互转',
        desc: 'CSV 与 Excel 格式互相转换',
        path: '/pages/csv-excel/index',
        iconClass: 'icon-csv-excel',
        tag: '新增'
      },
      {
        title: '任务历史',
        desc: '查看处理中与已完成的任务结果',
        path: '/pages/tasks/index',
        iconClass: 'icon-tasks'
      }
    ]
  },

  handleToolTap(event) {
    const { path, disabled } = event.currentTarget.dataset
    if (disabled) {
      wx.showToast({ title: '该功能开发中', icon: 'none' })
      return
    }
    wx.navigateTo({ url: path })
  },

  goToTasks() {
    wx.navigateTo({ url: '/pages/tasks/index' })
  }
})
