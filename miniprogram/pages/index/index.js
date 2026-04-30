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
    order: 10,
    size: 'small',
    svgPath: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
  },
  {
    id: 'pdf-word',
    title: 'PDF 转 Word',
    desc: '上传 PDF 并生成 Word 文档',
    path: '/pages/pdf-word/index',
    iconClass: 'icon-pdf-word',
    tag: '推荐',
    category: '文档处理',
    order: 10,
    size: 'small',
    svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
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
    order: 30,
    size: 'small',
    svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8 M10 9H8'
  },
  {
    id: 'word-pdf',
    title: 'Word 转 PDF',
    desc: '上传 Word 并生成 PDF 文件',
    path: '/pages/word-pdf/index',
    iconClass: 'icon-word-pdf',
    tag: '新增',
    category: '文档处理',
    order: 20,
    svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
  },
  {
    id: 'csv-excel',
    title: 'CSV / Excel 互转',
    desc: 'CSV 与 Excel 格式互相转换',
    path: '/pages/csv-excel/index',
    iconClass: 'icon-csv-excel',
    tag: '新增',
    category: '文档处理',
    order: 40,
    svgPath: 'M8 3v18M16 3v18M3 8h18M3 16h18'
  },
  {
    id: 'pdf-merge',
    title: 'PDF 合并',
    desc: '将多个 PDF 文件合并为一个',
    path: '/pages/pdf-merge/index',
    iconClass: 'icon-pdf-merge',
    tag: '新增',
    category: '文档处理',
    order: 50,
    svgPath: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M14 2v4a1 1 0 0 0 1 1h4 M9 15h6 M12 12v6'
  },
  {
    id: 'pdf-split',
    title: 'PDF 拆分',
    desc: '提取 PDF 指定页面',
    path: '/pages/pdf-split/index',
    iconClass: 'icon-pdf-split',
    tag: '新增',
    category: '文档处理',
    order: 60,
    svgPath: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M14 2v4a1 1 0 0 0 1 1h4 M8 13h8'
  },
  {
    id: 'pdf-watermark',
    title: 'PDF 水印',
    desc: '为 PDF 添加或去除水印',
    path: '/pages/pdf-watermark/index',
    iconClass: 'icon-pdf-watermark',
    tag: '新增',
    category: '文档处理',
    order: 80,
    svgPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
  },
  {
    id: 'pdf-manage',
    title: 'PDF 页面管理',
    desc: '页面重排、旋转、删除',
    path: '/pages/pdf-manage/index',
    iconClass: 'icon-pdf-manage',
    tag: '实用',
    category: '文档处理',
    order: 70,
    svgPath: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'
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
    order: 10,
    svgPath: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21'
  },
  {
    id: 'id-photo-bg',
    title: '证件照换底色',
    desc: '上传人像照片并切换红蓝白背景',
    path: '/pages/id-photo-bg/index',
    iconClass: 'icon-id-photo',
    tag: '新增',
    category: '图片处理',
    order: 20,
    size: 'small'
  },
  {
    id: 'qr-tool',
    title: '二维码工具',
    desc: '生成二维码或识别二维码图片内容',
    path: '/pages/qr-tool/index',
    iconClass: 'icon-qr-code',
    tag: '新增',
    category: '效率工具',
    order: 20,
    svgPath: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3 M21 14h.01 M14 17h.01 M17 17h3 M14 21h3 M21 17v4'
  },
  {
    id: 'signature',
    title: '手写签名',
    desc: '手写签名并导出透明背景图片',
    path: '/pages/signature/index',
    iconClass: 'icon-signature',
    tag: '新增',
    category: '效率工具',
    order: 30,
    svgPath: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z M3 20h18'
  },
  {
    id: 'unit-convert',
    title: '单位转换',
    desc: '长度、重量、面积等常用单位互转',
    path: '/pages/unit-convert/index',
    iconClass: 'icon-unit',
    tag: '新增',
    category: '效率工具',
    order: 40,
    svgPath: 'M8 3v18M16 3v18M3 8h18M3 16h18'
  },
  {
    id: 'random-gen',
    title: '随机生成器',
    desc: '随机数去重、强密码与历史复用',
    path: '/pages/random-gen/index',
    iconClass: 'icon-random',
    tag: '新增',
    category: '效率工具',
    order: 50,
    svgPath: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5'
  },
  {
    id: 'eat-what',
    title: '今天吃什么',
    desc: '纠结没意义，交给运气吧',
    path: '/pages/eat-what/index',
    iconClass: 'icon-eat',
    tag: '好玩',
    category: '轻娱乐',
    order: 10,
    svgPath: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3M10 1v3M14 1v3'
  },
  {
    id: 'book-answer',
    title: '答案之书',
    desc: '人生翻翻看，给你一句方向',
    path: '/pages/book-answer/index',
    iconClass: 'icon-random',
    tag: '热门',
    category: '轻娱乐',
    order: 2,
    svgPath: 'M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4zm4 4h8M8 12h8M8 16h5'
  },
  {
    id: 'fish-wheel',
    title: '摸鱼转盘',
    desc: '打工人决策器，老板来了秒切',
    path: '/pages/fish-wheel/index',
    iconClass: 'icon-eat',
    tag: '新增',
    category: '轻娱乐',
    order: 3,
    svgPath: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 0v9m0 0 5 3M12 12 7 9'
  },
  {
    id: 'bubble-wrap',
    title: '气泡膜解压器',
    desc: '无限捏捏乐，彩蛋气泡等你戳',
    path: '/pages/bubble-wrap/index',
    iconClass: 'icon-image',
    tag: '解压',
    category: '轻娱乐',
    order: 4,
    svgPath: 'M6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4'
  },
  {
    id: 'wooden-fish',
    title: '电子木鱼',
    desc: '赛博功德，解压神器',
    path: '/pages/wooden-fish/index',
    iconClass: 'icon-wooden-fish',
    tag: '热门',
    category: '轻娱乐',
    order: 5,
    svgPath: 'M3 15c0-4.2 3.4-7.5 7.6-7.5h5.2c2.5 0 4.7 1.2 6.2 3.2-.8.5-1.4 1.4-1.4 2.3s.6 1.8 1.4 2.3c-1.5 2-3.7 3.2-6.2 3.2h-5.2C6.4 22.5 3 19.2 3 15zm6.4 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M21 12v6 M19.5 13.5h3'
  },
  {
    id: 'party-draw',
    title: '谁是大冤种',
    desc: '聚会多人抽签，2-8人同屏开抽',
    path: '/pages/party-draw/index',
    iconClass: 'icon-rename',
    tag: '聚会',
    category: '轻娱乐',
    order: 6,
    svgPath: 'M7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM4 18c1.3-2.7 3.5-4 6-4h4c2.5 0 4.7 1.3 6 4'
  },
  {
    id: 'cyber-fortune',
    title: '赛博求签',
    desc: '摇一摇今日签，宜摸鱼忌开会',
    path: '/pages/cyber-fortune/index',
    iconClass: 'icon-pdf-watermark',
    tag: '每日',
    category: '轻娱乐',
    order: 7,
    svgPath: 'M12 3 5 7v6c0 4.2 3 7.7 7 8 4-.3 7-3.8 7-8V7l-7-4zm0 5v6m-2-4h4'
  },
  {
    id: 'king-score',
    title: '王者计分',
    desc: '记录迟到、输赢与下播荣辱',
    path: '/pages/king-score/index',
    iconClass: 'icon-eat',
    tag: '核心',
    category: '游戏工具',
    order: 1,
    size: 'large',
    svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  }
]

