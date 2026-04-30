function formatRelativeTime(timestamp) {
  if (!timestamp) return '刚刚'
  
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // 小于 1 分钟
    return '刚刚'
  }
  
  if (diff < 3600000) { // 小于 1 小时
    return `${Math.floor(diff / 60000)} 分钟前`
  }
  
  if (diff < 86400000) { // 小于 24 小时
    return `${Math.floor(diff / 3600000)} 小时前`
  }
  
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  
  const currentYear = new Date().getFullYear()
  if (y === currentYear) {
    return `${m}-${d} ${h}:${min}`
  }
  return `${y}-${m}-${d} ${h}:${min}`
}

module.exports = {
  formatRelativeTime
}