Page({
  data: {
    signatureTempFilePath: '',
    signatureMeta: null,
    isSaving: false
  },

  openSignatureEditor() {
    wx.navigateTo({
      url: '/pages-tool/signature-editor/index'
    });
  },

  applySignatureResult(result) {
    this.setData({
      signatureTempFilePath: result.tempFilePath,
      signatureMeta: result
    });
  },

  saveSignatureToAlbum() {
    const { signatureTempFilePath, isSaving } = this.data;

    if (!signatureTempFilePath) {
      wx.showToast({ title: '请先签名', icon: 'none' });
      return;
    }

    if (isSaving) {
      return;
    }

    this.setData({ isSaving: true });

    wx.saveImageToPhotosAlbum({
      filePath: signatureTempFilePath,
      success: () => {
        wx.showToast({ title: '已保存到相册' });
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ isSaving: false });
      }
    });
  },

  clearSignatureResult() {
    this.setData({
      signatureTempFilePath: '',
      signatureMeta: null
    });
  }
});
