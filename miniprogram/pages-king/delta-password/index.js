const request = require('../../utils/request')

Page({
  data: {
    loading: true,
    refreshing: false,
    error: '',
    items: [],
    sourceName: '',
    sourceUrl: '',
    fetchedAt: '',
    stale: false
  },

  onLoad() {
    this.loadPasswords()
  },

  async loadPasswords() {
    this.setData({ loading: true, error: '' })
    await this.fetchPasswords()
    this.setData({ loading: false })
  },

  async handleRefresh() {
    if (this.data.refreshing) return
    this.setData({ refreshing: true, error: '' })
    await this.fetchPasswords()
    this.setData({ refreshing: false })
  },

  async fetchPasswords() {
    try {
      const res = await request.get('/game/delta-force/passwords')
      const data = res.data || {}
      this.setData({
        items: Array.isArray(data.items) ? data.items : [],
        sourceName: data.sourceName || '三角洲行动一图流',
        sourceUrl: data.sourceUrl || '',
        fetchedAt: data.fetchedAt || '',
        stale: !!data.stale,
        error: ''
      })
    } catch (error) {
      this.setData({ error: error.message || '每日密码获取失败' })
    }
  },

  handleCopy(event) {
    const password = event.currentTarget.dataset.password
    const mapName = event.currentTarget.dataset.mapName
    if (!password) return
    wx.setClipboardData({
      data: password,
      success: () => wx.showToast({ title: `${mapName || '密码'}已复制`, icon: 'none' })
    })
  }
})
