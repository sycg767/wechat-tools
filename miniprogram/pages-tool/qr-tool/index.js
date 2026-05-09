const request = require('../../utils/request');
const upload = require('../../utils/upload');

function extractShortCodeFromText(text) {
  if (!text) return '';
  const match = text.match(/\/api\/tool\/qr\/s\/([0-9a-zA-Z]{6,16})/);
  return match ? match[1] : '';
}

function downloadToTempFile(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve('');
      return;
    }
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error('下载二维码失败'));
      },
      fail: (err) => reject(err)
    });
  });
}

Page({
  data: {
    activeTab: 'generate', // generate | decode
    content: '',
    tempFilePath: '',
    processing: false,
    progress: 0,
    statusText: '',
    resultUrl: '',
    decodedText: ''
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab,
      resultUrl: '',
      decodedText: '',
      tempFilePath: '',
      processing: false
    });
  },

  onInputContent(e) {
    this.setData({ content: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          tempFilePath: res.tempFiles[0].tempFilePath,
          decodedText: '',
          resultUrl: ''
        });
      }
    });
  },

  async generateQR() {
    if (!this.data.content) return;

    this.setData({
      processing: true,
      progress: 10,
      statusText: '正在创建短链...',
      resultUrl: '',
      decodedText: ''
    });

    try {
      const shortLinkRes = await request.post('/tool/qr-create-short-link', {
        content: this.data.content
      });

      if (shortLinkRes.code !== 200 || !shortLinkRes.data || !shortLinkRes.data.shortUrl) {
        throw new Error(shortLinkRes.message || '短链创建失败');
      }

      this.setData({
        progress: 35,
        statusText: '正在生成二维码...'
      });

      const res = await request.post('/tool/qr-generate', {
        content: shortLinkRes.data.shortUrl
      });

      if (res.code === 200) {
        this.pollTaskStatus(res.data);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
      this.setData({ processing: false });
    }
  },

  async decodeQR() {
    if (!this.data.tempFilePath) return;

    this.setData({
      processing: true,
      progress: 0,
      statusText: '正在上传图片 0%',
      resultUrl: '',
      decodedText: ''
    });

    try {
      const res = await upload('/tool/qr-decode', this.data.tempFilePath, {}, {
        onProgress: ({ progress }) => {
          this.setData({
            progress,
            statusText: `正在上传图片 ${progress}%`
          });
        },
        onResponsePending: () => {
          this.setData({
            statusText: '图片处理中'
          });
        }
      });

      if (res.code === 200) {
        this.pollTaskStatus(res.data);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      wx.showToast({ title: err.message || '识别失败', icon: 'none' });
      this.setData({ processing: false });
    }
  },

  async pollTaskStatus(taskId) {
    const timer = setInterval(async () => {
      try {
        const res = await request.get(`/file/status/${taskId}`);
        if (res.code === 200) {
          const status = res.data;
          if (status.status === 'SUCCESS') {
            clearInterval(timer);

            if (this.data.activeTab === 'generate') {
              let localResultPath = status.resultUrl || '';
              if (status.resultUrl) {
                try {
                  localResultPath = await downloadToTempFile(status.resultUrl);
                } catch (_) {}
              }
              this.setData({
                processing: false,
                progress: 100,
                resultUrl: localResultPath,
                decodedText: ''
              });
              wx.showToast({ title: '处理完成', icon: 'success' });
              return;
            }

            const rawText = status.extraData || '';
            const shortCode = extractShortCodeFromText(rawText);
            if (shortCode) {
              try {
                const contentRes = await request.get(`/tool/qr-content/${shortCode}`);
                if (contentRes.code === 200 && contentRes.data && contentRes.data.content) {
                  this.setData({
                    processing: false,
                    progress: 100,
                    resultUrl: '',
                    decodedText: contentRes.data.content
                  });
                  wx.showToast({ title: '处理完成', icon: 'success' });
                  return;
                }
              } catch (_) {}
            }

            this.setData({
              processing: false,
              progress: 100,
              resultUrl: '',
              decodedText: rawText
            });
            wx.showToast({ title: '处理完成', icon: 'success' });
          } else if (status.status === 'FAIL') {
            clearInterval(timer);
            this.setData({ processing: false });
            wx.showModal({ title: '处理失败', content: status.message, showCancel: false });
          } else {
            this.setData({
              progress: status.progress || 50,
              statusText: status.status === 'PROCESSING' ? '正在处理中...' : '排队中...'
            });
          }
        }
      } catch (err) {
        clearInterval(timer);
        this.setData({ processing: false });
      }
    }, 1500);
  },

  scanCode() {
    wx.scanCode({
      success: async (res) => {
        const rawText = res.result || '';
        const shortCode = extractShortCodeFromText(rawText);
        if (shortCode) {
          try {
            const contentRes = await request.get(`/tool/qr-content/${shortCode}`);
            if (contentRes.code === 200 && contentRes.data && contentRes.data.content) {
              this.setData({
                decodedText: contentRes.data.content,
                activeTab: 'decode',
                tempFilePath: ''
              });
              wx.showToast({ title: '识别成功' });
              return;
            }
          } catch (_) {}
        }

        this.setData({
          decodedText: rawText,
          activeTab: 'decode',
          tempFilePath: ''
        });
        wx.showToast({ title: '识别成功' });
      }
    });
  },

  copyResult() {
    wx.setClipboardData({
      data: this.data.decodedText,
      success: () => {
        wx.showToast({ title: '已复制' });
      }
    });
  }
});
