Page({
  data: {
    activeTab: 'number', // number | password
    min: 1,
    max: 100,
    count: 1,
    pwdLength: 12,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: false,
    results: []
  },

  switchTab(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab,
      results: []
    });
  },

  onInputMin(e) { this.setData({ min: parseInt(e.detail.value) || 0 }); },
  onInputMax(e) { this.setData({ max: parseInt(e.detail.value) || 0 }); },
  onCountChange(e) { this.setData({ count: e.detail.value }); },
  onPwdLengthChange(e) { this.setData({ pwdLength: e.detail.value }); },

  toggleOption(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: !this.data[key] });
  },

  generateNumbers() {
    const { min, max, count } = this.data;
    if (min >= max) {
      wx.showToast({ title: '最小值需小于最大值', icon: 'none' });
      return;
    }
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    this.setData({ results });
  },

  generatePassword() {
    const { pwdLength, useUppercase, useLowercase, useNumbers, useSymbols } = this.data;
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+~`|}{[]:;?><,./-';

    let charset = '';
    if (useUppercase) charset += upper;
    if (useLowercase) charset += lower;
    if (useNumbers) charset += nums;
    if (useSymbols) charset += syms;

    if (!charset) {
      wx.showToast({ title: '请至少选择一种字符类型', icon: 'none' });
      return;
    }

    let password = '';
    for (let i = 0; i < pwdLength; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.setData({ results: [password] });
  },

  copyItem(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text.toString(),
      success: () => wx.showToast({ title: '已复制' })
    });
  },

  copyAll() {
    wx.setClipboardData({
      data: this.data.results.join('\n'),
      success: () => wx.showToast({ title: '全部已复制' })
    });
  }
});