const taskStore = require('../../utils/task-store')

const ANSWERS = [
  '去做吧', '顺其自然', '换个思路', '先等等', '现在不宜冲动', '答案就在你心里',
  '大胆一点', '先休息再决定', '再问一次会更清晰', '把标准放低一点', '从最小一步开始',
  '可以，但别贪心', '先把手头做完', '今晚会有灵感', '不如请人帮你看一眼', '暂时按兵不动',
  '今天适合摸鱼', '今天适合推进', '相信直觉', '保留余地'
]

function formatDate(ts = Date.now()) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

Page({
  data: {
    question: '',
    currentAnswer: '',
    isRevealing: false,
    todayText: formatDate(),
    canvas: null,
    canvasWidth: 0,
    canvasHeight: 0
  },

  onReady() {
    this.initPosterCanvas()
  },

  initPosterCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res[0]
        if (!info || !info.node) return
        const canvas = info.node
        const dpr = wx.getWindowInfo().pixelRatio
        canvas.width = info.width * dpr
        canvas.height = info.height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        this.posterCtx = ctx
        this.setData({
          canvas,
          canvasWidth: info.width,
          canvasHeight: info.height
        })
      })
  },

  onInputQuestion(e) {
    this.setData({ question: e.detail.value })
  },

  playFlipFeedback() {
    wx.vibrateShort({ type: 'light' })
  },

  drawAnswer() {
    if (this.data.isRevealing) return
    this.setData({ isRevealing: true })
    this.playFlipFeedback()
    setTimeout(() => {
      const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
      const now = Date.now()
      this.setData({
        currentAnswer: answer,
        todayText: formatDate(now),
        isRevealing: false
      })

      taskStore.upsertTask({
        taskId: `book_answer_${now}`,
        toolType: 'book-answer',
        sourceFileName: this.data.question || '未输入问题',
        resultFileName: answer,
        status: 'SUCCESS',
        createdAt: now,
        updatedAt: now,
        message: `答案之书：${answer}`
      })

    }, 760)
  },


  async savePoster() {
    if (!this.data.currentAnswer || !this.posterCtx || !this.data.canvas) {
      return
    }

    const ctx = this.posterCtx
    const w = this.data.canvasWidth
    const h = this.data.canvasHeight

    const sidePadding = Math.max(24, Math.floor(w * 0.08))
    const cardX = sidePadding
    const cardY = Math.floor(h * 0.28)
    const cardW = w - sidePadding * 2
    const cardH = Math.floor(h * 0.58)

    const titleSize = Math.max(30, Math.floor(w * 0.09))
    const dateSize = Math.max(18, Math.floor(w * 0.055))
    const answerSize = Math.max(28, Math.floor(w * 0.1))
    const questionSize = Math.max(16, Math.floor(w * 0.046))

    ctx.clearRect(0, 0, w, h)

    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, '#fdf6e3')
    gradient.addColorStop(1, '#f5e7c8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#2a1a18'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${titleSize}px sans-serif`
    ctx.fillText('答案之书', w / 2, Math.floor(h * 0.12))

    ctx.fillStyle = '#5f4a3f'
    ctx.font = `${dateSize}px sans-serif`
    ctx.fillText(this.data.todayText, w / 2, Math.floor(h * 0.19))

    ctx.fillStyle = '#fffdf8'
    roundRect(ctx, cardX, cardY, cardW, cardH, 20)
    ctx.fill()

    ctx.fillStyle = '#2a1a18'
    ctx.font = `bold ${answerSize}px sans-serif`
    const answerBottomY = wrapCenterText(
      ctx,
      this.data.currentAnswer,
      w / 2,
      cardY + Math.floor(cardH * 0.28),
      cardW - 56,
      Math.floor(answerSize * 1.45),
      3
    )

    const question = this.data.question.trim() || '（未填写问题）'
    ctx.fillStyle = '#7a6a60'
    ctx.font = `${questionSize}px sans-serif`
    wrapCenterText(
      ctx,
      `问题：${question}`,
      w / 2,
      Math.max(answerBottomY + 34, cardY + Math.floor(cardH * 0.66)),
      cardW - 44,
      Math.floor(questionSize * 1.45),
      3
    )

    try {
      wx.showLoading({ title: '生成中' })
      await new Promise((resolve) => setTimeout(resolve, 30))
      await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this.data.canvas,
          fileType: 'png',
          success: resolve,
          fail: reject
        })
      }).then((res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (err) => {
            const msg = err.errMsg || ''
            if (msg.includes('auth deny') || msg.includes('auth denied')) {
              wx.showToast({ title: '请先开启相册权限', icon: 'none' })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      })
    } finally {
      wx.hideLoading()
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.currentAnswer ? `答案之书：${this.data.currentAnswer}` : '来翻一页答案之书',
      path: '/pages/book-answer/index'
    }
  },

  onUnload() {
  }
})

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapCenterText(ctx, text, centerX, startY, maxWidth, lineHeight, maxLines = 99) {
  const chars = String(text || '').split('')
  const lines = []
  let line = ''

  chars.forEach((ch) => {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  })
  if (line) lines.push(line)

  const drawLines = lines.slice(0, maxLines)
  let y = startY
  drawLines.forEach((item, idx) => {
    const isLast = idx === drawLines.length - 1
    const hasMore = lines.length > maxLines && isLast
    const textToDraw = hasMore ? `${item.slice(0, Math.max(0, item.length - 1))}…` : item
    ctx.fillText(textToDraw, centerX, y)
    y += lineHeight
  })

  return y - lineHeight
}
