const PHOTO_SIZES = [
  { label: '一寸', value: 'one-inch', width: 295, height: 413 },
  { label: '二寸', value: 'two-inch', width: 413, height: 579 },
  { label: '护照', value: 'passport', width: 330, height: 480 },
  { label: '身份证', value: 'id-card', width: 358, height: 441 }
]

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' }
]

Page({
  data: {
    selectedFile: null,
    sizeOptions: PHOTO_SIZES,
    formatOptions: FORMAT_OPTIONS,
    photoSize: PHOTO_SIZES[0].value,
    outputFormat: FORMAT_OPTIONS[0].value,
    imagePath: '',
    imageInfo: null,
    imageReady: false,
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    displayWidth: 0,
    displayHeight: 0,
    cropFrameHeightRpx: 520,
    resultTempFilePath: '',
    generating: false,
    currentSizeLabel: PHOTO_SIZES[0].label,
    outputFormatLabel: FORMAT_OPTIONS[0].label,
    scaleTip: '默认自动铺满，可上下拖动微调位置'
  },

  onLoad() {
    this.updateCropFrameHeight()
  },

  handleFileSelected(event) {
    const file = event.detail.file
    this.setData({
      selectedFile: file,
      imagePath: file ? file.path : '',
      resultTempFilePath: '',
      imageReady: false
    })
    this.loadImageInfo(file)
  },

  handleSizeChange(event) {
    const value = event.currentTarget.dataset.value
    const next = this.getCurrentSize(value)
    this.setData({
      photoSize: value,
      currentSizeLabel: next.label,
      resultTempFilePath: '',
      scaleTip: `已切换为${next.label}规格，系统会自动重新铺满，可拖动位置微调`
    })
    this.updateCropFrameHeight()
    if (this.data.imageInfo) {
      this.resetImageTransform()
    }
  },

  handleFormatChange(event) {
    const value = event.currentTarget.dataset.value
    const option = FORMAT_OPTIONS.find((item) => item.value === value) || FORMAT_OPTIONS[0]
    this.setData({
      outputFormat: value,
      outputFormatLabel: option.label,
      resultTempFilePath: ''
    })
  },

  handleScaleChanging(event) {
    this.clearResultPreview()
    this.setData({ scaleTip: '正在微调缩放，保持人物头肩位于参考线附近更自然' })
    this.updateScale(Number(event.detail.value))
  },

  handleScaleChange(event) {
    this.clearResultPreview()
    this.setData({ scaleTip: '缩放已更新，可继续拖动照片微调人物位置' })
    this.updateScale(Number(event.detail.value))
  },

  updateCropFrameHeight() {
    const size = this.getCurrentSize()
    const widthRpx = 590
    const heightRpx = Math.round((size.height / size.width) * widthRpx)
    this.setData({ cropFrameHeightRpx: heightRpx })
  },

  async loadImageInfo(file) {
    if (!file || !file.path) {
      return
    }
    try {
      const info = await this.getImageInfo(file.path)
      this.setData({ imageInfo: info, imageReady: true, scaleTip: '默认自动铺满，可上下拖动微调位置' })
      this.resetImageTransform()
    } catch (error) {
      this.setData({ imageInfo: null, imageReady: false })
      wx.showToast({ title: '读取图片失败', icon: 'none' })
    }
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({ src, success: resolve, fail: reject })
    })
  },

  getCurrentSize(value) {
    const target = value || this.data.photoSize
    return PHOTO_SIZES.find((item) => item.value === target) || PHOTO_SIZES[0]
  },

  getCropFrameRect() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#crop-frame').boundingClientRect()
    return new Promise((resolve) => query.exec((res) => resolve(res && res[0])))
  },

  async resetImageTransform() {
    const { imageInfo } = this.data
    if (!imageInfo) {
      return
    }
    await new Promise((resolve) => wx.nextTick(resolve))
    const rect = await this.getCropFrameRect()
    if (!rect || !rect.width || !rect.height) {
      return
    }

    const scale = Math.max(rect.width / imageInfo.width, rect.height / imageInfo.height)
    const displayWidth = imageInfo.width * scale
    const displayHeight = imageInfo.height * scale
    const baseOffsetX = (rect.width - displayWidth) / 2
    const baseOffsetY = (rect.height - displayHeight) / 2

    this.baseScale = scale
    this.frameRect = rect
    this.setData({
      imageScale: 1,
      imageOffsetX: baseOffsetX,
      imageOffsetY: baseOffsetY,
      displayWidth,
      displayHeight
    })
  },

  updateScale(nextScale) {
    if (!this.data.imageInfo || !this.frameRect) {
      return
    }
    const currentScale = this.data.imageScale
    const scale = this.clamp(nextScale, 1, 3)
    const width = this.data.imageInfo.width * this.baseScale * scale
    const height = this.data.imageInfo.height * this.baseScale * scale
    const currentWidth = this.data.imageInfo.width * this.baseScale * currentScale
    const currentHeight = this.data.imageInfo.height * this.baseScale * currentScale
    const centerX = this.data.imageOffsetX + currentWidth / 2
    const centerY = this.data.imageOffsetY + currentHeight / 2
    const offsetX = centerX - width / 2
    const offsetY = centerY - height / 2
    const next = this.clampOffsets(offsetX, offsetY, width, height)
    this.setData({
      imageScale: scale,
      imageOffsetX: next.x,
      imageOffsetY: next.y,
      displayWidth: width,
      displayHeight: height
    })
  },

  handleCropTouchStart(event) {
    if (!this.data.imageReady || !this.frameRect) {
      return
    }
    const point = this.getEventPoint(event)
    if (!point) {
      return
    }
    this.dragState = {
      startX: point.x,
      startY: point.y,
      offsetX: this.data.imageOffsetX,
      offsetY: this.data.imageOffsetY
    }
  },

  handleCropTouchMove(event) {
    if (!this.dragState || !this.data.imageInfo) {
      return
    }
    const point = this.getEventPoint(event)
    if (!point) {
      return
    }
    const width = this.data.displayWidth
    const height = this.data.displayHeight
    const nextX = this.dragState.offsetX + (point.x - this.dragState.startX)
    const nextY = this.dragState.offsetY + (point.y - this.dragState.startY)
    const next = this.clampOffsets(nextX, nextY, width, height)
    this.clearResultPreview()
    this.setData({ imageOffsetX: next.x, imageOffsetY: next.y })
  },

  handleCropTouchEnd() {
    this.dragState = null
  },

  getEventPoint(event) {
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0])
    if (!touch) {
      return null
    }
    const x = typeof touch.clientX === 'number' ? touch.clientX : touch.x
    const y = typeof touch.clientY === 'number' ? touch.clientY : touch.y
    return typeof x === 'number' && typeof y === 'number' ? { x, y } : null
  },

  clampOffsets(offsetX, offsetY, width, height) {
    const rect = this.frameRect
    const minX = Math.min(0, rect.width - width)
    const minY = Math.min(0, rect.height - height)
    return {
      x: this.clamp(offsetX, minX, 0),
      y: this.clamp(offsetY, minY, 0)
    }
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  },

  clearResultPreview() {
    if (!this.data.resultTempFilePath) {
      return
    }
    this.setData({ resultTempFilePath: '' })
  },

  async initExportCanvas() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#export-canvas').fields({ node: true, size: true }).exec((res) => {
        const canvasInfo = res && res[0]
        if (!canvasInfo || !canvasInfo.node) {
          reject(new Error('画布初始化失败'))
          return
        }
        resolve(canvasInfo)
      })
    })
  },

  async handleGenerate() {
    if (!this.data.selectedFile || !this.data.imageReady) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    this.setData({ generating: true })
    wx.showLoading({ title: '生成中', mask: true })
    try {
      const size = this.getCurrentSize()
      const canvasInfo = await this.initExportCanvas()
      const canvas = canvasInfo.node
      const ctx = canvas.getContext('2d')
      
      // 1. 获取目标证件照的高清像素尺寸 (如一寸: 295 x 413)
      const targetWidth = size.width
      const targetHeight = size.height
      
      const frameRect = this.frameRect || await this.getCropFrameRect()
      
      // 2. 直接将目标物理尺寸设置为画板宽高等避免所有截取坑点，还能保证照片高清不糊！
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      if (typeof ctx.setTransform === 'function') {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
      ctx.clearRect(0, 0, targetWidth, targetHeight)

      // 3. 计算从【屏幕 CSS 预览尺寸】到【最终输出像素尺寸】的放大倍率
      const ratio = targetWidth / frameRect.width

      // 4. 将预览界面的位移和大小，等比例转换到目标高清画布的坐标系中
      const drawWidth = this.data.displayWidth * ratio
      const drawHeight = this.data.displayHeight * ratio
      const drawX = this.data.imageOffsetX * ratio
      const drawY = this.data.imageOffsetY * ratio

      const image = canvas.createImage()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = this.data.imagePath
      })

      // 绘制高清原图
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      
      // 5. 导出：只传实际宽高，不传容易受 dpr 干扰的截取参数
      const tempFilePath = await this.exportTempFile(canvas, targetWidth, targetHeight)
      
      this.setData({ resultTempFilePath: tempFilePath })
      wx.showToast({ title: '生成成功', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error.message || '生成失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ generating: false })
    }
  },

  // 对应调整 API 传参，移除坑点参数
  exportTempFile(canvas, destWidth, destHeight) {
    const fileType = this.data.outputFormat === 'png' ? 'png' : 'jpg'
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        // 🚨 核心改动：移除了 x, y, width, height 参数
        // 这样在所有的手机上，系统都会完美地将这个画板 1:1 全部导出，再也不会只截左上角了
        destWidth,
        destHeight,
        fileType,
        quality: fileType === 'jpg' ? 1 : undefined,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      }, this)
    })
  },

  handlePreview() {
    const { resultTempFilePath } = this.data
    if (!resultTempFilePath) {
      return
    }
    wx.previewImage({ current: resultTempFilePath, urls: [resultTempFilePath] })
  },

  handleSave() {
    const { resultTempFilePath } = this.data
    if (!resultTempFilePath) {
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: resultTempFilePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (error) => {
        const message = (error && error.errMsg) || ''
        if (message.includes('auth deny') || message.includes('auth denied')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许“保存到相册”权限后重试。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({})
              }
            }
          })
          return
        }
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  }
})
