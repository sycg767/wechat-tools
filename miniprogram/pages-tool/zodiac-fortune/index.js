const { addHistory, copyText, getHistory, getStore, setStore, todayKey } = require('../utils/tool-common')
const { get } = require('../../utils/request')

const KEY = 'zodiac_fortune'
const CACHE_KEY = `${KEY}_daily_cache_v3`
const isCurrentHistory = (item) => item && item.axis && item.shareText

const ZODIACS = [
  { name: '摩羯座', range: '12.22-1.19', element: '土象', mode: '基本宫', ruler: '土星', traits: ['目标', '责任', '结构'], opposite: '巨蟹座' },
  { name: '水瓶座', range: '1.20-2.18', element: '风象', mode: '固定宫', ruler: '天王星', traits: ['创新', '社群', '独立'], opposite: '狮子座' },
  { name: '双鱼座', range: '2.19-3.20', element: '水象', mode: '变动宫', ruler: '海王星', traits: ['感受', '想象', '共情'], opposite: '处女座' },
  { name: '白羊座', range: '3.21-4.19', element: '火象', mode: '基本宫', ruler: '火星', traits: ['主动', '开局', '直接'], opposite: '天秤座' },
  { name: '金牛座', range: '4.20-5.20', element: '土象', mode: '固定宫', ruler: '金星', traits: ['稳定', '积累', '感官'], opposite: '天蝎座' },
  { name: '双子座', range: '5.21-6.21', element: '风象', mode: '变动宫', ruler: '水星', traits: ['沟通', '信息', '灵活'], opposite: '射手座' },
  { name: '巨蟹座', range: '6.22-7.22', element: '水象', mode: '基本宫', ruler: '月亮', traits: ['照顾', '安全感', '情绪'], opposite: '摩羯座' },
  { name: '狮子座', range: '7.23-8.22', element: '火象', mode: '固定宫', ruler: '太阳', traits: ['表达', '自信', '创造'], opposite: '水瓶座' },
  { name: '处女座', range: '8.23-9.22', element: '土象', mode: '变动宫', ruler: '水星', traits: ['细节', '整理', '效率'], opposite: '双鱼座' },
  { name: '天秤座', range: '9.23-10.23', element: '风象', mode: '基本宫', ruler: '金星', traits: ['平衡', '协作', '审美'], opposite: '白羊座' },
  { name: '天蝎座', range: '10.24-11.22', element: '水象', mode: '固定宫', ruler: '冥王星', traits: ['洞察', '边界', '深度'], opposite: '金牛座' },
  { name: '射手座', range: '11.23-12.21', element: '火象', mode: '变动宫', ruler: '木星', traits: ['探索', '学习', '远方'], opposite: '双子座' }
]

