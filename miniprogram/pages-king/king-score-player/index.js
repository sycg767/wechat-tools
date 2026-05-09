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

function hasExactMatchFields(item) {
  return !!(item && item.date && item.hero && item.kdaText && item.rating != null)
}

function hasHeroKdaMatchFields(item) {
  return !!(item && item.date && item.hero && item.kdaText)
}

function hasKdaRatingMatchFields(item) {
  return !!(item && item.date && item.kdaText && item.rating != null)
}

function extractSortableTime(value) {
  const match = `${value || ''}`.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function compareOptionalValue(a, b) {
  if (!a || !b) return 0
  return `${a}`.localeCompare(`${b}`)
}

function buildPlayerRecordRow(record, index) {
  return {
    date: record.date || '',
    sortKey: `${record.date || ''}-${record.createdAt || ''}-${String(index).padStart(3, '0')}`,
    score: Number(record.score || 0) || 0,
    rating: toBoundedNumber(record.rating, RATING_MAX),
    matchTime: record.matchTime || '',
    hero: record.hero || '',
    kdaText: record.kdaText || '',
    kdaValue: parseKdaValue(record.kdaText),
    isMvp: !!record.isMvp,
    sessionStatus: record.sessionStatus || '',
    matchResult: record.matchResult || '',
    totalDeducted: 0,
    recordKey: record.recordKey || '',
    playerRecordId: record.id || '',
    createdAt: record.createdAt || '',
    sessionId: '',
    sessionCreatedAt: '',
    sessionOrder: Number.MAX_SAFE_INTEGER,
    recordOrder: index,
    sourceType: 'playerRecord'
  }
}

function sortRowsByDate(rows) {
  return (rows || []).slice().sort((a, b) => {
    const dateCompare = `${a.date || ''}`.localeCompare(`${b.date || ''}`)
    if (dateCompare !== 0) return dateCompare

    const timeCompare = compareOptionalValue(extractSortableTime(a.matchTime), extractSortableTime(b.matchTime))
    if (timeCompare !== 0) return timeCompare

    const createdCompare = compareOptionalValue(a.sessionCreatedAt || a.createdAt, b.sessionCreatedAt || b.createdAt)
    if (createdCompare !== 0) return createdCompare

    const sessionOrderCompare = Number(a.sessionOrder || 0) - Number(b.sessionOrder || 0)
    if (sessionOrderCompare !== 0) return sessionOrderCompare

    const recordOrderCompare = Number(a.recordOrder || 0) - Number(b.recordOrder || 0)
    if (recordOrderCompare !== 0) return recordOrderCompare

    return `${a.sortKey || ''}`.localeCompare(`${b.sortKey || ''}`)
  })
}

function buildSessionRows(memberId) {
  const sessions = store.getSessions() || []
  const rows = []
  const totalSessions = sessions.length

  sessions.forEach((session, sessionIndex) => {
    ;(session.records || []).forEach((record, recordIndex) => {
      if (record.memberId !== memberId) return
      const sessionOrder = totalSessions - sessionIndex
      rows.push({
        date: session.date || '',
        sortKey: `${session.date || ''}-${session.createdAt || ''}-${String(sessionOrder).padStart(3, '0')}-${String(recordIndex).padStart(3, '0')}`,
        score: Number(record.score != null ? record.score : record.todayScore || 0) || 0,
        rating: toBoundedNumber(record.rating, RATING_MAX),
        matchTime: record.matchTime || '',
        hero: record.hero || '',
        kdaText: record.kdaText || '',
        kdaValue: parseKdaValue(record.kdaText),
        isMvp: !!record.isMvp,
        sessionStatus: record.sessionStatus || session.sessionStatus || record.status || '',
        matchResult: record.matchResult || session.matchResult || '',
        totalDeducted: Number(record.totalDeducted || 0) || 0,
        recordKey: record.recordKey || '',
        createdAt: record.createdAt || '',
        sessionId: session.id || '',
        sessionCreatedAt: session.createdAt || '',
        sessionOrder,
        recordOrder: recordIndex,
        sourceType: 'session'
      })
    })
  })

  return sortRowsByDate(rows)
}

function buildPlayerRecordMaps(records) {
  const exactMap = new Map()
  const heroKdaMap = new Map()
  const kdaRatingMap = new Map()
  const orderedRecords = sortRowsByDate((records || []).map((record, index) => ({
    ...buildPlayerRecordRow(record, index),
    __queueId: record.id || record.recordKey || `${record.date || ''}-${record.createdAt || ''}-${index}`
  })))

  orderedRecords.forEach((record) => {
    if (hasExactMatchFields(record)) {
      const exactKey = buildLookupKey(record)
      if (!exactMap.has(exactKey)) exactMap.set(exactKey, [])
      exactMap.get(exactKey).push(record)
    }
    if (hasHeroKdaMatchFields(record)) {
      const heroKdaKey = buildHeroKdaKey(record)
      if (!heroKdaMap.has(heroKdaKey)) heroKdaMap.set(heroKdaKey, [])
      heroKdaMap.get(heroKdaKey).push(record)
    }
    if (hasKdaRatingMatchFields(record)) {
      const kdaRatingKey = buildKdaRatingKey(record)
      if (!kdaRatingMap.has(kdaRatingKey)) kdaRatingMap.set(kdaRatingKey, [])
      kdaRatingMap.get(kdaRatingKey).push(record)
    }
  })

  return { exactMap, heroKdaMap, kdaRatingMap, orderedRecords }
}

function consumeQueueRecord(queue, consumedIds) {
  if (!queue || !queue.length) return null
  while (queue.length && consumedIds.has(queue[0].__queueId)) {
    queue.shift()
  }
  if (!queue.length) return null
  const matched = queue.shift()
  consumedIds.add(matched.__queueId)
  return matched
}

function consumeMatchedPlayerRecord(row, maps, consumedIds) {
  if (row.recordKey) {
    const direct = maps.orderedRecords.find((item) => item.recordKey === row.recordKey && !consumedIds.has(item.__queueId))
    if (direct) {
      consumedIds.add(direct.__queueId)
      return direct
    }
  }

  if (hasExactMatchFields(row)) {
    const matched = consumeQueueRecord(maps.exactMap.get(buildLookupKey(row)), consumedIds)
    if (matched) return matched
  }
  if (hasHeroKdaMatchFields(row)) {
    const matched = consumeQueueRecord(maps.heroKdaMap.get(buildHeroKdaKey(row)), consumedIds)
    if (matched) return matched
  }
  if (hasKdaRatingMatchFields(row)) {
    const matched = consumeQueueRecord(maps.kdaRatingMap.get(buildKdaRatingKey(row)), consumedIds)
    if (matched) return matched
  }

  return null
}

function enrichRowsWithPlayerRecords(rows, playerRecords) {
  const maps = buildPlayerRecordMaps(playerRecords)
  const consumedIds = new Set()

  const enrichedRows = sortRowsByDate((rows || []).map((row) => {
    const matched = consumeMatchedPlayerRecord(row, maps, consumedIds)
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
      createdAt: row.createdAt || (matched ? matched.createdAt : ''),
      recordKey: row.recordKey || (matched ? matched.recordKey : ''),
      playerRecordId: row.playerRecordId || (matched ? matched.playerRecordId : ''),
      kdaValue: row.kdaValue != null ? row.kdaValue : parseKdaValue(kdaText),
      isMvp: row.isMvp || !!(matched && matched.isMvp),
      matchResult: row.matchResult || (matched ? matched.matchResult : ''),
      sessionStatus: row.sessionStatus || (matched ? matched.sessionStatus : '')
    }
  }))

  const remainingRecords = maps.orderedRecords.filter((record) => !consumedIds.has(record.__queueId))
  return {
    rows: enrichedRows,
    remainingRows: remainingRecords
  }
}

