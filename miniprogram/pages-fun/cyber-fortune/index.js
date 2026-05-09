const taskStore = require('../../utils/task-store')

const STORAGE_KEY = 'cyber_fortune_collection_v1'
const FORTUNES = [
  { id: 'f1', title: '上上签', text: '今日宜：原地躺平，大吉', good: '摸鱼', bad: '硬刚' },
  { id: 'f2', title: '中吉签', text: '小步快跑，会有惊喜', good: '推进', bad: '拖延' },
  { id: 'f3', title: '平签', text: '顺其自然，别太上头', good: '观察', bad: '冲动' },
  { id: 'f4', title: '灵感签', text: '换个角度，答案自来', good: '复盘', bad: '钻牛角尖' },
  { id: 'f5', title: '财运签', text: '今天少点外卖就算赚到', good: '节流', bad: '剁手' },
  { id: 'f6', title: '摸鱼签', text: '宜：摸鱼，忌：开会', good: '休整', bad: '内耗' },
  { id: 'f7', title: '大吉签', text: '今天适合把卡住的小事一口气清掉', good: '清单清零', bad: '继续积压' },
  { id: 'f8', title: '桃花签', text: '你的好运可能来自一句主动问候', good: '社交', bad: '冷处理' },
  { id: 'f9', title: '补能签', text: '电量见底时，先补觉再谈理想', good: '早睡', bad: '熬夜' },
  { id: 'f10', title: '破局签', text: '别盯着门，窗户今天也是出口', good: '变通', bad: '死磕' },
  { id: 'f11', title: '转运签', text: '把桌面清干净，心情也会一起重启', good: '整理', bad: '堆着不管' },
  { id: 'f12', title: '人缘签', text: '今天一句谢谢，胜过十句客套', good: '表达感谢', bad: '理所当然' },
  { id: 'f13', title: '行动签', text: '想太久不如先做五分钟', good: '开工', bad: '空想' },
  { id: 'f14', title: '锦鲤签', text: '你以为是普通一天，其实暗藏小惊喜', good: '出门', bad: '闷着' },
  { id: 'f15', title: '事业签', text: '今天适合发出那个拖了很久的消息', good: '沟通', bad: '回避' },
  { id: 'f16', title: '守成签', text: '稳住节奏，比突然发力更重要', good: '持续推进', bad: '三分钟热度' },
  { id: 'f17', title: '开运签', text: '换个顺手工具，效率会意外上涨', good: '优化流程', bad: '硬扛低效' },
  { id: 'f18', title: '好运签', text: '你今天的最佳决策，是先做最难的那件事', good: '先难后易', bad: '一直绕路' },
  { id: 'f19', title: '冷静签', text: '别急着回复，晚十分钟会更体面', good: '缓一缓', bad: '情绪输出' },
  { id: 'f20', title: '加餐签', text: '今日快乐来源于一口热乎的', good: '吃点好的', bad: '随便对付' }
]

Page({
  data: {
    isShaking: false,
    showStick: false,
    stickFloating: false,
    showScroll: false,
    scrollUnfolding: false,
    shakeTip: '摇一摇手机，或点击签筒抽签',
    currentFortune: {},
    collectedCount: 0,
    totalCount: FORTUNES.length
  },

  onLoad() {
    this.cooldownUntil = 0
    this.lastAcc = null
    this.collection = this.loadCollection()
    this.syncCollectionCount()
  },

  onShow() {
    this.startShakeListening()
  },

  onHide() {
    this.stopShakeListening()
  },

  onUnload() {
    this.stopShakeListening()
  },

  loadCollection() {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (!data || typeof data !== 'object') return {}
    return data
  },

  saveCollection() {
    wx.setStorageSync(STORAGE_KEY, this.collection)
  },

  syncCollectionCount() {
    const collectedCount = Object.keys(this.collection).length
    this.setData({ collectedCount })
  },

  startShakeListening() {
    if (this.isListening) return
    this.isListening = true
    wx.startAccelerometer({ interval: 'game' })
    wx.onAccelerometerChange(this.handleAccelerometer)
  },

  stopShakeListening() {
    if (!this.isListening) return
    this.isListening = false
    wx.stopAccelerometer()
    wx.offAccelerometerChange(this.handleAccelerometer)
  },

  handleAccelerometer(res) {
    const page = getCurrentPages().slice(-1)[0]
    if (!page || page.route !== 'pages/cyber-fortune/index') return
    page.onAccelerometerData(res)
  },

  onAccelerometerData(res) {
    const now = Date.now()
    if (now < this.cooldownUntil || this.data.isShaking || this.data.showStick || this.data.showScroll) return

    if (!this.lastAcc) {
      this.lastAcc = res
      return
    }

    const delta = Math.abs(res.x - this.lastAcc.x) + Math.abs(res.y - this.lastAcc.y) + Math.abs(res.z - this.lastAcc.z)
    this.lastAcc = res
    if (delta > 3.5) { // 稍微提高阈值以匹配赛博风格的力度感
      this.cooldownUntil = now + 2000
      this.onDrawFortune(true)
    }
  },

  onDrawFortune(byShake = false) {
    if (this.data.isShaking || this.data.showStick || this.data.showScroll) return

    // 第一阶段：摇动
    this.setData({ 
      isShaking: true, 
      shakeTip: '系统同步中...',
      currentFortune: {} 
    })

    // 触感反馈：连续短震动模拟摇晃
    const shakeVibrate = setInterval(() => {
      if (this.data.isShaking) {
        wx.vibrateShort({ type: 'light' })
      } else {
        clearInterval(shakeVibrate)
      }
    }, 100)

    setTimeout(() => {
      this.setData({ isShaking: false })
      clearInterval(shakeVibrate)
      
      // 第二阶段：签位弹出
      this.setData({ showStick: true })
      wx.vibrateShort({ type: 'medium' })

      setTimeout(() => {
        // 第三阶段：签位悬浮
        this.setData({ stickFloating: true })
        
        setTimeout(() => {
          // 第四阶段：展示卷轴
          const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
          this.collection[fortune.id] = true
          this.saveCollection()
          this.syncCollectionCount()

          this.setData({
            currentFortune: fortune,
            showScroll: true
          })

          // 卷轴展开动画
          setTimeout(() => {
            this.setData({ scrollUnfolding: true })
            wx.vibrateShort({ type: 'heavy' })
          }, 100)

          // 记录任务
          const now = Date.now()
          taskStore.upsertTask({
            taskId: `cyber_fortune_${now}`,
            toolType: 'cyber-fortune',
            sourceFileName: byShake ? '摇一摇抽签' : '点击抽签',
            resultFileName: fortune.title,
            status: 'SUCCESS',
            createdAt: now,
            updatedAt: now,
            message: `${fortune.title}：${fortune.text}`
          })
        }, 800)
      }, 800)
    }, 1200)
  },

  closeScroll() {
    this.setData({
      scrollUnfolding: false
    })
    
    setTimeout(() => {
      this.setData({
        showScroll: false,
        showStick: false,
        stickFloating: false,
        shakeTip: '再摇一次，重连命运'
      })
    }, 600)
  },

  onShareAppMessage() {
    const title = this.data.currentFortune.text
      ? `我抽到了${this.data.currentFortune.title}：${this.data.currentFortune.text}`
      : '来抽一支赛博签'
    return {
      title,
      path: '/pages-fun/cyber-fortune/index'
    }
  }
})
