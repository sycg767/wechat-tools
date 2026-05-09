const { post } = require('../../utils/request')
const taskStore = require('../../utils/task-store')

const SAMPLE = `# 标题示例

这是一段普通文字，支持 **加粗**、*斜体*、~~删除线~~ 和 [链接](https://www.example.com)。

## 列表

- 第一项
- 第二项
  - 嵌套列表
- 第三项

1. 有序一
2. 有序二

## 任务列表

- [x] 已完成
- [ ] 待办

## 表格

| 工具 | 用途 |
| --- | --- |
| PDF 签字 | 给 PDF 戳手写签名 |
| MD 转换 | Markdown 导出 PDF/Word |

## 代码

\`\`\`js
const hello = (name) => \`你好，\${name}\`
console.log(hello('世界'))
\`\`\`

> 引用块：写作完成后一键导出 PDF / Word，再无需打开电脑。
`

Page({
  data: {
    content: '',
    title: '',
    submitting: false
  },

  onLoad() {
    this.setData({ content: SAMPLE, title: '我的Markdown文档' })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  chooseMdFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['md'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        wx.getFileSystemManager().readFile({
          filePath: file.path, encoding: 'utf-8',
          success: (r) => {
            const name = file.name.replace(/\.md$/i, '')
            this.setData({ content: r.data || '', title: name })
          },
          fail: () => wx.showToast({ title: '读取文件失败', icon: 'none' })
        })
      }
    })
  },

  loadSample() {
    this.setData({ content: SAMPLE })
  },

  clearAll() {
    this.setData({ content: '', title: '我的Markdown文档' })
  },

  exportPdf() { this.submit('/tool/md-to-pdf', 'md-pdf', '.pdf') },
  exportWord() { this.submit('/tool/md-to-word', 'md-word', '.doc') },

  async submit(endpoint, toolType, ext) {
    const { content, title } = this.data
    if (!content || !content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    if (content.length > 200000) {
      wx.showToast({ title: '内容过长，请控制在 20 万字内', icon: 'none' })
      return
    }
    const safeTitle = (title && title.trim()) || 'Markdown文档'
    this.setData({ submitting: true })
    try {
      wx.showLoading({ title: '提交中', mask: true })
      const res = await post(endpoint, { content, title: safeTitle + ext },
        { 'Content-Type': 'application/json' })
      const taskId = res.data
      taskStore.upsertTask({
        taskId,
        toolType,
        sourceFileName: safeTitle + ext,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '', resultFileName: ''
      })
      wx.hideLoading()
      wx.navigateTo({ url: `/pages/task-detail/index?taskId=${taskId}` })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