const CATEGORY_ORDER = ['游戏工具', '文档处理', '图片处理', '效率工具', '轻娱乐']

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
    recents: [],
    viewMode: 'categories', // 'categories', 'sub', or 'search'
    currentCategory: null,
    searchQuery: '',
    searchResults: [],
    categoryDefs: [
      { id: '游戏工具', title: '游戏工具', desc: '王者计分与娱乐辅助', iconClass: 'icon-eat', size: 'wide', theme: 'theme-yellow', svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { id: '文档处理', title: '文档处理', desc: 'PDF、Word、Excel 转换', iconClass: 'icon-pdf-word', size: 'wide', theme: 'theme-rose', svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
      { id: '图片处理', title: '图片处理', desc: '压缩、证件照、背景切换', iconClass: 'icon-id-photo', size: 'small', theme: 'theme-blue', svgPath: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21' },
      { id: '效率工具', title: '效率工具', desc: '重命名、二维码、签名', iconClass: 'icon-rename', size: 'small', theme: 'theme-emerald', svgPath: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
      { id: '轻娱乐', title: '轻娱乐', desc: '吃什么', iconClass: 'icon-eat', size: 'small', theme: 'theme-purple', svgPath: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3M10 1v3M14 1v3' }
    ]
  },

  onLoad(options) {
    this.initToolSections()
    this.initCategories()
    
    // 处理跳转参数，如果是进入子分类页面
    if (options && options.viewMode === 'sub' && options.categoryId) {
      const prefs = this.sanitizePrefs(this.getToolPrefs())
      const sections = this.buildSections(this.data.tools, prefs.favorites, prefs.recents)
      const section = sections.find(s => s.key === `cat-${options.categoryId}`)
      
      if (section) {
        this.setData({
          viewMode: 'sub',
          currentCategory: section
        })
        wx.setNavigationBarTitle({ title: section.title })
      }
    }
  },

  onShow() {
    this.initToolSections()
  },

  initCategories() {
    const categorySections = this.data.categoryDefs.map(cat => {
      const svgPath = cat.svgPath || 'M12 2v20M2 12h20'
      const maskImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath}"></path></svg>')`
      return { ...cat, maskImage }
    })
    this.setData({ categorySections })
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
      const svgPath = tool.svgPath || 'M12 2v20M2 12h20'
      const maskImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath}"></path></svg>')`
      
      toolMap[tool.id] = {
        ...tool,
        isFavorite: favorites.includes(tool.id),
        maskImage
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

  handleCategoryTap(event) {
    const { categoryId } = event.currentTarget.dataset
    const section = this.data.toolSections.find(s => s.key === `cat-${categoryId}`)
    if (section) {
      // 方案：使用真正的页面跳转来解决左滑返回问题
      // 将分类 ID 作为参数传递给当前页面，利用微信原生页面栈
      wx.navigateTo({
        url: `/pages/index/index?categoryId=${categoryId}&viewMode=sub`
      })
    }
  },

  goBackToCategories() {
    this.setData({
      viewMode: 'categories',
      currentCategory: null,
      searchQuery: '',
      searchResults: []
    })
    wx.setNavigationBarTitle({ title: '工具箱' })
  },

  onSearchFocus() {
    if (this.data.viewMode !== 'search') {
      this.setData({
        viewMode: 'search',
        searchResults: []
      })
    }
  },

  onSearchInput(e) {
    const query = e.detail.value.trim().toLowerCase()
    this.setData({ searchQuery: query })

    if (!query) {
      this.setData({ searchResults: [] })
      return
    }

    const results = this.data.tools.filter(tool =>
      tool.title.toLowerCase().includes(query) ||
      tool.desc.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    ).map(tool => {
      const svgPath = tool.svgPath || 'M12 2v20M2 12h20'
      const maskImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath}"></path></svg>')`
      return { ...tool, maskImage }
    })

    this.setData({ searchResults: results })
  },

  onClearSearch() {
    this.setData({
      searchQuery: '',
      searchResults: []
    })
  },

  onCancelSearch() {
    this.goBackToCategories()
  },

  onUnload() {
    // 如果在子分类页面直接退出，确保下次进入状态正确
    this.goBackToCategories()
  },

  // 监听小程序原生返回事件
  onHide() {
    // 保持当前状态
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
