const taskStore = require('../../utils/task-store')

const GRID_COLS = 6
const GRID_ROWS = 7
const BUBBLE_COUNT = GRID_COLS * GRID_ROWS
const GOLD_RATE = 0.04
const MIN_VIBRATE_INTERVAL = 70
const COMBO_RESET_DELAY = 900
const CELEBRATION_HIDE_DELAY = 700

Page({
  data: {
    bubbles: [],
    totalPopCount: 0,
    combo: 0,
    goldHits: 0,
    progress: 0,
    poppedCount: 0,
    burstText: '',
    burstVisible: false,
    boardFlash: false
  },

  onLoad() {
    this.lastVibrateAt = 0
    this.comboTimer = null
    this.celebrationTimer = null
    this.hitCache = new Set()
    this.refreshBoard()
  },

  buildBubbles() {
    return Array.from({ length: BUBBLE_COUNT }, (_, idx) => ({
      id: idx,
      popped: false,
      type: Math.random() < GOLD_RATE ? 'gold' : 'normal'
    }))
  },

  refreshBoard() {
    clearTimeout(this.comboTimer)
    clearTimeout(this.celebrationTimer)
    this.hitCache.clear()
    this.setData({
      bubbles: this.buildBubbles(),
      combo: 0,
      progress: 0,
      poppedCount: 0,
      burstText: '',
      burstVisible: false,
      boardFlash: false
    })
  },

  onBoardTouchStart() {
    this.hitCache.clear()
  },

  onBubbleTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.tryPopBubble(id)
  },

  tryPopBubble(id) {
    if (this.hitCache.has(id)) return
    const bubbles = [...this.data.bubbles]
    const idx = bubbles.findIndex((b) => b.id === id)
    if (idx < 0 || bubbles[idx].popped) return

    this.hitCache.add(id)
    bubbles[idx] = { ...bubbles[idx], popped: true }

    const isGold = bubbles[idx].type === 'gold'
    const totalPopCount = this.data.totalPopCount + 1
    const combo = this.data.combo + 1
    const goldHits = this.data.goldHits + (isGold ? 1 : 0)
    const poppedCount = this.data.poppedCount + 1
    const progress = Math.round((poppedCount / BUBBLE_COUNT) * 100)

    this.setData({
      bubbles,
      totalPopCount,
      combo,
      goldHits,
      poppedCount,
      progress,
      burstText: this.buildBurstText(combo, isGold),
      burstVisible: true,
      boardFlash: isGold
    })
    this.playFeedback(isGold)

    clearTimeout(this.comboTimer)
    this.comboTimer = setTimeout(() => {
      this.setData({ combo: 0 })
    }, COMBO_RESET_DELAY)

    clearTimeout(this.celebrationTimer)
    this.celebrationTimer = setTimeout(() => {
      this.setData({ burstVisible: false, boardFlash: false })
    }, CELEBRATION_HIDE_DELAY)

    if (bubbles.every((b) => b.popped)) {
      this.logResult(totalPopCount, goldHits)
      setTimeout(() => this.refreshBoard(), 220)
    }
  },

  buildBurstText(combo, isGold) {
    if (isGold) {
      return combo >= 8 ? '暴击金泡！' : '金泡命中！'
    }
    if (combo >= 20) return '停不下来！'
    if (combo >= 12) return '手感火热！'
    if (combo >= 6) return '啪！啪！啪！'
    return '啵！'
  },

  playFeedback(isGold) {
    const now = Date.now()
    if (now - this.lastVibrateAt >= MIN_VIBRATE_INTERVAL) {
      this.lastVibrateAt = now
      wx.vibrateShort({ type: isGold ? 'medium' : 'light' })
    }
  },

  logResult(totalPopCount, goldHits) {
    const now = Date.now()
    taskStore.upsertTask({
      taskId: `bubble_wrap_${now}`,
      toolType: 'bubble-wrap',
      sourceFileName: '气泡膜解压器',
      resultFileName: `累计${totalPopCount}，金币${goldHits}`,
      status: 'SUCCESS',
      createdAt: now,
      updatedAt: now,
      message: `捏爆一整屏，金币彩蛋 ${goldHits}`
    })
  },

  onUnload() {
    clearTimeout(this.comboTimer)
    clearTimeout(this.celebrationTimer)
  },

  onShareAppMessage() {
    return {
      title: `我在气泡膜解压器捏爆了 ${this.data.totalPopCount} 个气泡`,
      path: '/pages-fun/bubble-wrap/index'
    }
  }
})
