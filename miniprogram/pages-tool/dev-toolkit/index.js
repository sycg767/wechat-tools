const { post } = require('../../utils/request')

const TABS = [
  { id: 'json', name: 'JSON' },
  { id: 'base64', name: 'Base64' },
  { id: 'url', name: 'URL' },
  { id: 'time', name: '时间戳' },
  { id: 'hash', name: 'Hash' },
  { id: 'uuid', name: 'UUID' },
  { id: 'color', name: '颜色' }
]

Page({
  data: {
    tabs: TABS,
    currentTab: 'json',
    // JSON
    jsonInput: '',
    jsonOutput: '',
    jsonError: '',
    jsonStats: null,
    // Base64
    base64Input: '',
    base64Output: '',
    base64Mode: 'encode',
    base64Variant: 'std',
    // URL
    urlInput: '',
    urlOutput: '',
    urlMode: 'encode',
    urlMethod: 'component',  // component | uri
    // 时间戳
    timeStamp: '',
    timeFormatted: '',
    timeMode: 'stamp2date',  // stamp2date | date2stamp
    timeNowMs: '',
    timeNow: '',
    timeNowSeconds: '',
    // Hash
    hashInput: '',
    hashTextResult: null,    // { md5, sha1, sha256 }
    hashFileResult: null,
    // UUID
    uuidCount: 1,
    uuids: [],
    uuidUpper: false,
    uuidNoDash: false,
    // 颜色
    colorHex: '#1f6feb',
    colorRgb: 'rgb(31, 111, 235)',
    colorHsl: 'hsl(214, 84%, 52%)',
    colorComplementary: '#eb6f1f',
  },

  onLoad() {
    this.refreshNow()
    setInterval(() => this.refreshNow(), 1000)
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.id })
  },

  // ============== JSON ==============
  onJsonInput(e) {
    this.setData({ jsonInput: e.detail.value })
  },
  jsonFormat() {
    try {
      const obj = JSON.parse(this.data.jsonInput)
      const stats = this.calcJsonStats(obj)
      this.setData({ jsonOutput: JSON.stringify(obj, null, 2), jsonError: '', jsonStats: stats })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message, jsonStats: null })
    }
  },
  jsonMinify() {
    try {
      const obj = JSON.parse(this.data.jsonInput)
      this.setData({ jsonOutput: JSON.stringify(obj), jsonError: '', jsonStats: null })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message, jsonStats: null })
    }
  },
  jsonValidate() {
    try {
      const obj = JSON.parse(this.data.jsonInput)
      const stats = this.calcJsonStats(obj)
      this.setData({ jsonOutput: '✓ JSON 合法', jsonError: '', jsonStats: stats })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message, jsonStats: null })
    }
  },
  calcJsonStats(obj) {
    const stats = { keys: 0, items: 0, depth: 0 }
    const walk = (val, depth) => {
      stats.depth = Math.max(stats.depth, depth)
      if (Array.isArray(val)) {
        stats.items += val.length
        val.forEach(v => { if (typeof v === 'object' && v !== null) walk(v, depth + 1) })
      } else if (typeof val === 'object' && val !== null) {
        const keys = Object.keys(val)
        stats.keys += keys.length
        keys.forEach(k => { if (typeof val[k] === 'object' && val[k] !== null) walk(val[k], depth + 1) })
      }
    }
    walk(obj, 1)
    return stats
  },

  // ============== Base64 ==============
  onBase64Input(e) {
    this.setData({ base64Input: e.detail.value })
  },
  setBase64Mode(e) {
    this.setData({ base64Mode: e.currentTarget.dataset.mode, base64Output: '' })
  },
  setBase64Variant(e) {
    this.setData({ base64Variant: e.currentTarget.dataset.variant, base64Output: '' })
  },
  async base64Run() {
    const { base64Input, base64Mode, base64Variant } = this.data
    if (!base64Input) return wx.showToast({ title: '请输入内容', icon: 'none' })

    // URL-safe 模式前端直接处理
    if (base64Mode === 'encode' && base64Variant === 'urlsafe') {
      try {
        const raw = unescape(encodeURIComponent(base64Input))
        let encoded = ''
        for (let i = 0; i < raw.length; i++) {
          encoded += String.fromCharCode(raw.charCodeAt(i))
        }
        encoded = btoa(encoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        this.setData({ base64Output: encoded })
      } catch (e) {
        wx.showToast({ title: '编码失败：' + e.message, icon: 'none' })
      }
      return
    }
    if (base64Mode === 'decode' && base64Variant === 'urlsafe') {
      try {
        let padded = base64Input.replace(/-/g, '+').replace(/_/g, '/')
        while (padded.length % 4) padded += '='
        this.setData({ base64Output: decodeURIComponent(escape(atob(padded))) })
      } catch (e) {
        wx.showToast({ title: '解码失败，请检查输入', icon: 'none' })
      }
      return
    }

    // 标准模式走后端
    try {
      wx.showLoading({ title: '处理中', mask: true })
      const res = await post('/tool/dev/base64', { text: base64Input, mode: base64Mode },
        { 'Content-Type': 'application/json' })
      this.setData({ base64Output: res.data.result })
    } catch (e) {
      this.setData({ base64Output: '' })
      wx.showToast({ title: e.message || '处理失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // ============== URL ==============
  onUrlInput(e) {
    this.setData({ urlInput: e.detail.value })
  },
  setUrlMode(e) {
    this.setData({ urlMode: e.currentTarget.dataset.mode, urlOutput: '' })
  },
  setUrlMethod(e) {
    this.setData({ urlMethod: e.currentTarget.dataset.method, urlOutput: '' })
  },
  urlRun() {
    const { urlInput, urlMode, urlMethod } = this.data
    if (!urlInput) return wx.showToast({ title: '请输入内容', icon: 'none' })
    try {
      const encodeFn = urlMethod === 'uri' ? encodeURI : encodeURIComponent
      const decodeFn = urlMethod === 'uri' ? decodeURI : decodeURIComponent
      const result = urlMode === 'encode' ? encodeFn(urlInput) : decodeFn(urlInput)
      this.setData({ urlOutput: result })
    } catch (e) {
      wx.showToast({ title: '处理失败：' + e.message, icon: 'none' })
    }
  },

  // ============== 时间戳 ==============
  refreshNow() {
    const now = Date.now()
    this.setData({
      timeNow: this.formatDate(new Date(now)),
      timeNowSeconds: String(Math.floor(now / 1000)),
      timeNowMs: String(now)
    })
  },
  formatDate(d) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  },
  onTimeStampInput(e) {
    this.setData({ timeStamp: e.detail.value })
  },
  setTimeMode(e) {
    this.setData({ timeMode: e.currentTarget.dataset.mode, timeFormatted: '' })
  },
  timeConvert() {
    const { timeStamp, timeMode } = this.data
    if (!timeStamp) return wx.showToast({ title: '请输入', icon: 'none' })
    try {
      if (timeMode === 'stamp2date') {
        let n = Number(timeStamp)
        if (Number.isNaN(n)) throw new Error('请输入数字时间戳')
        // 自动识别秒/毫秒
        if (n < 1e12) n *= 1000
        this.setData({ timeFormatted: this.formatDate(new Date(n)) })
      } else {
        const d = new Date(timeStamp.replace(/-/g, '/'))
        if (isNaN(d.getTime())) throw new Error('日期格式不对，例：2026-05-08 12:00:00')
        this.setData({ timeFormatted: `秒：${Math.floor(d.getTime() / 1000)}\n毫秒：${d.getTime()}` })
      }
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },
  fillCurrentTime() {
    if (this.data.timeMode === 'stamp2date') {
      this.setData({ timeStamp: String(Date.now()) })
    } else {
      this.setData({ timeStamp: this.formatDate(new Date()) })
    }
  },
  copyNowSeconds() {
    wx.setClipboardData({ data: this.data.timeNowSeconds })
    wx.showToast({ title: '已复制秒级', icon: 'success' })
  },
  copyNowMillis() {
    wx.setClipboardData({ data: this.data.timeNowMs })
    wx.showToast({ title: '已复制毫秒级', icon: 'success' })
  },

  // ============== Hash ==============
  onHashInput(e) {
    this.setData({ hashInput: e.detail.value, hashTextResult: null })
  },
  async hashText() {
    if (!this.data.hashInput) return wx.showToast({ title: '请输入文本', icon: 'none' })
    try {
      wx.showLoading({ title: '计算中', mask: true })
      const res = await post('/tool/dev/text-hash', { text: this.data.hashInput },
        { 'Content-Type': 'application/json' })
      this.setData({ hashTextResult: res.data })
    } catch (e) {
      wx.showToast({ title: e.message || '计算失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },
  async hashFile() {
    try {
      const r = await new Promise((resolve, reject) => {
        wx.chooseMessageFile({ count: 1, type: 'file', success: resolve, fail: reject })
      })
      const file = r.tempFiles[0]
      if (!file) return
      wx.showLoading({ title: '计算中', mask: true })
      const upload = require('../../utils/upload')
      const res = await upload('/tool/dev/file-hash', file.path, {})
      this.setData({ hashFileResult: { ...res.data, fileName: file.name } })
    } catch (e) {
      if (e && e.errMsg && e.errMsg.includes('cancel')) return
      wx.showToast({ title: (e && e.message) || '计算失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // ============== UUID ==============
  onUuidCountChange(e) {
    let n = parseInt(e.detail.value, 10)
    if (Number.isNaN(n) || n < 1) n = 1
    if (n > 100) n = 100
    this.setData({ uuidCount: n })
  },
  toggleUuidUpper() { this.setData({ uuidUpper: !this.data.uuidUpper }) },
  toggleUuidNoDash() { this.setData({ uuidNoDash: !this.data.uuidNoDash }) },
  generateUuids() {
    const { uuidCount, uuidUpper, uuidNoDash } = this.data
    const list = []
    for (let i = 0; i < uuidCount; i++) {
      let id = this.uuidv4()
      if (uuidNoDash) id = id.replace(/-/g, '')
      if (uuidUpper) id = id.toUpperCase()
      list.push(id)
    }
    this.setData({ uuids: list })
  },
  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },

  // ============== 颜色 ==============
  onColorInput(e) {
    let v = (e.detail.value || '').trim()
    if (!v.startsWith('#')) v = '#' + v
    this.updateColor(v)
  },
  updateColor(v) {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
      this.setData({ colorHex: v, colorRgb: '格式：#RRGGBB', colorHsl: '', colorComplementary: '' })
      return
    }
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
    const r = parseInt(v.substr(1, 2), 16)
    const g = parseInt(v.substr(3, 2), 16)
    const b = parseInt(v.substr(5, 2), 16)
    const comp = this.complementaryHex(r, g, b)
    this.setData({
      colorHex: v.toLowerCase(),
      colorRgb: `rgb(${r}, ${g}, ${b})`,
      colorHsl: this.rgbToHslStr(r, g, b),
      colorComplementary: comp
    })
  },
  complementaryHex(r, g, b) {
    return '#' + [(255 - r).toString(16).padStart(2, '0'),
      (255 - g).toString(16).padStart(2, '0'),
      (255 - b).toString(16).padStart(2, '0')].join('')
  },
  randomColor() {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    this.updateColor(hex)
  },
  rgbToHslStr(r, g, b) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        default: h = (r - g) / d + 4
      }
      h /= 6
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
  },

  // ============== 通用 ==============
  copyResult(e) {
    const text = e.currentTarget.dataset.text
    if (!text) return
    wx.setClipboardData({ data: String(text), success: () => {
      wx.showToast({ title: '已复制', icon: 'success' })
    } })
  }
})
