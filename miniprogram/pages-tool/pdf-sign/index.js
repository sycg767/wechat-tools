const upload = require('../../utils/upload')
const taskStore = require('../../utils/task-store')

Page({
  data: {
    pdfFile: null,
    previewLoading: false,
    pages: [],
    totalPages: 0,
    currentPageIdx: 0,
    signatureBase64: '',
    signatureFileId: '',
    signatureRatio: 0.4,
    placements: [],
    selectedPlacementKey: '',
    signatureSize: 0.18,
    submitting: false
  },

  async chooseFile() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMessageFile({
          count: 1, type: 'file', extension: ['pdf'],
          success: resolve, fail: reject
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
        pages: [], placements: [], currentPageIdx: 0, selectedPlacementKey: ''
      })
      this.loadPreview()
    } catch (e) {}
  },

  async loadPreview() {
    const { pdfFile } = this.data
    if (!pdfFile) return
    this.setData({ previewLoading: true })
    try {
      wx.showLoading({ title: '生成预览中', mask: true })
      const res = await upload('/tool/pdf-page-manage-preview', pdfFile.path, {})
      const pages = (res.data.pages || []).map((p) => ({
        ...p,
        ratio: p.height / p.width
      }))
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

  switchPage(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    if (Number.isNaN(idx)) return
    const page = this.data.pages[idx]
    const selected = this.data.placements.find((p) => p.key === this.data.selectedPlacementKey)
    this.setData({
      currentPageIdx: idx,
      selectedPlacementKey: selected && page && selected.page === page.pageNo ? selected.key : ''
    })
  },

  goDrawSignature() {
    wx.navigateTo({
      url: '/pages-tool/signature-editor/index'
    })
  },

  applySignatureResult(result) {
    if (result && result.tempFilePath) {
      this.uploadSignatureFile(result.tempFilePath)
    }
  },

  pickSignatureImage() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.uploadSignatureFile(file.tempFilePath)
      }
    })
  },

  async uploadSignatureFile(tempFilePath) {
    try {
      wx.showLoading({ title: '上传签名中', mask: true })
      const [res, imageInfo, base64] = await Promise.all([
        upload('/file/upload', tempFilePath, {}),
        this.getImageInfo(tempFilePath).catch(() => null),
        this.readFileBase64(tempFilePath).catch(() => '')
      ])
      const fileId = res.data && res.data.fileId
      if (!fileId) throw new Error('签名上传失败')
      this.setData({
        signatureFileId: fileId,
        signatureBase64: base64 ? 'data:image/png;base64,' + base64 : this.data.signatureBase64,
        signatureRatio: imageInfo && imageInfo.width ? imageInfo.height / imageInfo.width : 0.4,
        selectedPlacementKey: ''
      })
      wx.showToast({ title: '签名已就绪', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: e.message || '签名上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({ src, success: resolve, fail: reject })
    })
  },

  readFileBase64(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  },

  async onPageTap(e) {
    const { signatureFileId, pages, currentPageIdx, signatureSize, placements, selectedPlacementKey } = this.data
    if (!signatureFileId) {
      wx.showToast({ title: '请先准备签名', icon: 'none' })
      return
    }
    const page = pages[currentPageIdx]
    if (!page) return

    const rect = await this.getPageRect()
    if (!rect) return

    const point = this.getEventPoint(e)
    const relPoint = this.toRelativePoint(point, rect)
    if (!relPoint) return

    const relW = Number(signatureSize)
    const relH = this.calcRelHeight(relW, page)

    if (selectedPlacementKey) {
      // 已有选中签名 → 移动选中签名到点击位置
      const next = placements.map(p => {
        if (p.key !== selectedPlacementKey) return p
        return this.clampPlacement({
          ...p,
          relX: relPoint.relX - relW / 2,
          relY: relPoint.relY - relH / 2,
          relW,
          relH
        })
      })
      this.setData({ placements: next, selectedPlacementKey: '' })
    } else {
      // 无选中 → 新建签名
      const placement = this.clampPlacement({
        key: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        page: page.pageNo,
        relX: relPoint.relX - relW / 2,
        relY: relPoint.relY - relH / 2,
        relW,
        relH
      })
      this.setData({
        placements: placements.concat(placement),
        selectedPlacementKey: placement.key
      })
    }
  },

  onPlacementTap(e) {
    const key = e.currentTarget.dataset.key
    const { selectedPlacementKey } = this.data
    // 点击已是选中的签名 → 取消选中
    if (key === selectedPlacementKey) {
      this.setData({ selectedPlacementKey: '' })
      return
    }
    const placement = this.data.placements.find((p) => p.key === key)
    if (!placement) return
    this.setData({
      selectedPlacementKey: key,
      signatureSize: placement.relW
    })
  },

  async onPlacementTouchStart(e) {
    const key = e.currentTarget.dataset.key
    const placement = this.data.placements.find((p) => p.key === key)
    if (!placement) return
    const rect = await this.getPageRect()
    const point = this.getEventPoint(e)
    if (!rect || !point) return
    this.dragState = {
      key,
      rect,
      startX: point.x,
      startY: point.y,
      startRelX: placement.relX,
      startRelY: placement.relY
    }
    this.setData({
      selectedPlacementKey: key,
      signatureSize: placement.relW
    })
  },

  onPlacementTouchMove(e) {
    const drag = this.dragState
    if (!drag) return
    const point = this.getEventPoint(e)
    if (!point) return
    const dx = (point.x - drag.startX) / drag.rect.width
    const dy = (point.y - drag.startY) / drag.rect.height
    const placements = this.data.placements.map((p) => {
      if (p.key !== drag.key) return p
      return this.clampPlacement({
        ...p,
        relX: drag.startRelX + dx,
        relY: drag.startRelY + dy
      })
    })
    this.setData({ placements })
  },

  onPlacementTouchEnd() {
    this.dragState = null
  },

  removePlacement(e) {
    const key = e.currentTarget.dataset.key
    const placements = this.data.placements.filter((p) => p.key !== key)
    this.setData({
      placements,
      selectedPlacementKey: this.data.selectedPlacementKey === key ? '' : this.data.selectedPlacementKey
    })
  },

  changeSize(e) {
    const signatureSize = Number(e.detail.value)
    const { selectedPlacementKey, placements, pages } = this.data
    const selectedIndex = placements.findIndex((p) => p.key === selectedPlacementKey)
    if (selectedIndex < 0) {
      this.setData({ signatureSize })
      return
    }

    const next = placements.slice()
    const page = pages.find((p) => p.pageNo === next[selectedIndex].page)
    const current = next[selectedIndex]
    const relH = this.calcRelHeight(signatureSize, page)
    next[selectedIndex] = this.clampPlacement({
      ...current,
      relX: current.relX + current.relW / 2 - signatureSize / 2,
      relY: current.relY + current.relH / 2 - relH / 2,
      relW: signatureSize,
      relH
    })

    this.setData({ signatureSize, placements: next })
  },

  clearAll() {
    this.setData({ placements: [], selectedPlacementKey: '' })
  },

  getPageRect() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#page-canvas').boundingClientRect()
    return new Promise((resolve) => query.exec((res) => resolve(res && res[0])))
  },

  getEventPoint(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
    if (touch) {
      const x = typeof touch.clientX === 'number' ? touch.clientX : touch.x
      const y = typeof touch.clientY === 'number' ? touch.clientY : touch.y
      return typeof x === 'number' && typeof y === 'number' ? { x, y } : null
    }
    const detail = e.detail || {}
    const x = typeof detail.clientX === 'number' ? detail.clientX : detail.x
    const y = typeof detail.clientY === 'number' ? detail.clientY : detail.y
    return typeof x === 'number' && typeof y === 'number' ? { x, y } : null
  },

  toRelativePoint(point, rect) {
    if (!point || !rect || !rect.width || !rect.height) return null
    return {
      relX: this.clamp((point.x - rect.left) / rect.width, 0, 1),
      relY: this.clamp((point.y - rect.top) / rect.height, 0, 1)
    }
  },

  calcRelHeight(relW, page) {
    const pageRatio = page && page.ratio ? page.ratio : 1
    return relW * (this.data.signatureRatio || 0.4) / pageRatio
  },

  clampPlacement(placement) {
    const relW = this.clamp(placement.relW, 0.01, 1)
    const relH = this.clamp(placement.relH, 0.01, 1)
    return {
      ...placement,
      relW,
      relH,
      relX: this.clamp(placement.relX, 0, Math.max(0, 1 - relW)),
      relY: this.clamp(placement.relY, 0, Math.max(0, 1 - relH))
    }
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  },

  async handleSubmit() {
    const { pdfFile, signatureFileId, placements } = this.data
    if (!pdfFile) return wx.showToast({ title: '请选择 PDF', icon: 'none' })
    if (!signatureFileId) return wx.showToast({ title: '请准备签名', icon: 'none' })
    if (!placements.length) return wx.showToast({ title: '请在 PDF 上点击放置签名', icon: 'none' })

    this.setData({ submitting: true })
    try {
      wx.showLoading({ title: '上传中', mask: true })
      const result = await upload('/tool/pdf-sign', pdfFile.path, {
        originalFileName: pdfFile.name,
        signatureFileId,
        signaturesJson: JSON.stringify(placements.map((p) => ({
          page: p.page,
          x: p.relX,
          y: p.relY,
          width: p.relW,
          height: p.relH
        })))
      })
      const taskId = result.data
      taskStore.upsertTask({
        taskId,
        toolType: 'pdf-sign',
        sourceFileName: pdfFile.name,
        createdAt: Date.now(), updatedAt: Date.now(),
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
