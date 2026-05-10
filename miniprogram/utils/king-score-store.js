const request = require('./request')

const MEMBERS_KEY = 'king_score_members_v1'
const SESSIONS_KEY = 'king_score_sessions_v1'
const SETTINGS_KEY = 'king_score_settings_v1'
const PLAYER_RECORDS_KEY = 'king_score_player_records_v1'

const DEFAULT_SETTINGS = {
  dailyBaseScore: 100,
  deductStep: 10,
  gloryLine: 60,
  maxHistory: 30,
  ocrMode: 'ai'
}

function todayText() {
  const now = new Date()
  // 凌晨 0-4 点的对局逻辑上归属于前一天
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1)
  }
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toNonNegativeInt(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.floor(num)
}

function normalizeMember(item) {
  if (!item) return null
  const realName = (item.realName || item.name || '').trim()
  const aliases = Array.isArray(item.gameNames)
    ? item.gameNames.map((name) => `${name || ''}`.trim()).filter(Boolean)
    : []
  const gameNames = aliases.length ? aliases : (realName ? [realName] : [])
  if (!realName) return null
  return {
    id: item.id || makeId('m'),
    realName,
    gameNames,
    totalDeducted: toNonNegativeInt(item.totalDeducted),
    dailyDeducted: toNonNegativeInt(item.dailyDeducted),
    dailyScoreDate: item.dailyScoreDate || todayText(),
    active: item.active !== false,
    createdAt: item.createdAt || nowIso()
  }
}

function normalizeMemberForToday(item) {
  const member = normalizeMember(item)
  if (!member) return null
  const today = todayText()
  if (member.dailyScoreDate !== today) {
    return {
      ...member,
      dailyDeducted: 0,
      dailyScoreDate: today
    }
  }
  return member
}

async function getMembers() {
  try {
    const res = await request.get('/king-score/members')
    return (res.data || []).map(normalizeMemberForToday).filter(Boolean)
  } catch (e) {
    console.error('获取成员失败，降级使用本地缓存', e)
    const rawMembers = wx.getStorageSync(MEMBERS_KEY) || []
    return rawMembers.map(normalizeMemberForToday).filter(Boolean)
  }
}

function saveMembers(members) {
  wx.setStorageSync(MEMBERS_KEY, members.map(normalizeMember).filter(Boolean))
}

