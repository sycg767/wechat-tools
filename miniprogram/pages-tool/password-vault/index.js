const { get, post } = require('../../utils/request')

let revealTimer = null

Page({
  data: {
    keyword: '',
    loading: false,
    items: [],
    revealingId: '',
    revealedPassword: ''
  },

  onShow() {
    this.loadItems()
  },

  onHide() {
    this.clearRevealState()
  },

  onUnload() {
    this.clearRevealState()
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this.loadItems()
  },

  goCreate() {
    wx.navigateTo({ url: '/pages-tool/password-vault/edit' })
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages-tool/password-vault/detail?id=${id}` })
  },

  clearRevealState() {
    if (revealTimer) {
      clearTimeout(revealTimer)
      revealTimer = null
    }
    this.setData({ revealingId: '', revealedPassword: '' })
  },

  async revealPassword(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    try {
      const res = await post(`/vault/items/${id}/reveal`, {}, { 'Content-Type': 'application/json' })
      const password = (res.data && res.data.password) || ''
      this.clearRevealState()
      this.setData({ revealingId: Number(id), revealedPassword: password })
      revealTimer = setTimeout(() => {
        this.setData({ revealingId: '', revealedPassword: '' })
      }, 8000)
    } catch (err) {
      wx.showToast({ title: err.message || '显示失败', icon: 'none' })
    }
  },

  copyPassword(e) {
    const password = e.currentTarget.dataset.password
    if (!password) {
      wx.showToast({ title: '请先显示密码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: String(password),
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  async loadItems() {
    this.clearRevealState()
    this.setData({ loading: true })
    try {
      const { keyword } = this.data
      const query = [
        `page=1`,
        `size=50`,
        keyword ? `keyword=${encodeURIComponent(keyword.trim())}` : ''
      ].filter(Boolean).join('&')
      const res = await get(`/vault/items?${query}`)
      this.setData({ items: (res.data && res.data.items) || [] })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
