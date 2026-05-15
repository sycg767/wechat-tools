Page({
  data: {
    text: '',
    chars: 0,
    cnChars: 0,
    enWords: 0,
    digits: 0,
    puncts: 0,
    spaces: 0,
    lines: 0,
    bytes: 0
  },

  onInput(e) {
    const text = e.detail.value || ''
    const chars = text.length
    const cnChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
    const enWords = (text.match(/[a-zA-Z]+/g) || []).length
    const digits = (text.match(/\d/g) || []).length
    const puncts = (text.match(/[，。！？；：""''【】《》（）…—、,\.!\?;:'"\(\)\[\]{}<>\/\\@#$%^&*+=~`|_-]/g) || []).length
    const spaces = (text.match(/\s/g) || []).length
    const lines = text ? text.split(/\n/).length : 0
    const bytes = this.getUtf8Bytes(text)

    this.setData({ text, chars, cnChars, enWords, digits, puncts, spaces, lines, bytes })
  },

  getUtf8Bytes(str) {
    let bytes = 0
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (code <= 0x7f) bytes += 1
      else if (code <= 0x7ff) bytes += 2
      else if (code >= 0xd800 && code <= 0xdfff) { bytes += 4; i++ }
      else bytes += 3
    }
    return bytes
  },

  handleClear() {
    this.setData({
      text: '', chars: 0, cnChars: 0, enWords: 0,
      digits: 0, puncts: 0, spaces: 0, lines: 0, bytes: 0
    })
  },

  handleCopy() {
    if (!this.data.text) return
    wx.setClipboardData({ data: this.data.text })
    wx.showToast({ title: '已复制', icon: 'success' })
  }
})
