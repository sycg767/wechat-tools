const taskStore = require('../../utils/task-store')

const STORAGE_KEY = 'fish_wheel_options_v1'
const DEFAULT_OPTIONS = ['去带薪拉屎', '点杯奶茶', '发呆5分钟', '找同事闲聊', '摸鱼看资讯', '提前规划下班']
const COLORS = ['#fecaca', '#fde68a', '#bfdbfe', '#c7d2fe', '#bbf7d0', '#fbcfe8', '#fde68a', '#d9f99d']

Page({
  data: {
    options: [],
    inputValue: '',
    isSpinning: false,
    currentAngle: 0,
    result: '',
    mode: 'normal'
  },

  onLoad() {
    this.setData({ options: this.loadOptions() })
    this.initCanvas()
  },

  loadOptions() {
    const saved = wx.getStorageSync(STORAGE_KEY)
    if (!Array.isArray(saved) || saved.length < 2) {
      return [...DEFAULT_OPTIONS]
    }
    return saved.slice(0, 12)
  },

  saveOptions(options) {
    wx.setStorageSync(STORAGE_KEY, options)
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#wheelCanvas').fields({ node: true, size: true }).exec((res) => {
      const info = res[0]
      if (!info || !info.node) return
      const canvas = info.node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo().pixelRatio
      canvas.width = info.width * dpr
      canvas.height = info.height * dpr
      ctx.scale(dpr, dpr)
      this.canvas = canvas
      this.ctx = ctx
      this.canvasWidth = info.width
      this.canvasHeight = info.height
      this.drawWheel()
    })
  },

  drawWheel() {
    if (!this.ctx || this.data.mode !== 'normal') return
    const { options, currentAngle } = this.data
    if (!options.length) return
    const ctx = this.ctx
    const centerX = this.canvasWidth / 2
    const centerY = this.canvasHeight / 2
    const radius = Math.min(centerX, centerY) - 20
    const arc = Math.PI * 2 / options.length

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(currentAngle)

    options.forEach((option, i) => {
      const angle = i * arc
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, angle, angle + arc)
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()

      ctx.save()
      ctx.rotate(angle + arc / 2)
      ctx.fillStyle = '#374151'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(option, radius - 16, 0)
      ctx.restore()
    })

    ctx.restore()

    ctx.save()
    ctx.translate(centerX, centerY - radius - 8)
    ctx.beginPath()
    ctx.moveTo(-16, 0)
    ctx.lineTo(16, 0)
    ctx.lineTo(0, 24)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.beginPath()
    ctx.arc(0, 0, 34, 0, Math.PI * 2)
    ctx.fillStyle = '#111827'
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(this.data.isSpinning ? '转动' : '开始', 0, 0)
    ctx.restore()
  },

  startSpin() {
    if (this.data.mode !== 'normal' || this.data.isSpinning || this.data.options.length < 2) return
    const start = this.data.currentAngle
    const duration = 2800
    const rounds = 6 + Math.random() * 4
    const target = start + rounds * Math.PI * 2 + Math.random() * Math.PI * 2
    const startTime = Date.now()

    this.setData({ isSpinning: true, result: '' })

    const animate = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      const angle = start + (target - start) * eased
      this.setData({ currentAngle: angle })
      this.drawWheel()
      if (p < 1) {
        this.canvas.requestAnimationFrame(animate)
      } else {
        this.setData({ isSpinning: false })
        this.pickResult()
      }
    }

    animate()
  },

  pickResult() {
    const { options, currentAngle } = this.data
    const arc = Math.PI * 2 / options.length
    const normalized = (Math.PI * 1.5 - currentAngle) % (Math.PI * 2)
    const positive = normalized < 0 ? normalized + Math.PI * 2 : normalized
    const idx = Math.floor(positive / arc)
    const result = options[idx]
    const now = Date.now()
    this.setData({ result })
    taskStore.upsertTask({
      taskId: `fish_wheel_${now}`,
      toolType: 'fish-wheel',
      sourceFileName: '摸鱼转盘',
      resultFileName: result,
      status: 'SUCCESS',
      createdAt: now,
      updatedAt: now,
      message: `摸鱼决策：${result}`
    })
    wx.vibrateShort({ type: 'light' })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  addOption() {
    const val = this.data.inputValue.trim()
    if (!val) return
    if (this.data.options.length >= 12) {
      wx.showToast({ title: '最多12个选项', icon: 'none' })
      return
    }
    const options = [...this.data.options, val]
    this.saveOptions(options)
    this.setData({ options, inputValue: '' })
    this.drawWheel()
  },

  removeOption(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (this.data.options.length <= 2) {
      wx.showToast({ title: '至少保留2个选项', icon: 'none' })
      return
    }
    const options = [...this.data.options]
    options.splice(index, 1)
    this.saveOptions(options)
    this.setData({ options })
    this.drawWheel()
  },

  resetOptions() {
    const options = [...DEFAULT_OPTIONS]
    this.saveOptions(options)
    this.setData({ options })
    this.drawWheel()
  },

  setBossMode() {
    this.setData({ mode: 'boss' })
  },

  setNormalMode() {
    this.setData({ mode: 'normal' })
    this.drawWheel()
  },

  onShareAppMessage() {
    return {
      title: this.data.result ? `摸鱼转盘决定：${this.data.result}` : '来试试摸鱼转盘',
      path: '/pages-fun/fish-wheel/index'
    }
  }
})
