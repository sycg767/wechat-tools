Page({
  data: {
    colors: ['#000000', '#B42318', '#1D4ED8'],
    currentColor: '#000000',
    canvas: null,
    ctx: null,
    hasDraw: false,
    canvasWidth: 0,
    canvasHeight: 0
  },

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#signatureCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasInfo = res[0];
        if (!canvasInfo || !canvasInfo.node) {
          return;
        }

        const canvas = canvasInfo.node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        const logicalWidth = canvasInfo.width;
        const logicalHeight = canvasInfo.height;

        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.data.currentColor;

        this.setData({
          canvas,
          ctx,
          canvasWidth: logicalWidth,
          canvasHeight: logicalHeight
        });
      });
  },

  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ currentColor: color });

    if (this.data.ctx) {
      this.data.ctx.strokeStyle = color;
    }
  },

  touchStart(e) {
    if (!this.data.ctx) {
      return;
    }

    const { x, y } = e.touches[0];
    this.data.ctx.beginPath();
    this.data.ctx.moveTo(x, y);
    this.setData({ hasDraw: true });
  },

  touchMove(e) {
    if (!this.data.ctx || !this.data.hasDraw) {
      return;
    }

    const { x, y } = e.touches[0];
    this.data.ctx.lineTo(x, y);
    this.data.ctx.stroke();
  },

  touchEnd() {
    if (!this.data.ctx) {
      return;
    }

    this.data.ctx.closePath();
  },

  clearCanvas() {
    const { ctx, canvasWidth, canvasHeight } = this.data;

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.setData({ hasDraw: false });
  },

  exportSignatureTempFile() {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: this.data.canvas,
        fileType: 'png',
        success: resolve,
        fail: reject
      });
    });
  },

  async confirmSignature() {
    if (!this.data.hasDraw) {
      wx.showToast({ title: '请先签名', icon: 'none' });
      return;
    }

    try {
      const res = await this.exportSignatureTempFile();
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];

      if (prevPage && typeof prevPage.applySignatureResult === 'function') {
        prevPage.applySignatureResult({
          tempFilePath: res.tempFilePath,
          exportedAt: Date.now(),
          color: this.data.currentColor
        });
      }

      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },

  cancelSignature() {
    wx.navigateBack();
  }
});