function buildDateLabels(rows) {
  return (rows || []).map((row) => (row.date ? row.date.slice(5) : '未知'))
}

function buildDailyTrendRows(rows) {
  const groups = new Map()

  ;(rows || []).forEach((row) => {
    const date = row.date || '未知'
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date).push(row)
  })

  return Array.from(groups.entries()).map(([date, groupRows]) => {
    const ratingValues = groupRows.filter((row) => row.rating != null).map((row) => row.rating)
    const scoreValues = groupRows.map((row) => Number(row.score || 0))
    const hasShame = groupRows.some((row) => row.sessionStatus === '耻辱下播')
    const hasGlory = groupRows.some((row) => row.sessionStatus === '光荣下播')

    let sessionStatus = ''
    if (hasShame) {
      sessionStatus = '耻辱下播'
    } else if (hasGlory) {
      sessionStatus = '光荣下播'
    }

    return {
      date,
      rating: ratingValues.length ? Number(average(ratingValues).toFixed(1)) : null,
      score: scoreValues.length ? Number(average(scoreValues).toFixed(1)) : 0,
      sessionStatus,
      isMvp: groupRows.some((row) => !!row.isMvp),
      items: groupRows.map((row) => ({
        matchTime: row.matchTime || '',
        rating: row.rating,
        score: Number(row.score || 0),
        hero: row.hero || '',
        matchResult: row.matchResult || '',
        sessionStatus: row.sessionStatus || '',
        isMvp: !!row.isMvp
      }))
    }
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
  const dailyTrendRows = buildDailyTrendRows(historyRows)
  const labels = buildDateLabels(dailyTrendRows)
  const heroStats = buildHeroStats(historyRows)
  const radarMetrics = buildRadarMetrics(historyRows)
  const ratingValues = historyRows.filter((row) => row.rating != null).map((row) => row.rating)
  const avgRating = ratingValues.length ? average(ratingValues).toFixed(1) : '0.0'
  const winRate = `${Math.round(ratio(historyRows.filter((row) => row.matchResult === '胜利').length, historyRows.length))}%`
  const topHero = heroStats[0]
  const strongestMetric = radarMetrics.slice().sort((a, b) => b.value - a.value)[0]

  return {
    historyRows,
    dailyTrendRows,
    labels,
    heroStats,
    radarMetrics,
    trend: {
      labels,
      ratings: dailyTrendRows.map((row) => row.rating),
      scores: dailyTrendRows.map((row) => Number(row.score || 0)),
      results: dailyTrendRows.map((row) => row.sessionStatus || ''),
      mvps: dailyTrendRows.map((row) => !!row.isMvp),
      details: dailyTrendRows
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

function buildSummary(rows) {
  const historyRows = rows || []
  const ratingValues = historyRows.filter((row) => row.rating != null).map((row) => row.rating)
  const winCount = historyRows.filter((row) => row.matchResult === '胜利').length

  return {
    total: historyRows.length,
    avgRating: ratingValues.length ? average(ratingValues).toFixed(1) : '0.0',
    mvpCount: historyRows.filter((row) => row.isMvp).length,
    winRate: historyRows.length ? `${Math.round(ratio(winCount, historyRows.length))}%` : '0%'
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
  page.trendHitAreas = []
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

    // 绘制背景色块表示光荣/耻辱下播
    const fill = result === '光荣下播' ? 'rgba(82, 196, 26, 0.1)' : result === '耻辱下播' ? 'rgba(255, 77, 79, 0.1)' : 'rgba(22, 119, 255, 0.05)'
    ctx.setFillStyle(fill)
    ctx.fillRect(x - stepX / 2, top, stepX, plotHeight)

    // 绘制总分柱状图
    ctx.setFillStyle(result === '光荣下播' ? '#52c41a' : result === '耻辱下播' ? '#ff4d4f' : '#1677ff')
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
      result: trend.results[index],
      detail: trend.details && trend.details[index] ? trend.details[index] : null
    }
  }).filter(Boolean)

  page.trendHitAreas = points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: 18,
    detail: point.detail
  }))

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
    ctx.setStrokeStyle(point.result === '光荣下播' ? '#0a8f4d' : point.result === '耻辱下播' ? '#b42318' : '#1677ff')
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
    selectedTrendPoint: null,
    trendCanvasWidth: 300,
    trendCanvasHeight: 180,
    radarCanvasWidth: 300,
    radarCanvasHeight: 220,
    heroCanvasWidth: 300,
    heroCanvasHeight: 220
  },

  async onLoad(options) {
    const memberId = options.memberId || ''
    const filterDate = options.date || ''
    const members = await store.getMembers()
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
    const playerRecordRows = allPlayerRecords.map((item, index) => buildPlayerRecordRow(item, index))
    const enriched = enrichRowsWithPlayerRecords(sessionRows, allPlayerRecords)
    const mergedRows = sessionRows.length
      ? sortRowsByDate(enriched.rows.concat(enriched.remainingRows))
      : sortRowsByDate(playerRecordRows)
    const analytics = buildChartAnalytics(mergedRows)

    this.chartAnalytics = analytics

    this.setData({
      records,
      summary: buildSummary(analytics.historyRows),
      chartState: {
        ...analytics.chartState,
        trendInsight: analytics.chartState.trendInsight
      },
      heroStats: analytics.heroStats || [],
      selectedTrendPoint: null
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
  },

  onTrendCanvasTap(e) {
    const touch = e && e.detail ? e.detail : null
    if (!touch || typeof touch.x !== 'number' || typeof touch.y !== 'number') return
    const hitAreas = this.trendHitAreas || []
    if (!hitAreas.length) return

    let nearest = null
    let nearestDistance = Infinity
    hitAreas.forEach((area) => {
      const dx = touch.x - area.x
      const dy = touch.y - area.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= area.radius && distance < nearestDistance) {
        nearest = area.detail
        nearestDistance = distance
      }
    })

    if (!nearest) return

    this.setData({
      selectedTrendPoint: {
        date: nearest.date || '',
        avgRating: nearest.rating != null ? nearest.rating.toFixed(1) : '-',
        avgScore: Number(nearest.score || 0).toFixed(1),
        sessionStatus: nearest.sessionStatus || '状态待识别',
        items: (nearest.items || []).map((item) => ({
          matchTime: item.matchTime || '时间待识别',
          ratingText: item.rating != null ? item.rating.toFixed(1) : '-',
          scoreText: `${Number(item.score || 0)}`,
          hero: item.hero || '待识别',
          sessionStatus: item.sessionStatus || '状态待识别',
          matchResult: item.matchResult || '结果待识别',
          isMvp: !!item.isMvp
        }))
      }
    })
  }
})
