const { post } = require('../../utils/request')

const TABS = [
  { id: 'json', name: 'JSON' },
  { id: 'base64', name: 'Base64' },
  { id: 'url', name: 'URL' },
  { id: 'time', name: '时间戳' },
  { id: 'hash', name: 'Hash' },
  { id: 'uuid', name: 'UUID' },
  { id: 'color', name: '颜色' },
  { id: 'radix', name: '进制' }
]

Page({
  data: {
    tabs: TABS,
    currentTab: 'json',
    // JSON
    jsonInput: '',
    jsonOutput: '',
    jsonError: '',
    // Base64
    base64Input: '',
    base64Output: '',
    base64Mode: 'encode',
    // URL
    urlInput: '',
    urlOutput: '',
    urlMode: 'encode',
    // 时间戳
    timeStamp: '',
    timeFormatted: '',
    timeMode: 'stamp2date',  // stamp2date | date2stamp
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
    // 进制
    radixInput: '',
    radixFrom: 10,
    radixResults: { bin: '', oct: '', dec: '', hex: '' },
    radixError: ''
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
      this.setData({ jsonOutput: JSON.stringify(obj, null, 2), jsonError: '' })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message })
    }
  },
  jsonMinify() {
    try {
      const obj = JSON.parse(this.data.jsonInput)
      this.setData({ jsonOutput: JSON.stringify(obj), jsonError: '' })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message })
    }
  },
  jsonValidate() {
    try {
      JSON.parse(this.data.jsonInput)
      this.setData({ jsonOutput: '✓ JSON 合法', jsonError: '' })
    } catch (err) {
      this.setData({ jsonOutput: '', jsonError: err.message })
    }
  },

  // ============== Base64 ==============
  onBase64Input(e) {
    this.setData({ base64Input: e.detail.value })
  },
  setBase64Mode(e) {
    this.setData({ base64Mode: e.currentTarget.dataset.mode, base64Output: '' })
  },
  async base64Run() {
    const { base64Input, base64Mode } = this.data
    if (!base64Input) return wx.showToast({ title: '请输入内容', icon: 'none' })
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
  urlRun() {
    const { urlInput, urlMode } = this.data
    if (!urlInput) return wx.showToast({ title: '请输入内容', icon: 'none' })
    try {
      const result = urlMode === 'encode'
        ? encodeURIComponent(urlInput)
        : decodeURIComponent(urlInput)
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
      timeNowSeconds: String(Math.floor(now / 1000))
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
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
      this.setData({ colorHex: v, colorRgb: '格式：#RRGGBB', colorHsl: '' })
      return
    }
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
    const r = parseInt(v.substr(1, 2), 16)
    const g = parseInt(v.substr(3, 2), 16)
    const b = parseInt(v.substr(5, 2), 16)
    this.setData({
      colorHex: v.toLowerCase(),
      colorRgb: `rgb(${r}, ${g}, ${b})`,
      colorHsl: this.rgbToHslStr(r, g, b)
    })
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

  // ============== 进制 ==============
  onRadixInput(e) {
    this.setData({ radixInput: e.detail.value }, () => this.radixConvert())
  },
  setRadixFrom(e) {
    this.setData({ radixFrom: Number(e.currentTarget.dataset.from) }, () => this.radixConvert())
  },
  radixConvert() {
    const { radixInput, radixFrom } = this.data
    if (!radixInput) {
      this.setData({ radixResults: { bin: '', oct: '', dec: '', hex: '' }, radixError: '' })
      return
    }
    try {
      const n = parseInt(radixInput, radixFrom)
      if (Number.isNaN(n)) throw new Error('输入与所选进制不符')
      this.setData({
        radixResults: {
          bin: n.toString(2),
          oct: n.toString(8),
          dec: n.toString(10),
          hex: n.toString(16).toUpperCase()
        },
        radixError: ''
      })
    } catch (e) {
      this.setData({ radixError: e.message })
    }
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
