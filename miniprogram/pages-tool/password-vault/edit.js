const { post, get, request } = require('../../utils/request')

Page({
  data: {
    id: '',
    editing: false,
    submitting: false,
    form: {
      platform: '',
      account: '',
      password: '',
      note: ''
    }
  },

  onLoad(options) {
    const id = options && options.id
    if (!id) return
    this.setData({ id, editing: true })
    this.loadDetail(id)
  },

  async loadDetail(id) {
    try {
      wx.showLoading({ title: '加载中', mask: true })
      const res = await get(`/vault/items/${id}`)
      const item = res.data || {}
      this.setData({
        form: {
          platform: item.platform || '',
          account: item.account || '',
          password: '',
          note: item.note || ''
        }
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  buildPayload() {
    const form = this.data.form
    return {
      platform: form.platform.trim(),
      account: form.account.trim(),
      password: form.password,
      note: form.note
    }
  },

  async submit() {
    const payload = this.buildPayload()
    if (!payload.platform || !payload.account) {
      wx.showToast({ title: '请填写平台和账号', icon: 'none' })
      return
    }
    if (!this.data.editing && !payload.password) {
      wx.showToast({ title: '请填写密码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      wx.showLoading({ title: '保存中', mask: true })
      if (this.data.editing) {
        await request({
          url: `/vault/items/${this.data.id}`,
          method: 'PUT',
          data: payload,
          header: { 'Content-Type': 'application/json' }
        })
      } else {
        await post('/vault/items', payload, { 'Content-Type': 'application/json' })
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 400)
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  }
})
