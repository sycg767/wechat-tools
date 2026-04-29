const store = require('../../utils/king-score-store')

const RATING_MAX = 16
const SCORE_MAX = 100
const HERO_LIMIT = 6

const EMPTY_SUMMARY = {
  total: 0,
  avgRating: '0.0',
  mvpCount: 0,
  winRate: '0%'
}

const EMPTY_CHART_STATE = {
  hasHistory: false,
  trendInsight: ''
}

function toBoundedNumber(value, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < 0 || num > max) return null
  return num
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

function ratio(part, total) {
  if (!total) return 0
  return (part / total) * 100
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function standardDeviation(values) {
  if (values.length < 2) return 0
  const mean = average(values)
  const variance = average(values.map((item) => (item - mean) ** 2))
  return Math.sqrt(variance)
}

function parseKdaValue(kdaText) {
  const match = `${kdaText || ''}`.match(/(\d{1,2})\/(\d{1,2})\/(\d{1,2})/)
  if (!match) return null
  const kill = Number(match[1])
  const death = Number(match[2])
  const assist = Number(match[3])
  if (![kill, death, assist].every(Number.isFinite)) return null
  return Number((((kill + assist) / Math.max(1, death))).toFixed(2))
}

function buildLookupKey(item) {
  return [
    item.date || '',
    item.hero || '',
    item.kdaText || '',
    item.rating == null || item.rating === '' ? '' : `${item.rating}`
  ].join('|')
}

function buildHeroKdaKey(item) {
  return [
    item.date || '',
    item.hero || '',
    item.kdaText || ''
  ].join('|')
}

function buildKdaRatingKey(item) {
  return [
    item.date || '',
    item.kdaText || '',
    item.rating == null || item.rating === '' ? '' : `${item.rating}`
  ].join('|')
}

function sortRowsByDate(rows) {
  return rows.slice().sort((a, b) => {
    if (a.date !== b.date) return `${a.date || ''}`.localeCompare(`${b.date || ''}`)
    return `${a.sortKey || ''}`.localeCompare(`${b.sortKey || ''}`)
  })
}

function buildSessionRows(memberId) {
  const sessions = store.getSessions() || []
  const rows = []

  sessions.forEach((session, sessionIndex) => {
    ;(session.records || []).forEach((record, recordIndex) => {
      if (record.memberId !== memberId) return
      rows.push({
        date: session.date || '',
        sortKey: `${session.date || ''}-${String(sessionIndex).padStart(3, '0')}-${String(recordIndex).padStart(3, '0')}`,
        score: Number(record.score != null ? record.score : record.todayScore || 0) || 0,
        rating: toBoundedNumber(record.rating, RATING_MAX),
        matchTime: record.matchTime || '',
        hero: record.hero || '',
        kdaText: record.kdaText || '',
        kdaValue: parseKdaValue(record.kdaText),
        isMvp: !!record.isMvp,
        sessionStatus: record.sessionStatus || session.sessionStatus || record.status || '',
        matchResult: record.matchResult || session.matchResult || '',
        totalDeducted: Number(record.totalDeducted || 0) || 0
      })
    })
  })

  return sortRowsByDate(rows)
}

function buildPlayerRecordMaps(records) {
  const exactMap = new Map()
  const heroKdaMap = new Map()
  const kdaRatingMap = new Map()

  ;(records || []).forEach((record) => {
    const normalized = {
      ...record,
      rating: toBoundedNumber(record.rating, RATING_MAX)
    }
    const exactKey = buildLookupKey(normalized)
    const heroKdaKey = buildHeroKdaKey(normalized)
    const kdaRatingKey = buildKdaRatingKey(normalized)

    if (exactKey && !exactMap.has(exactKey)) exactMap.set(exactKey, normalized)
    if (heroKdaKey && !heroKdaMap.has(heroKdaKey)) heroKdaMap.set(heroKdaKey, normalized)
    if (kdaRatingKey && !kdaRatingMap.has(kdaRatingKey)) kdaRatingMap.set(kdaRatingKey, normalized)
  })

  return { exactMap, heroKdaMap, kdaRatingMap }
}

function enrichRowsWithPlayerRecords(rows, playerRecords) {
  const maps = buildPlayerRecordMaps(playerRecords)

  return sortRowsByDate((rows || []).map((row) => {
    const matched = maps.exactMap.get(buildLookupKey(row))
      || maps.heroKdaMap.get(buildHeroKdaKey(row))
      || maps.kdaRatingMap.get(buildKdaRatingKey(row))
      || null

    const hero = row.hero || (matched ? matched.hero : '')
    const kdaText = row.kdaText || (matched ? matched.kdaText : '')
    const rating = row.rating != null ? row.rating : toBoundedNumber(matched && matched.rating, RATING_MAX)
    const matchTime = row.matchTime || (matched ? matched.matchTime : '')

    return {
      ...row,
      hero,
      kdaText,
      rating,
      matchTime,
      kdaValue: row.kdaValue != null ? row.kdaValue : parseKdaValue(kdaText),
      isMvp: row.isMvp || !!(matched && matched.isMvp),
      matchResult: row.matchResult || (matched ? matched.matchResult : '')
    }
  }))
}

function buildDateLabels(rows) {
  const dateCounter = {}
  return (rows || []).map((row) => {
    const shortDate = row.date ? row.date.slice(5) : '未知'
    dateCounter[shortDate] = (dateCounter[shortDate] || 0) + 1
    return dateCounter[shortDate] > 1 ? `${shortDate}#${dateCounter[shortDate]}` : shortDate
  })
}

function buildHeroStats(rows) {
  const heroMap = {}

  ;(rows || []).forEach((row) => {
    if (!row.hero) return
    if (!heroMap[row.hero]) {
      heroMap[row.hero] = {
        hero: row.hero,
        played: 0,
        win: 0,
        ratingSum: 0,
        ratingCount: 0
      }
    }
    const target = heroMap[row.hero]
    target.played += 1
    if (row.matchResult === '胜利') target.win += 1
    if (row.rating != null) {
      target.ratingSum += row.rating
      target.ratingCount += 1
    }
  })

  return Object.keys(heroMap)
    .map((hero) => {
      const item = heroMap[hero]
      return {
        hero,
        played: item.played,
        winRate: Number(ratio(item.win, item.played).toFixed(1)),
        avgRating: item.ratingCount ? Number((item.ratingSum / item.ratingCount).toFixed(1)) : null
      }
    })
    .sort((a, b) => b.played - a.played || b.winRate - a.winRate)
    .slice(0, HERO_LIMIT)
}

function buildRadarMetrics(rows) {
  if (!rows.length) return []

  const ratingValues = rows.filter((row) => row.rating != null).map((row) => row.rating)
  const scoreValues = rows.map((row) => Number(row.score || 0))
  const mvpCount = rows.filter((row) => row.isMvp).length
  const winCount = rows.filter((row) => row.matchResult === '胜利').length
  const gloryCount = rows.filter((row) => row.sessionStatus === '光荣下播').length
  const stability = ratingValues.length
    ? clamp(100 - (standardDeviation(ratingValues) / 4) * 100, 0, 100)
    : 0

  return [
    { label: '评分', value: Number((average(ratingValues) / RATING_MAX * 100).toFixed(1)) },
    { label: '总分', value: Number((average(scoreValues) / SCORE_MAX * 100).toFixed(1)) },
    { label: 'MVP', value: Number(ratio(mvpCount, rows.length).toFixed(1)) },
    { label: '胜率', value: Number(ratio(winCount, rows.length).toFixed(1)) },
    { label: '稳定', value: Number(stability.toFixed(1)) },
    { label: '光荣', value: Number(ratio(gloryCount, rows.length).toFixed(1)) }
  ]
}

function buildChartAnalytics(rows) {
  const historyRows = sortRowsByDate(rows)
  const labels = buildDateLabels(historyRows)
  const heroStats = buildHeroStats(historyRows)
  const radarMetrics = buildRadarMetrics(historyRows)
  const ratingValues = historyRows.filter((row) => row.rating != null).map((row) => row.rating)
  const avgRating = ratingValues.length ? average(ratingValues).toFixed(1) : '0.0'
  const winRate = `${Math.round(ratio(historyRows.filter((row) => row.matchResult === '胜利').length, historyRows.length))}%`
  const topHero = heroStats[0]
  const strongestMetric = radarMetrics.slice().sort((a, b) => b.value - a.value)[0]

  return {
    historyRows,
    labels,
    heroStats,
    radarMetrics,
    trend: {
      labels,
      ratings: historyRows.map((row) => row.rating),
      scores: historyRows.map((row) => Number(row.score || 0)),
      results: historyRows.map((row) => row.matchResult || ''),
      mvps: historyRows.map((row) => !!row.isMvp)
    },
    summaryWinRate: winRate,
    chartState: {
      hasHistory: historyRows.length > 0,
      trendInsight: historyRows.length
        ? `近${historyRows.length}场平均评分 ${avgRating}，胜率 ${winRate}`
        : ''
    }
  }
}

function buildSummary(memberId, winRateText) {
  const summary = store.getPlayerRecordSummary(memberId) || EMPTY_SUMMARY
  return {
    total: summary.total || 0,
    avgRating: summary.avgRating || '0.0',
    mvpCount: summary.mvpCount || 0,
    winRate: winRateText || '0%'
  }
}

function drawEmptyCanvas(ctx, width, height, text) {
  ctx.clearRect(0, 0, width, height)
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, width, height)
  ctx.setFillStyle('#bfbfbf')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText(text, width / 2, height / 2)
  ctx.draw()
}

