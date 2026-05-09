const { get, post, request } = require('../../utils/request')

let hideTimer = null

Page({
  data: {
    id: '',
    loading: true,
    item: null,
    revealedPassword: '',
    revealing: false,
    deleting: false
  },

  onLoad(options) {
    const id = options && options.id
    if (!id) {
      wx.showToast({ title: '缺少记录 ID', icon: 'none' })
      return
    }
    this.setData({ id })
  },

  onShow() {
    if (this.data.id) {
      this.loadDetail(this.data.id)
    }
  },

  onUnload() {
    this.clearRevealTimer()
    this.setData({ revealedPassword: '' })
  },

  clearRevealTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  },

  async loadDetail(id) {
    this.setData({ loading: true })
    try {
      const res = await get(`/vault/items/${id}`)
      this.setData({ item: res.data || null })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async revealPassword() {
    this.setData({ revealing: true })
    try {
      const res = await post(`/vault/items/${this.data.id}/reveal`, {}, { 'Content-Type': 'application/json' })
      this.setData({ revealedPassword: (res.data && res.data.password) || '' })
      this.clearRevealTimer()
      hideTimer = setTimeout(() => {
        this.setData({ revealedPassword: '' })
      }, 8000)
    } catch (e) {
      wx.showToast({ title: e.message || '显示失败', icon: 'none' })
    } finally {
      this.setData({ revealing: false })
    }
  },

  goEdit() {
    wx.navigateTo({ url: `/pages-tool/password-vault/edit?id=${this.data.id}` })
  },

  async removeItem() {
    if (this.data.deleting) return
    wx.showModal({
      title: '确认删除',
      content: '删除后该记录会从列表中隐藏。',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ deleting: true })
        try {
          await request({ url: `/vault/items/${this.data.id}`, method: 'DELETE' })
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 300)
        } catch (e) {
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
        } finally {
          this.setData({ deleting: false })
        }
      }
    })
  }
})
