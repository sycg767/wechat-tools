const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')
const { request } = require('../../utils/request')

const MAX_PREVIEW_HEIGHT = 600 // rpx 缩略图高度上限

Page({
  data: {
    pdfFile: null,            // {path, name, size}
    previewLoading: false,
    pages: [],                // [{pageNo, thumbnailBase64, width, height, displayHeight, displayWidth}]
    totalPages: 0,
    currentPageIdx: 0,        // 当前显示哪一页
    signatureBase64: '',      // data:image/png;base64,...
    placements: [],           // 已放置的签名: [{page, relX, relY, relW, relH, key}]
    signatureSize: 0.18,      // 签名宽度占页面比例（默认 18%）
    submitting: false
  },

  // ============== 选择 PDF ==============
  async chooseFile() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMessageFile({
          count: 1,
          type: 'file',
          extension: ['pdf'],
          success: resolve,
          fail: reject
        })
      })
      const file = res.tempFiles && res.tempFiles[0]
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        wx.showToast({ title: '请选择 PDF 文件', icon: 'none' })
        return
      }
      this.setData({
        pdfFile: { path: file.path, name: file.name, size: file.size },
        pages: [],
        placements: [],
        currentPageIdx: 0
      })
      this.loadPreview()
    } catch (e) {
      // 用户取消
    }
  },

  async loadPreview() {
    const { pdfFile } = this.data
    if (!pdfFile) return
    this.setData({ previewLoading: true })
    try {
      wx.showLoading({ title: '生成预览中', mask: true })
      const res = await upload('/tool/pdf-page-manage-preview', pdfFile.path, {})
      const pages = (res.data.pages || []).map((p) => {
        // 算出缩略图在前端展示的尺寸（保持比例，宽度满）
        const ratio = p.height / p.width
        return { ...p, ratio }
      })
      this.setData({
        pages,
        totalPages: res.data.totalPages,
        currentPageIdx: 0
      })
    } catch (e) {
      wx.showToast({ title: e.message || '预览失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ previewLoading: false })
    }
  },

  // ============== 翻页 ==============
  switchPage(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    if (Number.isNaN(idx)) return
    this.setData({ currentPageIdx: idx })
  },

  // ============== 画 / 选签名 ==============
  goDrawSignature() {
    wx.navigateTo({
      url: '/pages-tool/signature-editor/index',
      events: {
        signatureSaved: (data) => {
          // signature-editor 把 PNG 临时路径回传，转成 base64 给我们
          if (data && data.tempFilePath) {
            wx.getFileSystemManager().readFile({
              filePath: data.tempFilePath,
              encoding: 'base64',
              success: (res) => {
                this.setData({
                  signatureBase64: 'data:image/png;base64,' + res.data
                })
                wx.showToast({ title: '签名已就绪', icon: 'success' })
              },
              fail: () => {
                wx.showToast({ title: '签名读取失败', icon: 'none' })
              }
            })
          }
        }
      }
    })
  },

  pickSignatureImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles[0]
        wx.getFileSystemManager().readFile({
          filePath: file.tempFilePath,
          encoding: 'base64',
          success: (r) => {
            this.setData({
              signatureBase64: 'data:image/png;base64,' + r.data
            })
            wx.showToast({ title: '签名已上传', icon: 'success' })
          }
        })
      }
    })
  },

  // ============== 在缩略图上点击放置 ==============
  async onPageTap(e) {
    const { signatureBase64, pages, currentPageIdx, signatureSize, placements } = this.data
    if (!signatureBase64) {
      wx.showToast({ title: '请先准备签名', icon: 'none' })
      return
    }
    const page = pages[currentPageIdx]
    if (!page) return

    // 拿到容器实际像素尺寸，再算归一化坐标
    const query = wx.createSelectorQuery().in(this)
    query.select('#page-canvas').boundingClientRect()
    const rect = await new Promise((resolve) => query.exec((res) => resolve(res[0])))
    if (!rect) return

    const offsetX = e.detail.x - rect.left
    const offsetY = e.detail.y - rect.top
    const relX = Math.max(0, Math.min(1, offsetX / rect.width))
    const relY = Math.max(0, Math.min(1, offsetY / rect.height))

    // 签名按 PDF 实际比例展示，高 = 宽 / 签名图原比例（这里简化用 0.4）
    const relW = signatureSize
    const relH = relW * 0.4

    placements.push({
      key: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      page: page.pageNo,
      relX: relX - relW / 2, // 以点击点为中心
      relY: relY - relH / 2,
      relW,
      relH
    })
    this.setData({ placements })
  },

  removePlacement(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      placements: this.data.placements.filter((p) => p.key !== key)
    })
  },

  changeSize(e) {
    this.setData({ signatureSize: e.detail.value })
  },

  clearAll() {
    this.setData({ placements: [] })
  },

  // ============== 提交 ==============
  async handleSubmit() {
    const { pdfFile, signatureBase64, placements } = this.data
    if (!pdfFile) return wx.showToast({ title: '请选择 PDF', icon: 'none' })
    if (!signatureBase64) return wx.showToast({ title: '请准备签名', icon: 'none' })
    if (!placements.length) return wx.showToast({ title: '请在 PDF 上点击放置签名', icon: 'none' })

    this.setData({ submitting: true })
    try {
      // 把 base64 签名写到临时文件，再 multipart 上传
      const fs = wx.getFileSystemManager()
      const sigPath = `${wx.env.USER_DATA_PATH}/signature_${Date.now()}.png`
      const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(sigPath, base64Data, 'base64')

      wx.showLoading({ title: '上传中', mask: true })
      const result = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${getApp().globalData.baseUrl}/tool/pdf-sign`,
          filePath: pdfFile.path,
          name: 'file',
          formData: {
            originalFileName: pdfFile.name,
            signaturesJson: JSON.stringify(
              placements.map((p) => ({
                page: p.page,
                x: p.relX,
                y: p.relY,
                width: p.relW,
                height: p.relH
              }))
            )
            // 注意：wx.uploadFile 只支持单文件 + formData，签名图必须用 file 字段，但 file 已被 PDF 占用
            // 所以这里改走双步：先上传签名拿 fileId，再调一个支持 imageFileId 的端点
          },
          success: (r) => {
            try {
              const data = JSON.parse(r.data)
              if (r.statusCode >= 200 && r.statusCode < 300 && data.code === 200) resolve(data)
              else reject(new Error((data && data.message) || `上传失败 (HTTP ${r.statusCode})`))
            } catch (e) {
              reject(new Error(`服务异常 (HTTP ${r.statusCode})`))
            }
          },
          fail: (err) => reject(new Error(err.errMsg || '上传失败'))
        })
      })

      const taskId = result.data
      taskStore.upsertTask({
        taskId,
        toolType: 'pdf-sign',
        sourceFileName: pdfFile.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'PROCESSING',
        resultUrl: '',
        resultFileName: ''
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
