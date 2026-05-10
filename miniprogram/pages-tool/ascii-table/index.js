const { copyText } = require('../../utils/tool-common')

const CONTROL_NAMES = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'TAB', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI', 'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US']
const CONTROL_DESC = {
  NUL: '空字符', SOH: '标题开始', STX: '正文开始', ETX: '正文结束', EOT: '传输结束', ENQ: '询问', ACK: '确认', BEL: '响铃', BS: '退格', TAB: '水平制表', LF: '换行', VT: '垂直制表', FF: '换页', CR: '回车', SO: '移出', SI: '移入', DLE: '数据链路转义', DC1: '设备控制1', DC2: '设备控制2', DC3: '设备控制3', DC4: '设备控制4', NAK: '否定确认', SYN: '同步空闲', ETB: '传输块结束', CAN: '取消', EM: '介质结束', SUB: '替代', ESC: '转义', FS: '文件分隔', GS: '组分隔', RS: '记录分隔', US: '单元分隔'
}

function buildList() {
  const list = []
  for (let code = 0; code <= 127; code++) list.push(buildItem(code, 'ASCII'))
  const unicodeCodes = [160, 169, 174, 176, 177, 215, 247, 8364, 8451, 8482, 8592, 8593, 8594, 8595, 8730, 8734, 8800, 8804, 8805, 9733, 9734, 10003, 10005, 12288, 19968, 20013, 25991]
  unicodeCodes.forEach((code) => list.push(buildItem(code, 'Unicode')))
  return list
}

function buildItem(code, group) {
  const hex = code.toString(16).toUpperCase().padStart(code <= 255 ? 2 : 4, '0')
  const bin = code <= 255 ? code.toString(2).padStart(8, '0') : ''
  const name = code < 32 ? CONTROL_NAMES[code] : (code === 127 ? 'DEL' : '')
  const char = name || (code === 32 ? 'SPACE' : String.fromCodePoint(code))
  const desc = name ? (CONTROL_DESC[name] || '控制字符') : (code === 127 ? '删除控制字符' : (group === 'ASCII' ? '可打印字符' : 'Unicode 基础符号'))
  const binText = bin ? `BIN ${bin} · ` : ''
  const searchText = [char, name, desc, code, hex, bin, `DEC ${code}`, `DEC:${code}`, `HEX ${hex}`, `HEX:${hex}`, `U+${hex}`].filter(Boolean).join(' ')
  return { id: `${group}-${code}`, code, hex, bin, binText, char, name, desc, group, searchText, copy: `${char} DEC:${code} HEX:${hex} U+${hex}` }
}

const ALL_LIST = buildList()

Page({
  data: {
    keyword: '',
    activeGroup: '全部',
    groups: ['全部', '控制字符', '可打印字符', 'Unicode'],
    list: []
  },

  onLoad() {
    this.refreshList()
  },

  onSearch(e) {
    this.setData({ keyword: (e.detail.value || '').trim() }, () => this.refreshList())
  },

  refreshList() {
    const activeGroup = this.data.activeGroup
    const source = ALL_LIST.filter((item) => {
      if (activeGroup === '控制字符') return item.group === 'ASCII' && (item.code < 32 || item.code === 127)
      if (activeGroup === '可打印字符') return item.group === 'ASCII' && item.code >= 32 && item.code < 127
      if (activeGroup === 'Unicode') return item.group === 'Unicode'
      return true
    })
    const list = this.searchItems(source, this.data.keyword)
    this.setData({ list })
  },

  searchItems(source, keyword) {
    const query = String(keyword || '').trim()
    if (!query) return source
    const upper = query.toUpperCase()
    if (/^U\+[0-9A-F]+$/i.test(query)) return source.filter((item) => item.hex === upper.slice(2))
    if (/^0X[0-9A-F]+$/i.test(query)) return source.filter((item) => item.hex === upper.slice(2))
    if (/^[0-9]+$/.test(query)) return source.filter((item) => String(item.code) === query)
    if (Array.from(query).length === 1) return source.filter((item) => item.char === query)
    return source.filter((item) => item.searchText.toUpperCase().includes(upper))
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => this.refreshList())
  },

  switchGroup(e) {
    this.setData({ activeGroup: e.currentTarget.dataset.group }, () => this.refreshList())
  },

  copyItem(e) {
    const value = e.currentTarget.dataset.value || ''
    if (!value) return
    copyText(value)
  }
})
