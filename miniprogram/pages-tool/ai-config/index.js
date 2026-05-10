const { getAiConfig, saveAiConfig, validateAiConfig } = require('../../utils/ai-config')

Page({
  data: {
    config: getAiConfig(),
    showKey: false,
    issues: []
  },

  onShow() {
    this.setData({ config: getAiConfig() })
  },

  onBaseUrlInput(event) {
    this.setData({ 'config.baseUrl': event.detail.value })
  },

  onModelInput(event) {
    this.setData({ 'config.model': event.detail.value })
  },

  onApiKeyInput(event) {
    this.setData({ 'config.apiKey': event.detail.value })
  },

  toggleKey() {
    this.setData({ showKey: !this.data.showKey })
  },

  saveConfig() {
    const config = this.data.config
    const issues = validateAiConfig(config)
    if (issues.length) {
      this.setData({ issues })
      wx.showToast({ title: '请先填写完整配置', icon: 'none' })
      return
    }
    saveAiConfig(config)
    this.setData({ issues: [] })
    wx.showToast({ title: '配置已保存', icon: 'success' })
  }
})
