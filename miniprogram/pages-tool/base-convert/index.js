const { addHistory, getHistory, clearHistory, copyText } = require('../../utils/tool-common')

const DIGITS = {
  2: '01',
  8: '01234567',
  10: '0123456789',
  16: '0123456789ABCDEF',
  32: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  64: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/'
}

const BASES = [2, 8, 10, 16, 32, 58, 62, 64]
const SCALE = 12

Page({
  data: {
    bases: BASES.map((base) => ({ base, label: `${base} 进制` })),
    baseIndex: 3,
    input: '',
    results: [],
    error: '',
    detectedBase: 16,
    history: []
  },

  onLoad() {
    this.setData({ history: getHistory('base-convert') })
  },

  onBaseChange(e) {
    this.setData({ baseIndex: Number(e.detail.value), error: '' }, () => this.convert())
  },

  onInput(e) {
    this.setData({ input: (e.detail.value || '').trim(), error: '' })
  },

  convert() {
    const input = (this.data.input || '').trim()
    if (!input) return this.setData({ results: [], error: '请输入要转换的数值' })

    try {
      const detected = this.detectInput(input, BASES[this.data.baseIndex])
      const decimal = this.parseToDecimal(detected.value, detected.base)
      const results = BASES.map((targetBase) => ({
        base: targetBase,
        label: `${targetBase} 进制`,
        value: this.decimalToBase(decimal, targetBase)
      }))
      const history = addHistory('base-convert', {
        id: `${Date.now()}-${input}`,
        title: `${detected.base} 进制输入`,
        text: input,
        output: results.map((item) => `${item.base}:${item.value}`).join('  '),
        time: this.formatNow()
      })
      this.setData({ results, error: '', detectedBase: detected.base, history })
    } catch (e) {
      this.setData({ results: [], error: e.message || '转换失败' })
    }
  },

  detectInput(input, fallbackBase) {
    const sign = input.startsWith('-') ? '-' : ''
    const body = sign ? input.slice(1) : input
    const lower = body.toLowerCase()
    if (lower.startsWith('0b')) return { base: 2, value: sign + body.slice(2) }
    if (lower.startsWith('0o')) return { base: 8, value: sign + body.slice(2) }
    if (lower.startsWith('0x')) return { base: 16, value: sign + body.slice(2) }
    return { base: fallbackBase, value: input }
  },

  parseToDecimal(input, base) {
    const chars = DIGITS[base]
    let text = input.trim()
    let sign = 1
    if (text.startsWith('-')) {
      sign = -1
      text = text.slice(1)
    }
    if (!text || text === '.') throw new Error('数值格式不正确')
    const parts = text.split('.')
    if (parts.length > 2) throw new Error('只能包含一个小数点')
    const integerPart = parts[0] || '0'
    const fractionPart = parts[1] || ''
    const normalizedInteger = base <= 36 ? integerPart.toUpperCase() : integerPart
    const normalizedFraction = base <= 36 ? fractionPart.toUpperCase() : fractionPart
    let integer = 0
    for (const char of normalizedInteger) {
      const digit = chars.indexOf(char)
      if (digit < 0) throw new Error(`存在不属于 ${base} 进制的字符：${char}`)
      integer = integer * base + digit
    }
    let fraction = 0
    let divisor = base
    for (const char of normalizedFraction) {
      const digit = chars.indexOf(char)
      if (digit < 0) throw new Error(`存在不属于 ${base} 进制的字符：${char}`)
      fraction += digit / divisor
      divisor *= base
    }
    return sign * (integer + fraction)
  },

  decimalToBase(value, base) {
    const chars = DIGITS[base]
    const sign = value < 0 ? '-' : ''
    let current = Math.abs(value)
    const integer = Math.floor(current)
    let output = this.integerToBase(integer, base, chars)
    let fraction = current - integer
    if (fraction > 0) {
      let fractionText = ''
      let count = 0
      while (fraction > 1e-12 && count < SCALE) {
        fraction *= base
        const digit = Math.floor(fraction)
        fractionText += chars[digit]
        fraction -= digit
        count += 1
      }
      fractionText = fractionText.replace(/0+$/, '')
      if (fractionText) output += `.${fractionText}`
    }
    return sign + output
  },

  integerToBase(value, base, chars) {
    if (value === 0) return '0'
    let current = value
    let output = ''
    while (current > 0) {
      const mod = current % base
      output = chars[mod] + output
      current = Math.floor(current / base)
    }
    return output
  },

  copyItem(e) {
    const value = e.currentTarget.dataset.value
    if (!value) return
    copyText(value)
  },

  clearHistory() {
    this.setData({ history: clearHistory('base-convert') })
  },

  clear() {
    this.setData({ input: '', results: [], error: '' })
  },

  formatNow() {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
})