async function addMember(realName, gameNamesText = '') {
  const trimmed = (realName || '').trim()
  if (!trimmed) return { ok: false, message: '真实名称不能为空' }

  const aliasList = `${gameNamesText || ''}`
    .split(/[,，\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
  const gameNames = Array.from(new Set([trimmed, ...aliasList]))

  try {
    const res = await request.post('/king-score/members', {
      realName: trimmed,
      gameNames
    })
    const member = res.data
    // 同步更新本地缓存
    const members = wx.getStorageSync(MEMBERS_KEY) || []
    members.unshift(member)
    saveMembers(members)
    return { ok: true, member }
  } catch (e) {
    return { ok: false, message: e.message || '添加失败' }
  }
}

async function removeMember(memberId) {
  const members = (await getMembers()).filter((item) => item.id !== memberId)
  saveMembers(members)
  return members
}

async function updateMember(memberId, realName, gameNamesText = '') {
  const trimmed = (realName || '').trim()
  if (!trimmed) return { ok: false, message: '真实名称不能为空' }

  const aliasList = `${gameNamesText || ''}`
    .split(/[,，\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
  const gameNames = Array.from(new Set([trimmed, ...aliasList]))

  const members = await getMembers()
  const index = members.findIndex((item) => item.id === memberId)
  if (index < 0) return { ok: false, message: '成员不存在' }

  if (members.some((item, i) => i !== index && item.realName === trimmed)) {
    return { ok: false, message: '真实名称已存在' }
  }

  members[index] = {
    ...members[index],
    realName: trimmed,
    gameNames
  }
  saveMembers(members)
  return { ok: true, member: members[index] }
}

async function adjustMemberDeduction(memberId, scoreStep, dailyBaseScore) {
  const members = await getMembers()
  const index = members.findIndex((item) => item.id === memberId)
  if (index < 0) {
    return { ok: false, message: '成员不存在' }
  }

  const member = members[index]
  const maxScore = Math.max(0, toNonNegativeInt(dailyBaseScore) || DEFAULT_SETTINGS.dailyBaseScore)
  const step = Math.max(1, toNonNegativeInt(scoreStep) || DEFAULT_SETTINGS.deductStep)
  const remaining = Math.max(0, maxScore - member.dailyDeducted)
  if (!remaining) {
    return { ok: false, message: '今天已经扣满了' }
  }

  const actualDeducted = Math.min(step, remaining)
  const updated = {
    ...member,
    dailyDeducted: member.dailyDeducted + actualDeducted,
    totalDeducted: member.totalDeducted + actualDeducted,
    dailyScoreDate: todayText()
  }

  members[index] = updated
  saveMembers(members)
  return { ok: true, member: updated, actualDeducted }
}

function getSessions() {
  return wx.getStorageSync(SESSIONS_KEY) || []
}

function saveSessions(sessions) {
  const settings = getSettings()
  const maxHistory = Math.max(1, Number(settings.maxHistory) || 30)
  wx.setStorageSync(SESSIONS_KEY, sessions.slice(0, maxHistory))
}

function addSession(session) {
  const sessions = getSessions()
  const payload = {
    ...session,
    id: makeId('s'),
    createdAt: nowIso()
  }
  sessions.unshift(payload)
  saveSessions(sessions)
  return payload
}

function getSettings() {
  const stored = wx.getStorageSync(SETTINGS_KEY) || {}
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  }
}

function saveSettings(partial) {
  const merged = {
    ...getSettings(),
    ...partial
  }
  wx.setStorageSync(SETTINGS_KEY, merged)
  return merged
}

function getPlayerRecordsMap() {
  return wx.getStorageSync(PLAYER_RECORDS_KEY) || {}
}

function savePlayerRecordsMap(recordsMap) {
  wx.setStorageSync(PLAYER_RECORDS_KEY, recordsMap || {})
}

function appendPlayerRecord(memberId, record) {
  if (!memberId || !record) return null
  const recordsMap = getPlayerRecordsMap()
  const list = Array.isArray(recordsMap[memberId]) ? recordsMap[memberId] : []
  const payload = {
    id: makeId('pr'),
    createdAt: nowIso(),
    recordKey: record.recordKey || '',
    date: record.date || todayText(),
    matchTime: record.matchTime || '',
    hero: record.hero || '',
    kdaText: record.kdaText || '',
    rating: record.rating || '',
    score: toNonNegativeInt(record.score),
    matchResult: record.matchResult || '',
    isMvp: !!record.isMvp,
    sessionStatus: record.sessionStatus || ''
  }

  if (payload.recordKey) {
    const existingIndex = list.findIndex((item) => item.recordKey === payload.recordKey)
    if (existingIndex >= 0) {
      const existing = list[existingIndex]
      list[existingIndex] = {
        ...existing,
        ...payload,
        id: existing.id,
        createdAt: existing.createdAt
      }
      recordsMap[memberId] = list.slice(0, 100)
      savePlayerRecordsMap(recordsMap)
      return list[existingIndex]
    }
  }

  list.unshift(payload)
  recordsMap[memberId] = list.slice(0, 100)
  savePlayerRecordsMap(recordsMap)
  return payload
}

function getPlayerRecords(memberId) {
  const recordsMap = getPlayerRecordsMap()
  return Array.isArray(recordsMap[memberId]) ? recordsMap[memberId] : []
}

function getPlayerRecordSummary(memberId) {
  const records = getPlayerRecords(memberId)
  const total = records.length
  const ratingValues = records.map((item) => Number(item.rating)).filter((v) => Number.isFinite(v) && v >= 0)
  const avgRating = ratingValues.length
    ? (ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length).toFixed(1)
    : '0.0'
  const mvpCount = records.filter((item) => item.isMvp).length
  const winCount = records.filter((item) => item.matchResult === '胜利').length
  const winRate = total ? Math.round((winCount / total) * 100) : 0
  
  return {
    total,
    avgRating,
    mvpCount,
    winCount,
    winRate: `${winRate}%`
  }
}

async function archiveSession(sessionData) {
  const sessions = getSessions()
  const payload = {
    ...sessionData,
    id: makeId('s'),
    createdAt: nowIso()
  }
  sessions.unshift(payload)
  saveSessions(sessions)

  const members = await getMembers()
  const updatedMembers = members.map((m) => ({
    ...m,
    dailyDeducted: 0,
    dailyScoreDate: todayText()
  }))
  saveMembers(updatedMembers)

  return payload
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeMember,
  getMembers,
  addMember,
  updateMember,
  removeMember,
  adjustMemberDeduction,
  getSessions,
  addSession,
  archiveSession,
  getSettings,
  saveSettings,
  appendPlayerRecord,
  getPlayerRecords,
  getPlayerRecordSummary
}
