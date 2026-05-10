const AI_CONFIG_KEY = 'common_ai_config_v1'

const DEFAULT_AI_CONFIG = {
  baseUrl: '',
  model: '',
  apiKey: ''
}

function getAiConfig() {
  const stored = wx.getStorageSync(AI_CONFIG_KEY) || {}
  return { ...DEFAULT_AI_CONFIG, ...stored }
}

function saveAiConfig(partial) {
  const merged = { ...getAiConfig(), ...partial }
  wx.setStorageSync(AI_CONFIG_KEY, merged)
  return merged
}

function validateAiConfig(config) {
  const issues = []
  if (!config.baseUrl || !config.baseUrl.trim()) issues.push('请求地址未填写')
  if (!config.model || !config.model.trim()) issues.push('模型未填写')
  if (!config.apiKey || !config.apiKey.trim()) issues.push('密钥未填写')
  return issues
}

module.exports = { getAiConfig, saveAiConfig, validateAiConfig, DEFAULT_AI_CONFIG }