const THEMES = [
  { id: 'communication', axis: '沟通与表达', elements: ['风象'], rulers: ['水星'], summary: ['今天的重点在信息流动与表达方式。{name}可以把想法说得更清楚，但也要给对方留下回应空间。', '适合处理沟通、确认、写作和学习类事项。{trait}会成为你的优势，但不要急着一次讲完全部。'], love: ['关系中适合把真实需求说清楚，少用试探，多用确认。', '单身者容易被谈吐和观点吸引；有伴者适合讨论计划而不是翻旧账。'], career: ['事业学业适合整理信息、同步进度、复盘资料，越清晰越省力。', '今天适合开会、写方案、做笔记，把零散信息变成可执行清单。'], wealth: ['财务上适合核对账单、比较方案，不急于下决定。', '涉及消费时先看细则，避免被临时信息带节奏。'], health: ['注意用眼、肩颈和睡眠节奏，信息摄入过多会带来疲惫。', '适合散步或短时拉伸，让大脑从高频沟通中降速。'], dos: ['主动确认', '整理信息', '写下重点'], donts: ['含糊表达', '临时改口', '过度解释'] },
  { id: 'stability', axis: '稳定推进', elements: ['土象'], rulers: ['土星'], summary: ['今天适合把事情落到具体步骤。{name}不需要追求速度，稳住节奏反而更容易完成关键进展。', '现实层面的安排会变得重要，{trait}能帮助你把想法变成看得见的成果。'], love: ['关系中适合用实际行动表达关心，比如按时回应、兑现承诺。', '不要用沉默代替沟通，稳定不是回避，而是让对方感到可靠。'], career: ['事业学业适合处理流程、资料、交付和长期任务，越细越稳。', '把复杂目标拆成两三步，先完成最确定的一步。'], wealth: ['适合做预算、盘点资源、控制非必要支出。', '财务判断偏保守更有利，先看长期成本。'], health: ['注意饮食规律和久坐疲劳，身体需要稳定节奏。', '适合早睡、热身、慢走或做一组基础拉伸。'], dos: ['按计划推进', '整理预算', '完成收尾'], donts: ['拖延确认', '过度保守', '临时加码'] },
  { id: 'relationship', axis: '关系协作', elements: ['水象', '风象'], rulers: ['金星', '月亮'], summary: ['今天的人际氛围比效率更重要。{name}适合观察对方真实需求，也要照顾自己的边界。', '合作、邀约、情绪互动会占据更多注意力，{trait}能帮助你找到更舒服的位置。'], love: ['爱情运势重在温和互动。表达好感可以直接一点，但不要把期待包装成压力。', '有伴者适合安排轻松对话，单身者可以从共同兴趣展开。'], career: ['事业学业中适合协商分工、寻求反馈、修正合作节奏。', '不要独自承担所有问题，把标准提前对齐会更顺。'], wealth: ['财务上容易受人情或氛围影响消费，适合先设预算。', '合作相关支出要提前说清分摊方式。'], health: ['情绪会影响体感，适合给自己留一点安静时间。', '减少比较，保持温和饮食和规律作息。'], dos: ['对齐标准', '温和表达', '倾听反馈'], donts: ['讨好过度', '情绪化消费', '替人承担'] },
  { id: 'action', axis: '行动突破', elements: ['火象'], rulers: ['火星', '太阳'], summary: ['今天适合开启行动。{name}会更容易感到推动力，但真正有效的是先做关键一步。', '能量感增强，{trait}可以带来突破，也要避免因为急切而忽略细节。'], love: ['感情中适合主动释放善意，但别把节奏推得太快。', '单身者可主动制造接触机会，有伴者适合一起完成一件小事。'], career: ['事业学业适合启动项目、处理卡住的任务、争取表达机会。', '先完成一个可见成果，再继续扩大战线。'], wealth: ['财务上容易冲动下单，适合设置冷静时间。', '可关注提升效率的投入，但不宜凭一时兴奋决定。'], health: ['适合运动，但要注意热身和安全。', '能量高时也要避免熬夜透支。'], dos: ['先做一步', '主动争取', '快速复盘'], donts: ['冲动承诺', '忽略细节', '硬撑体力'] },
  { id: 'review', axis: '整理复盘', elements: ['土象', '水象'], rulers: ['水星', '土星'], summary: ['今天适合回头检查。{name}可以通过整理、归档和复盘发现被忽略的线索。', '节奏不必太快，{trait}会帮助你把混乱重新放回结构里。'], love: ['关系中适合复盘最近的相处模式，少追究对错，多确认感受。', '把没有说出口的小问题温和说清，会比继续忍耐更好。'], career: ['事业学业适合查漏补缺、修正文档、复习旧知识。', '今天的价值在减少返工，而不是制造新任务。'], wealth: ['适合查看订阅、账单和长期支出，清理低价值消耗。', '旧账、报销、预算调整会比新投资更值得关注。'], health: ['身体需要恢复感，适合早睡、补水、减少刺激性饮食。', '把环境整理干净，也会帮助情绪稳定。'], dos: ['复盘整理', '清理旧账', '修正细节'], donts: ['重复内耗', '逃避收尾', '贪多求快'] },
  { id: 'inspiration', axis: '灵感变化', elements: ['风象', '火象'], rulers: ['天王星', '木星'], summary: ['今天容易出现新想法。{name}适合给灵感一点空间，但要用小实验验证可行性。', '变化会带来机会，{trait}能让你看到不同路径，不过仍需保留基本秩序。'], love: ['关系里适合尝试新鲜互动，别把所有安排都固定死。', '单身者容易被特别、有想法的人吸引。'], career: ['事业学业适合头脑风暴、寻找替代方案、学习新工具。', '灵感出现时先记录，再筛选可落地的一项。'], wealth: ['财务上适合了解新信息，但不宜盲目跟风。', '新工具、新服务可以看，但先试用再投入。'], health: ['注意神经兴奋和作息波动，晚上适合减少屏幕刺激。', '轻运动或户外活动能帮助释放多余能量。'], dos: ['记录灵感', '尝试新方法', '保留弹性'], donts: ['盲目跟风', '频繁变计划', '忽略睡眠'] }
]

const COLORS = ['米白色', '岩灰色', '墨绿色', '雾蓝色', '暖棕色', '珍珠灰', '松石色', '浅金色', '银白色', '焦糖色']
const NUMBERS = [1, 2, 3, 5, 6, 7, 8, 9, 11, 12]
const TIMES = ['08:00-10:00', '10:00-12:00', '13:00-15:00', '16:00-18:00', '19:00-21:00', '21:00-23:00']
const DIRECTIONS = ['正东', '正西', '正南', '正北', '东南', '西南', '东北', '西北']

const hashText = (text) => String(text).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
const pick = (list, seed, step) => list[Math.abs(seed * step + step * 17) % list.length]
const score = (seed, step) => 62 + Math.abs(seed * step + step * 23) % 37
const stars = (value) => {
  const count = Math.max(1, Math.min(5, Math.round(value / 20)))
  return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count)
}

const chooseTheme = (zodiac, seed) => {
  const weighted = []
  THEMES.forEach((theme) => {
    weighted.push(theme)
    if (theme.elements.includes(zodiac.element)) weighted.push(theme, theme)
    if (theme.rulers.includes(zodiac.ruler)) weighted.push(theme)
  })
  return pick(weighted, seed, 3)
}

