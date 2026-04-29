const TOOL_PREFS_KEY = 'index_tool_prefs_v1'
const RECENT_MAX = 10

const TOOL_DEFS = [
  {
    id: 'rename',
    title: '文件重命名',
    desc: '上传文件并生成新的文件名',
    path: '/pages/rename/rename',
    iconClass: 'icon-rename',
    tag: '常用',
    category: '效率工具',
    order: 10
  },
  {
    id: 'pdf-word',
    title: 'PDF 转 Word',
    desc: '上传 PDF 并生成 Word 文档',
    path: '/pages/pdf-word/index',
    iconClass: 'icon-pdf-word',
    tag: '推荐',
    category: '文档处理',
    order: 10
  },
  {
    id: 'pdf-excel',
    title: 'PDF 转 Excel',
    desc: '页面骨架已完成，等待后端接口',
    path: '/pages/pdf-excel/index',
    iconClass: 'icon-pdf-excel',
    tag: '开发中',
    disabled: false,
    category: '文档处理',
    order: 20
  },
  {
    id: 'word-pdf',
    title: 'Word 转 PDF',
    desc: '上传 Word 并生成 PDF 文件',
    path: '/pages/word-pdf/index',
    iconClass: 'icon-word-pdf',
    tag: '新增',
    category: '文档处理',
    order: 30
  },
  {
    id: 'csv-excel',
    title: 'CSV / Excel 互转',
    desc: 'CSV 与 Excel 格式互相转换',
    path: '/pages/csv-excel/index',
    iconClass: 'icon-csv-excel',
    tag: '新增',
    category: '文档处理',
    order: 40
  },
  {
    id: 'pdf-merge',
    title: 'PDF 合并',
    desc: '将多个 PDF 文件合并为一个',
    path: '/pages/pdf-merge/index',
    iconClass: 'icon-pdf-merge',
    tag: '新增',
    category: '文档处理',
    order: 50
  },
  {
    id: 'pdf-split',
    title: 'PDF 拆分',
    desc: '提取 PDF 指定页面',
    path: '/pages/pdf-split/index',
    iconClass: 'icon-pdf-split',
    tag: '新增',
    category: '文档处理',
    order: 60
  },
  {
    id: 'pdf-watermark',
    title: 'PDF 水印',
    desc: '为 PDF 添加或去除水印',
    path: '/pages/pdf-watermark/index',
    iconClass: 'icon-pdf-watermark',
    tag: '新增',
    category: '文档处理',
    order: 70
  },
  {
    id: 'pdf-manage',
    title: 'PDF 页面管理',
    desc: '页面重排、旋转、删除',
    path: '/pages/pdf-manage/index',
    iconClass: 'icon-pdf-manage',
    tag: '实用',
    category: '文档处理',
    order: 80
  },
  {
    id: 'compress-image',
    title: '图片压缩',
    desc: '页面骨架已完成，等待后端接口',
    path: '/pages/compress-image/index',
    iconClass: 'icon-image',
    tag: '开发中',
    disabled: false,
    category: '图片处理',
    order: 10
  },
  {
    id: 'id-photo-bg',
    title: '证件照换底色',
    desc: '上传人像照片并切换红蓝白背景',
    path: '/pages/id-photo-bg/index',
    iconClass: 'icon-id-photo',
    tag: '新增',
    category: '图片处理',
    order: 20
  },
  {
    id: 'qr-tool',
    title: '二维码工具',
    desc: '生成二维码或识别二维码图片内容',
    path: '/pages/qr-tool/index',
    iconClass: 'icon-qr-code',
    tag: '新增',
    category: '效率工具',
    order: 20
  },
  {
    id: 'signature',
    title: '手写签名',
    desc: '手写签名并导出透明背景图片',
    path: '/pages/signature/index',
    iconClass: 'icon-signature',
    tag: '新增',
    category: '效率工具',
    order: 30
  },
  {
    id: 'unit-convert',
    title: '单位转换',
    desc: '长度、重量、面积等常用单位互转',
    path: '/pages/unit-convert/index',
    iconClass: 'icon-unit',
    tag: '新增',
    category: '效率工具',
    order: 40
  },
  {
    id: 'random-gen',
    title: '随机生成器',
    desc: '随机数去重、强密码与历史复用',
    path: '/pages/random-gen/index',
    iconClass: 'icon-random',
    tag: '新增',
    category: '效率工具',
    order: 50
  },
  {
    id: 'eat-what',
    title: '今天吃什么',
    desc: '纠结没意义，交给运气吧',
    path: '/pages/eat-what/index',
    iconClass: 'icon-eat',
    tag: '好玩',
    category: '轻娱乐',
    order: 10
  },
  {
    id: 'king-score',
    title: '王者记分',
    desc: '记录迟到、输赢与下播荣辱',
    path: '/pages/king-score/index',
    iconClass: 'icon-random',
    tag: '新',
    category: '效率工具',
    order: 60
  },
  {
    id: 'tasks',
    title: '任务历史',
    desc: '查看处理中与已完成的任务结果',
    path: '/pages/tasks/index',
    iconClass: 'icon-tasks',
    category: '效率工具',
    order: 90
  }
]

