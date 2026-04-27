Page({
  data: {
    colors: ['#000000', '#ff0000', '#0000ff'],
    currentColor: '#000000',
    canvas: null,
    ctx: null,
    hasDraw: false
  },

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#signatureCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.data.currentColor;

        this.setData({ canvas, ctx });
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
    const { x, y } = e.touches[0];
    this.data.ctx.beginPath();
    this.data.ctx.moveTo(x, y);
    this.setData({ hasDraw: true });
  },

  touchMove(e) {
    const { x, y } = e.touches[0];
    this.data.ctx.lineTo(x, y);
    this.data.ctx.stroke();
  },

  touchEnd() {
    this.data.ctx.closePath();
  },

  clearCanvas() {
    const { canvas, ctx } = this.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.setData({ hasDraw: false });
  },

  saveSignature() {
    if (!this.data.hasDraw) {
      wx.showToast({ title: '请先签名', icon: 'none' });
      return;
    }

    wx.canvasToTempFilePath({
      canvas: this.data.canvas,
      fileType: 'png',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({ title: '已保存到相册' });
          },
          fail: () => {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      }
    });
  }
});