const render = (template, zodiac) => template.replace('{name}', zodiac.name).replace('{trait}', zodiac.traits[0])

const buildFortune = (zodiac, date) => {
  const index = ZODIACS.findIndex((item) => item.name === zodiac.name)
  const seed = hashText(`${date}-${zodiac.name}`) + index * 37
  const theme = chooseTheme(zodiac, seed)
  const loveScore = score(seed, 5)
  const careerScore = score(seed, 7)
  const wealthScore = score(seed, 11)
  const healthScore = score(seed, 13)
  const overall = Math.round((loveScore + careerScore + wealthScore + healthScore) / 4)
  const sections = [
    { key: 'love', title: '爱情 / 人际', score: loveScore, stars: stars(loveScore), text: pick(theme.love, seed, 5) },
    { key: 'career', title: '事业 / 学业', score: careerScore, stars: stars(careerScore), text: pick(theme.career, seed, 7) },
    { key: 'wealth', title: '财富提醒', score: wealthScore, stars: stars(wealthScore), text: pick(theme.wealth, seed, 11) },
    { key: 'health', title: '健康节奏', score: healthScore, stars: stars(healthScore), text: pick(theme.health, seed, 13) }
  ]
  const supportSign = pick(ZODIACS.filter((item) => item.name !== zodiac.name), seed, 17).name
  const result = {
    id: `${date}_${zodiac.name}`,
    date,
    name: zodiac.name,
    range: zodiac.range,
    element: zodiac.element,
    mode: zodiac.mode,
    ruler: zodiac.ruler,
    traits: zodiac.traits.join(' · '),
    axis: theme.axis,
    summary: render(pick(theme.summary, seed, 19), zodiac),
    score: overall,
    stars: stars(overall),
    sections,
    luckyColor: pick(COLORS, seed, 23),
    luckyNumber: pick(NUMBERS, seed, 29),
    luckyTime: pick(TIMES, seed, 31),
    luckyDirection: pick(DIRECTIONS, seed, 37),
    supportSign,
    watchSign: zodiac.opposite,
    dos: pick(theme.dos, seed, 31),
    donts: pick(theme.donts, seed, 37),
    advice: `把“${theme.axis}”落实成一个 15 分钟内能完成的小动作，今天的状态会更容易打开。`,
    source: 'local',
    sourceLabel: '本地生成',
    fallbackReason: ''
  }
  result.shareText = `${result.date} ${result.name}今日主轴：${result.axis}。综合${result.score}分 ${result.stars}。${result.summary} 宜：${result.dos}；忌：${result.donts}。幸运色：${result.luckyColor}，幸运数字：${result.luckyNumber}。`
  return result
}

Page({
  data: {
    zodiacs: ZODIACS,
    selected: ZODIACS[0].name,
    result: null,
    history: [],
    loading: false,
    disclaimer: '本工具为轻娱乐与自我提醒用途，不代表科学预测，也不构成投资、医疗或重大决策建议。'
  },

  onLoad() {
    const history = getHistory(KEY).filter(isCurrentHistory)
    const date = todayKey()
    const cache = getStore(CACHE_KEY, {})
    const result = cache[`${date}_${this.data.selected}`] || null
    this.setData({ history, result })
  },

  onZodiacTap(event) {
    const selected = event.currentTarget.dataset.name
    const date = todayKey()
    const cache = getStore(CACHE_KEY, {})
    this.setData({ selected, result: cache[`${date}_${selected}`] || null })
  },

  async generateFortune() {
    if (this.data.loading) return
    const date = todayKey()
    const selected = this.data.selected
    const zodiac = ZODIACS.find((item) => item.name === selected) || ZODIACS[0]
    const cache = getStore(CACHE_KEY, {})
    const cacheId = `${date}_${selected}`
    if (cache[cacheId] && cache[cacheId].source !== 'local') {
      const history = addHistory(KEY, cache[cacheId], 10).filter(isCurrentHistory)
      this.setData({ result: cache[cacheId], history })
      return
    }

    this.setData({ loading: true })
    let result
    try {
      const response = await get('/tool/zodiac-fortune', { sign: selected, date })
      result = response.data
    } catch (error) {
      result = buildFortune(zodiac, date)
      result.fallbackReason = '真实天象暂不可用，已使用本地生成。'
      wx.showToast({ title: '已使用本地生成', icon: 'none' })
    }
    cache[cacheId] = result
    setStore(CACHE_KEY, cache)
    const history = addHistory(KEY, result, 10).filter(isCurrentHistory)
    this.setData({ result, history, loading: false })
  },

  copyResult() {
    if (!this.data.result) return
    copyText(this.data.result.shareText)
  },

  copyHistory(event) {
    const item = this.data.history[event.currentTarget.dataset.index]
    if (!item) return
    copyText(item.shareText)
  },

  onShareAppMessage() {
    const result = this.data.result
    return {
      title: result ? result.shareText : '星座运势查询：生成每日星座日运卡片',
      path: '/pages-tool/zodiac-fortune/index'
    }
  }
})
