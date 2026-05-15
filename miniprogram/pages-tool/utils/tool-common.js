const STORE_PREFIX = 'learn_tool_'

const getStore = (key, fallback) => {
  try {
    const value = wx.getStorageSync(STORE_PREFIX + key)
    return value === '' || value === undefined ? fallback : value
  } catch (error) {
    return fallback
  }
}

const setStore = (key, value) => {
  try {
    wx.setStorageSync(STORE_PREFIX + key, value)
  } catch (error) {}
}

const addHistory = (key, item, limit = 10) => {
  const list = getStore(`${key}_history`, [])
  const signature = item.id || item.text || item.title || JSON.stringify(item)
  const next = [item].concat(list.filter((entry) => (entry.id || entry.text || entry.title || JSON.stringify(entry)) !== signature)).slice(0, limit)
  setStore(`${key}_history`, next)
  return next
}

const clearHistory = (key) => {
  setStore(`${key}_history`, [])
  return []
}

const getHistory = (key) => getStore(`${key}_history`, [])

const getFavorites = (key) => getStore(`${key}_favorites`, [])

const isFavorite = (key, id) => getFavorites(key).includes(id)

const toggleFavorite = (key, id) => {
  const list = getFavorites(key)
  const next = list.includes(id) ? list.filter((item) => item !== id) : [id].concat(list)
  setStore(`${key}_favorites`, next)
  return next
}

const normalize = (value) => String(value || '').toLowerCase().trim()

const filterItems = (items, keyword, fields) => {
  const query = normalize(keyword)
  if (!query) return items
  return items.filter((item) => fields.some((field) => normalize(item[field]).includes(query)))
}

const copyText = (text, title = '已复制') => {
  wx.setClipboardData({
    data: String(text || ''),
    success: () => wx.showToast({ title, icon: 'success' })
  })
}

const todayKey = () => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const m = `${Math.floor(safe / 60)}`.padStart(2, '0')
  const s = `${safe % 60}`.padStart(2, '0')
  return `${m}:${s}`
}

module.exports = {
  addHistory,
  clearHistory,
  getFavorites,
  getHistory,
  isFavorite,
  toggleFavorite,
  filterItems,
  copyText,
  todayKey,
  formatDuration,
  getStore,
  setStore
}