const CATEGORY_ORDER = ['文档处理', '图片处理', '效率工具', '轻娱乐']

function byOrderThenTitle(a, b) {
  const orderDiff = (a.order || 999) - (b.order || 999)
  if (orderDiff !== 0) return orderDiff
  return a.title.localeCompare(b.title, 'zh-Hans-CN')
}

Page({
  data: {
    tools: TOOL_DEFS,
    toolSections: [],
    favorites: [],
    recents: []
  },

  onLoad() {
    this.initToolSections()
  },

  onShow() {
    this.initToolSections()
  },

  getToolPrefs() {
    const stored = wx.getStorageSync(TOOL_PREFS_KEY) || {}
    return {
      favorites: Array.isArray(stored.favorites) ? stored.favorites : [],
      recents: Array.isArray(stored.recents) ? stored.recents : []
    }
  },

  saveToolPrefs(prefs) {
    wx.setStorageSync(TOOL_PREFS_KEY, {
      favorites: prefs.favorites,
      recents: prefs.recents
    })
  },

  sanitizePrefs(prefs) {
    const validIds = new Set((this.data.tools || []).map((item) => item.id))

    const dedupe = (list) => {
      const seen = new Set()
      return list.filter((id) => {
        if (!validIds.has(id)) return false
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    }

    return {
      favorites: dedupe(Array.isArray(prefs.favorites) ? prefs.favorites : []),
      recents: dedupe(Array.isArray(prefs.recents) ? prefs.recents : []).slice(0, RECENT_MAX)
    }
  },

  initToolSections() {
    const prefs = this.sanitizePrefs(this.getToolPrefs())
    const toolSections = this.buildSections(this.data.tools, prefs.favorites, prefs.recents)

    this.setData({
      favorites: prefs.favorites,
      recents: prefs.recents,
      toolSections
    })
  },

  buildSections(tools, favorites, recents) {
    const toolMap = {}
    tools.forEach((tool) => {
      toolMap[tool.id] = {
        ...tool,
        isFavorite: favorites.includes(tool.id)
      }
    })

    const sections = []

    if (recents.length) {
      const recentItems = recents
        .map((id) => toolMap[id])
        .filter(Boolean)
        .map((item) => ({ ...item, sectionType: 'recent' }))
      if (recentItems.length) {
        sections.push({
          key: 'recent',
          title: '最近使用',
          items: recentItems
        })
      }
    }

    CATEGORY_ORDER.forEach((category) => {
      const items = tools
        .filter((tool) => tool.category === category)
        .map((tool) => ({ ...toolMap[tool.id], sectionType: 'category' }))
        .sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
          return byOrderThenTitle(a, b)
        })

      if (items.length) {
        sections.push({
          key: `cat-${category}`,
          title: category,
          items
        })
      }
    })

    return sections
  },

  pushRecent(toolId) {
    const next = [toolId, ...(this.data.recents || []).filter((id) => id !== toolId)].slice(0, RECENT_MAX)
    const prefs = this.sanitizePrefs({
      favorites: this.data.favorites || [],
      recents: next
    })

    this.saveToolPrefs(prefs)
    this.setData({
      favorites: prefs.favorites,
      recents: prefs.recents,
      toolSections: this.buildSections(this.data.tools, prefs.favorites, prefs.recents)
    })
  },

  handleFavoriteTap(event) {
    const toolId = event.currentTarget.dataset.toolId
    if (!toolId) return

    const current = this.data.favorites || []
    const exists = current.includes(toolId)
    const favorites = exists ? current.filter((id) => id !== toolId) : [...current, toolId]

    const prefs = this.sanitizePrefs({
      favorites,
      recents: this.data.recents || []
    })

    this.saveToolPrefs(prefs)
    this.setData({
      favorites: prefs.favorites,
      recents: prefs.recents,
      toolSections: this.buildSections(this.data.tools, prefs.favorites, prefs.recents)
    })
  },

  handleToolTap(event) {
    const { path, disabled, toolId } = event.currentTarget.dataset
    if (disabled) {
      wx.showToast({ title: '该功能开发中', icon: 'none' })
      return
    }

    if (toolId) {
      this.pushRecent(toolId)
    }
    wx.navigateTo({ url: path })
  },

  goToTasks() {
    wx.navigateTo({ url: '/pages/tasks/index' })
  }
})
