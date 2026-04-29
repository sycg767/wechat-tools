const store = require('../../utils/king-score-store')

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

function sumValues(values) {
  return values.reduce((sum, item) => sum + item, 0)
}

function ratio(part, total) {
  if (!total) return 0
  return (part / total) * 100
}

function createContext(page, canvasId) {
  return wx.createCanvasContext(canvasId, page)
}

function toRating(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 16) return null
  return num
}

function toScore(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

function buildMemberStats() {
  const members = store.getMembers().filter((item) => item.active !== false)
  const sessions = store.getSessions() || []

  const statsMap = {}
  members.forEach((member) => {
    statsMap[member.id] = {
      memberId: member.id,
      name: member.realName,
      totalDeducted: Number(member.totalDeducted || 0) || 0,
      totalSessions: 0,
      sessionScoreValues: [],
      sessionRatingValues: [],
      winCount: 0,
      mvpCount: 0
    }
  })

  sessions.forEach((session) => {
    ;(session.records || []).forEach((record) => {
      const target = statsMap[record.memberId]
      if (!target) return
      target.totalSessions += 1

      const score = toScore(record.score != null ? record.score : record.todayScore)
      if (score != null) {
        target.sessionScoreValues.push(score)
      }

      const rating = toRating(record.rating)
      if (rating != null) {
        target.sessionRatingValues.push(rating)
      }

      const matchResult = record.matchResult || session.matchResult || ''
      if (matchResult === '胜利') target.winCount += 1
      if (record.isMvp) target.mvpCount += 1
    })
  })

  return Object.values(statsMap)
    .map((item) => {
      const playerRecords = store.getPlayerRecords(item.memberId) || []
      const playerScoreValues = playerRecords
        .map((record) => toScore(record.score))
        .filter((value) => value != null)
      const playerRatingValues = playerRecords
        .map((record) => toRating(record.rating))
        .filter((value) => value != null)
      const playerTotalSessions = playerRecords.length
      const totalSessions = Math.max(item.totalSessions, playerTotalSessions)
      const usePlayerRecordsForOutcome = playerTotalSessions >= item.totalSessions && playerTotalSessions > 0
      const scoreValues = item.sessionScoreValues.length ? item.sessionScoreValues : playerScoreValues
      const ratingValues = playerRatingValues.length >= item.sessionRatingValues.length
        ? playerRatingValues
        : item.sessionRatingValues
      const winCount = usePlayerRecordsForOutcome
        ? playerRecords.filter((record) => record.matchResult === '胜利').length
        : item.winCount
      const mvpCount = usePlayerRecordsForOutcome
        ? playerRecords.filter((record) => !!record.isMvp).length
        : item.mvpCount
      const avgScore = average(scoreValues)
      const avgRating = average(ratingValues)
      const winRate = ratio(winCount, totalSessions)
      const composite = avgRating * 3 + mvpCount * 2

      return {
        memberId: item.memberId,
        name: item.name,
        totalSessions,
        avgScore: Number(avgScore.toFixed(1)),
        avgRating: Number(avgRating.toFixed(1)),
        winRate: Number(winRate.toFixed(1)),
        mvpCount,
        totalDeducted: item.totalDeducted,
        composite: Number(composite.toFixed(1)),
        scoreSum: sumValues(scoreValues),
        scoreCount: scoreValues.length,
        ratingSum: sumValues(ratingValues),
        ratingCount: ratingValues.length
      }
    })
    .filter((item) => item.totalSessions > 0 || item.scoreCount > 0 || item.ratingCount > 0)
    .sort((a, b) => b.composite - a.composite || b.avgScore - a.avgScore)
}

function buildSummary(stats) {
  const ratingSum = stats.reduce((sum, item) => sum + item.ratingSum, 0)
  const ratingCount = stats.reduce((sum, item) => sum + item.ratingCount, 0)
  const activeMembers = store.getMembers().filter((item) => item.active !== false).length

  return {
    activeMembers,
    avgRating: ratingCount ? (ratingSum / ratingCount).toFixed(1) : '0.0',
    totalSessions: (store.getSessions() || []).length
  }
}

function getCanvasHeight(rowCount) {
  const count = Math.max(rowCount, 1)
  return Math.max(320, count * 56 + 20)
}

function drawRankingChart(page, width, height, stats) {
  const ctx = createContext(page, 'rankingCanvas')
  if (!stats.length) {
    ctx.clearRect(0, 0, width, height)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)
    ctx.setFillStyle('#bfbfbf')
    ctx.setFontSize(12)
    ctx.setTextAlign('center')
    ctx.fillText('暂无全员统计数据', width / 2, height / 2)
    ctx.draw()
    return
  }

  const topList = stats
  const left = 14
  const right = 12
  const top = 10
  const bottom = 10
  const rowHeight = Math.max(52, Math.floor((height - top - bottom) / topList.length))
  const barHeight = 12
  const scoreColWidth = 54
  const barLeft = left
  const barRight = width - right - scoreColWidth
  const barWidthMax = Math.max(40, barRight - barLeft)
  const maxValue = Math.max(...topList.map((item) => item.composite), 1)

  ctx.clearRect(0, 0, width, height)
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, width, height)

  topList.forEach((item, index) => {
    const baseY = top + rowHeight * index
    const nameY = baseY + 12
    const barY = baseY + 20
    const metaY = baseY + 42
    const filledBarWidth = barWidthMax * (item.composite / maxValue)
    const color = index === 0 ? '#faad14' : index === 1 ? '#1677ff' : index === 2 ? '#52c41a' : '#8c8c8c'

    ctx.setFillStyle('#262626')
    ctx.setFontSize(11)
    ctx.setTextAlign('left')
    ctx.fillText(`${index + 1}. ${item.name}`, left, nameY)

    ctx.setFillStyle('#f0f3f8')
    ctx.fillRect(barLeft, barY, barWidthMax, barHeight)
    ctx.setFillStyle(color)
    ctx.fillRect(barLeft, barY, filledBarWidth, barHeight)

    ctx.setFillStyle('#8c8c8c')
    ctx.setFontSize(9)
    ctx.setTextAlign('left')
    ctx.fillText(`均评 ${item.avgRating} · MVP ${item.mvpCount} · 场次 ${item.totalSessions}`, left, metaY)

    ctx.setFillStyle('#262626')
    ctx.setFontSize(10)
    ctx.setTextAlign('right')
    ctx.fillText(`${item.composite}`, width - right, nameY)
  })

  ctx.draw()
}