function createContext(page, canvasId) {
  return wx.createCanvasContext(canvasId, page)
}

function drawTrendChart(page, width, height, trend) {
  const ctx = createContext(page, 'trendCanvas')
  if (!trend || !trend.labels.length) {
    drawEmptyCanvas(ctx, width, height, '暂无趋势数据')
    return
  }

  const left = 30
  const right = 10
  const top = 16
  const bottom = 26
  const plotWidth = Math.max(1, width - left - right)
  const plotHeight = Math.max(1, height - top - bottom)
  const count = trend.labels.length
  const stepX = count > 1 ? plotWidth / (count - 1) : 0

  ctx.clearRect(0, 0, width, height)
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, width, height)

  ;[0, 8, 16].forEach((tick) => {
    const y = top + plotHeight - plotHeight * (tick / RATING_MAX)
    ctx.beginPath()
    ctx.setStrokeStyle('#edf2f7')
    ctx.setLineWidth(1)
    ctx.moveTo(left, y)
    ctx.lineTo(width - right, y)
    ctx.stroke()
    ctx.setFillStyle('#9aa4b2')
    ctx.setFontSize(10)
    ctx.setTextAlign('right')
    ctx.fillText(`${tick}`, left - 6, y + 3)
  })

  trend.scores.forEach((score, index) => {
    const x = count > 1 ? left + stepX * index : left + plotWidth / 2
    const barWidth = Math.max(8, Math.min(16, plotWidth / Math.max(count * 2, 6)))
    const barHeight = plotHeight * clamp(score / SCORE_MAX, 0, 1)
    const y = top + plotHeight - barHeight
    const result = trend.results[index]
    
    // 绘制背景色块表示胜负
    const fill = result === '胜利' ? 'rgba(82, 196, 26, 0.1)' : result === '失败' ? 'rgba(255, 77, 79, 0.1)' : 'rgba(22, 119, 255, 0.05)'
    ctx.setFillStyle(fill)
    ctx.fillRect(x - stepX / 2, top, stepX, plotHeight)

    // 绘制总分柱状图
    ctx.setFillStyle(result === '胜利' ? '#52c41a' : result === '失败' ? '#ff4d4f' : '#1677ff')
    ctx.setGlobalAlpha(0.3)
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)
    ctx.setGlobalAlpha(1.0)
  })

  const points = trend.ratings.map((rating, index) => {
    if (rating == null) return null
    return {
      x: count > 1 ? left + stepX * index : left + plotWidth / 2,
      y: top + plotHeight - plotHeight * clamp(rating / RATING_MAX, 0, 1),
      rating,
      isMvp: !!trend.mvps[index],
      result: trend.results[index]
    }
  }).filter(Boolean)

  if (points.length) {
    ctx.beginPath()
    ctx.setStrokeStyle('#1677ff')
    ctx.setLineWidth(2)
    ctx.moveTo(points[0].x, points[0].y)
    if (points.length === 1) {
      ctx.lineTo(points[0].x, points[0].y)
    } else {
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) / 2
        const midY = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY)
      }
      ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].x, points[points.length - 1].y)
    }
    ctx.stroke()
  }

  points.forEach((point) => {
    ctx.beginPath()
    ctx.setFillStyle('#ffffff')
    ctx.setStrokeStyle(point.result === '胜利' ? '#0a8f4d' : point.result === '失败' ? '#b42318' : '#1677ff')
    ctx.setLineWidth(point.isMvp ? 3 : 2)
    ctx.arc(point.x, point.y, point.isMvp ? 4 : 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  const labelStep = Math.max(1, Math.ceil(count / 5))
  trend.labels.forEach((label, index) => {
    if (index % labelStep !== 0 && index !== count - 1) return
    const x = count > 1 ? left + stepX * index : left + plotWidth / 2
    ctx.setFillStyle('#9aa4b2')
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    ctx.fillText(label, x, height - 8)
  })

  ctx.draw()
}

Page({
  data: {
    memberId: '',
    memberName: '',
    records: [],
    summary: { ...EMPTY_SUMMARY },
    filterDate: '',
    chartState: { ...EMPTY_CHART_STATE },
    heroStats: [],
    trendCanvasWidth: 300,
    trendCanvasHeight: 180,
    radarCanvasWidth: 300,
    radarCanvasHeight: 220,
    heroCanvasWidth: 300,
    heroCanvasHeight: 220
  },

  onLoad(options) {
    const memberId = options.memberId || ''
    const filterDate = options.date || ''
    const members = store.getMembers()
    const member = members.find((item) => item.id === memberId) || null
    this.setData({
      memberId,
      filterDate,
      memberName: member ? member.realName : ''
    })
    this.refreshData(memberId)
  },

  onShow() {
    if (this.data.memberId) {
      this.refreshData(this.data.memberId)
    }
  },

  refreshData(memberId) {
    const allPlayerRecords = store.getPlayerRecords(memberId)
    let records = allPlayerRecords
    if (this.data.filterDate) {
      records = records.filter((item) => item.date === this.data.filterDate)
    }

    const sessionRows = buildSessionRows(memberId)
    const fallbackRows = allPlayerRecords.map((item, index) => ({
      date: item.date || '',
      sortKey: `${item.date || ''}-${String(index).padStart(3, '0')}`,
      score: Number(item.score || 0) || 0,
      rating: toBoundedNumber(item.rating, RATING_MAX),
      matchTime: item.matchTime || '',
      hero: item.hero || '',
      kdaText: item.kdaText || '',
      kdaValue: parseKdaValue(item.kdaText),
      isMvp: !!item.isMvp,
      sessionStatus: item.sessionStatus || '',
      matchResult: item.matchResult || '',
      totalDeducted: 0
    }))
    const baseRows = sessionRows.length ? sessionRows : fallbackRows
    const analytics = buildChartAnalytics(enrichRowsWithPlayerRecords(baseRows, allPlayerRecords))

    this.chartAnalytics = analytics

    this.setData({
      records,
      summary: buildSummary(memberId, analytics.summaryWinRate),
      chartState: analytics.chartState,
      heroStats: analytics.heroStats || []
    }, () => {
      if (analytics.chartState.hasHistory) {
        wx.nextTick(() => this.measureCanvasesAndDraw())
      }
    })
  },

  measureCanvasesAndDraw() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#trendCanvas').boundingClientRect()
    query.exec((result) => {
      const trendRect = result && result[0] ? result[0] : null

      this.setData({
        trendCanvasWidth: trendRect && trendRect.width ? Math.floor(trendRect.width) : this.data.trendCanvasWidth,
        trendCanvasHeight: trendRect && trendRect.height ? Math.floor(trendRect.height) : this.data.trendCanvasHeight
      }, () => {
        const analytics = this.chartAnalytics || { trend: { labels: [] } }
        drawTrendChart(this, this.data.trendCanvasWidth, this.data.trendCanvasHeight, analytics.trend)
      })
    })
  }
})
