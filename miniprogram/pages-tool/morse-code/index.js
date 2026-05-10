const { addHistory, getHistory, clearHistory, copyText } = require('../../utils/tool-common')

const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
}

const TEXT_MAP = Object.keys(MORSE_MAP).reduce((map, key) => {
  map[MORSE_MAP[key]] = key
  return map
}, {})

Page({
  data: {
    input: '',
    output: '',
    mode: 'encode',
    errors: [],
    history: [],
    rhythm: []
  },

  onLoad() {
    this.setData({ history: getHistory('morse-code') })
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  setMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode, errors: [] }, () => this.run())
  },

  run() {
    const text = this.data.input || ''
    const result = this.data.mode === 'encode' ? this.encode(text) : this.decode(text)
    const history = result.output ? addHistory('morse-code', {
      id: `${Date.now()}-${this.data.mode}`,
      title: this.data.mode === 'encode' ? '编码' : '解码',
      text: text.slice(0, 40) || '空内容',
      output: result.output,
      time: this.formatNow()
    }) : this.data.history
    this.setData({ output: result.output, errors: result.errors, rhythm: this.buildRhythm(result.output), history })
  },

  encode(text) {
    const errors = []
    const output = text.toUpperCase().split('').map((char) => {
      if (char === ' ') return '/'
      if (MORSE_MAP[char]) return MORSE_MAP[char]
      errors.push(`无法编码：${char}`)
      return `?${char}`
    }).join(' ')
    return { output, errors }
  },

  decode(text) {
    const errors = []
    const output = text.trim().split(/\s+/).filter(Boolean).map((code) => {
      if (code === '/') return ' '
      if (TEXT_MAP[code]) return TEXT_MAP[code]
      errors.push(`无法解码：${code}`)
      return '□'
    }).join('')
    return { output, errors }
  },

  buildRhythm(output) {
    return output.split('').slice(0, 120).map((char, index) => {
      if (char === '.') return { id: index, type: 'dot', label: '点' }
      if (char === '-') return { id: index, type: 'dash', label: '划' }
      if (char === '/') return { id: index, type: 'word', label: '词间隔' }
      return { id: index, type: 'gap', label: '间隔' }
    })
  },

  copyResult() {
    if (!this.data.output) return wx.showToast({ title: '没有可复制内容', icon: 'none' })
    copyText(this.data.output)
  },

  copyItem(e) {
    const value = e.currentTarget.dataset.value || ''
    if (!value) return
    copyText(value)
  },

  clearHistory() {
    this.setData({ history: clearHistory('morse-code') })
  },

  clear() {
    this.setData({ input: '', output: '', errors: [], rhythm: [] })
  },

  formatNow() {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
})