Page({
  data: {
    rankingCanvasWidth: 320,
    rankingCanvasHeight: 320,
    rankingCanvasStyleHeight: 320,
    summary: {
      activeMembers: 0,
      avgRating: '0.0',
      totalSessions: 0
    },
    rankingRows: []
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    const rankingRows = buildMemberStats()
    const rankingCanvasHeight = getCanvasHeight(rankingRows.length)
    this.rankingRows = rankingRows
    this.setData({
      rankingRows,
      rankingCanvasHeight,
      rankingCanvasStyleHeight: rankingCanvasHeight,
      summary: buildSummary(rankingRows)
    }, () => {
      if (rankingRows.length) {
        wx.nextTick(() => this.measureAndDraw())
      }
    })
  },

  measureAndDraw() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#rankingCanvas').boundingClientRect()
    query.exec((result) => {
      const rect = result && result[0] ? result[0] : null
      this.setData({
        rankingCanvasWidth: rect && rect.width ? Math.floor(rect.width) : this.data.rankingCanvasWidth,
        rankingCanvasHeight: getCanvasHeight((this.rankingRows || []).length),
        rankingCanvasStyleHeight: getCanvasHeight((this.rankingRows || []).length)
      }, () => {
        drawRankingChart(this, this.data.rankingCanvasWidth, this.data.rankingCanvasHeight, this.rankingRows || [])
      })
    })
  }
})
