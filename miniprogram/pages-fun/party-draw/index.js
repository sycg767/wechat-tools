const taskStore = require('../../utils/task-store')

const PENALTIES = [
  '请客奶茶', '真心话一轮', '自罚一杯', '买单', '唱一首歌',
  '做10个深蹲', '模仿一个表情包', '给最近通话的第三个人发“我想你了”',
  '发朋友圈：我是大冤种', '现场表演一段才艺', '喝下一杯混搭饮料',
  '闭眼转圈10次后走直线', '用屁股写自己的名字', '深情朗诵一段说明书'
]

const FUNNY_QUOTES = [
  '天选之子，非你莫属！',
  '这就是命，认了吧。',
  '运气也是实力的一种，可惜你没有。',
  '全场最靓的仔，就是你了！',
  '恭喜这位幸运观众，喜提惩罚一份。',
  '别挣扎了，命运的齿轮已经转动。'
]

Page({
  data: {
    touchPoints: [],
    fingerCount: 0,
    countdown: 0,
    winnerId: '',
    winnerText: '',
    penalty: '',
    isFinished: false,
    drawTime: '',
    funnyQuote: ''
  },

  onLoad() {
    this.touchMap = new Map()
    this.countdownTimer = null
  },

  onTouchStart(e) {
    this.syncTouches(e.touches)
  },

  onTouchMove(e) {
    this.syncTouches(e.touches)
  },

  onTouchEnd(e) {
    this.syncTouches(e.touches)
  },

  syncTouches(touches) {
    this.touchMap.clear()
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i]
      this.touchMap.set(t.identifier, { id: String(t.identifier), x: t.clientX, y: t.clientY })
    }

    const points = Array.from(this.touchMap.values()).map((p, idx) => ({ ...p, index: idx + 1 }))
    const fingerCount = points.length

    this.setData({ touchPoints: points, fingerCount })

    if (this.data.isFinished) {
      if (fingerCount === 0) {
        this.setData({ isFinished: false })
      }
      return
    }

    if (fingerCount >= 2 && fingerCount <= 8) {
      this.armCountdown()
    } else {
      this.resetCountdown()
    }
  },

  armCountdown() {
    if (this.countdownTimer) return
    this.setData({ countdown: 3, winnerId: '', winnerText: '', penalty: '' })
    this.countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1
      if (this.data.fingerCount < 2 || this.data.fingerCount > 8) {
        this.resetCountdown()
        return
      }
      if (next <= 0) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
        this.setData({ countdown: 0 })
        this.pickWinner()
        return
      }
      this.setData({ countdown: next })
    }, 1000)
  },

  resetCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    if (this.data.countdown !== 0) {
      this.setData({ countdown: 0 })
    }
  },

  pickWinner() {
    const points = this.data.touchPoints
    if (points.length < 2) return
    const winner = points[Math.floor(Math.random() * points.length)]
    const penalty = PENALTIES[Math.floor(Math.random() * PENALTIES.length)]
    const funnyQuote = FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]
    const date = new Date()
    const drawTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`

    this.setData({
      winnerId: winner.id,
      winnerText: `第 ${winner.index} 位`,
      penalty,
      funnyQuote,
      drawTime,
      isFinished: true
    })
    wx.vibrateShort({ type: 'heavy' })

    const now = Date.now()
    taskStore.upsertTask({
      taskId: `party_draw_${now}`,
      toolType: 'party-draw',
      sourceFileName: `${points.length}人抽签`,
      resultFileName: `第${winner.index}位`,
      status: 'SUCCESS',
      createdAt: now,
      updatedAt: now,
      message: `中签惩罚：${penalty}`
    })
  },

  onUnload() {
    this.resetCountdown()
  },

  onShareAppMessage() {
    return {
      title: '聚会抽签：看看谁是今晚大冤种',
      path: '/pages-fun/party-draw/index'
    }
  }
})
