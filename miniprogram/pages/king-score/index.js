const store = require('../../utils/king-score-store')
const request = require('../../utils/request')
const upload = require('../../utils/upload')

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

function toNonNegativeInt(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.floor(num)
}

function normalizeText(text) {
  return (text || '')
    .replace(/[：]/g, ':')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[，]/g, ',')
    .replace(/[｜|]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
}

function normalizeMatchText(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
}

function clearOcrFields(record) {
  return {
    ...record,
    matchedByOcr: false,
    matchedName: '',
    matchedLine: '',
    matchedContext: '',
    matchScore: 0,
    hero: '',
    rating: '',
    kdaText: '',
    isMvp: false
  }
}

function buildRecords(members, settings, currentRecords = []) {
  const map = {}
  ;(currentRecords || []).forEach((item) => {
    map[item.memberId] = item
  })
  const dailyBaseScore = toNonNegativeInt(settings.dailyBaseScore) || 100
  return members.map((member) => {
    const old = map[member.id] || {}
    const todayDeducted = toNonNegativeInt(member.dailyDeducted)
    const gameNames = Array.isArray(member.gameNames) ? member.gameNames : []
    const displayGameNames = gameNames.filter((item) => item && item !== member.realName)
    return {
      memberId: member.id,
      name: member.realName,
      gameNames,
      gameNamesText: displayGameNames.join(' / '),
      todayDeducted,
      totalDeducted: toNonNegativeInt(member.totalDeducted),
      todayScore: Math.max(0, dailyBaseScore - todayDeducted),
      showBadge: !!old.showBadge,
      animating: !!old.animating,
      matchedByOcr: !!old.matchedByOcr,
      matchedName: old.matchedName || '',
      matchedLine: old.matchedLine || '',
      matchedContext: old.matchedContext || '',
      matchScore: Number(old.matchScore || 0),
      hero: old.hero || '',
      rating: old.rating || '',
      kdaText: old.kdaText || '',
      isMvp: !!old.isMvp
    }
  })
}

function parseMatchMeta(ocrText) {
  const text = normalizeText(ocrText)
  const resultMatch = text.match(/(胜利|失败)/)
  
  // 优先匹配完整的日期 YYYY/MM/DD，并尝试抓取其前后的时间点
  // 针对 18:222026/04/2723:20 这种情况，我们需要提取 2026/04/27 和 23:20
  const dateMatch = text.match(/(\d{4}\/\d{2}\/\d{2})/)
  let matchTime = ''
  
  if (dateMatch) {
    const dateStr = dateMatch[1]
    const dateIndex = text.indexOf(dateStr)
    // 在日期之后寻找时间 HH:mm
    const afterText = text.slice(dateIndex + dateStr.length)
    const timeAfter = afterText.match(/^\s*(\d{1,2}:\d{2})/)

    if (timeAfter) {
      matchTime = `${dateStr} ${timeAfter[1]}`
    } else {
      matchTime = dateStr
    }
  } else {
    // 退而求其次，匹配任意时间格式
    const fallbackMatch = text.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}|\d{4}\/\d{2}\/\d{2}|\d{1,2}:\d{2})/)
    matchTime = fallbackMatch ? fallbackMatch[1] : ''
  }

  return {
    matchResult: resultMatch ? resultMatch[1] : '',
    matchTime
  }
}

function levenshteinDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[a.length][b.length]
}

function bestSubstringSimilarity(alias, candidate) {
  if (!alias || !candidate) return 0
  if (candidate.includes(alias)) return 1

  const windows = []
  const minWindow = Math.max(1, alias.length - 1)
  const maxWindow = Math.min(candidate.length, alias.length + 2)

  for (let size = minWindow; size <= maxWindow; size += 1) {
    for (let start = 0; start <= candidate.length - size; start += 1) {
      windows.push(candidate.slice(start, start + size))
    }
  }

  if (!windows.length) {
    windows.push(candidate)
  }

  let best = 0
  windows.forEach((segment) => {
    const distance = levenshteinDistance(alias, segment)
    const similarity = 1 - distance / Math.max(alias.length, segment.length, 1)
    if (similarity > best) {
      best = similarity
    }
  })
  return best
}

function computeAliasScore(alias, candidateText) {
  const aliasKey = normalizeMatchText(alias)
  const candidateKey = normalizeMatchText(candidateText)
  if (!aliasKey || !candidateKey) return 0
  if (candidateKey.includes(aliasKey)) return 1
  if (aliasKey.length <= 2) return 0
  return bestSubstringSimilarity(aliasKey, candidateKey)
}

function getAliasThreshold(alias) {
  const len = normalizeMatchText(alias).length
  if (len <= 2) return 1
  if (len <= 4) return 0.75
  return 0.68
}

function cleanOcrArtifacts(text) {
  return `${text || ''}`
    .replace(/[«»<>]/g, ' ')
    .replace(/\b\d{3,4}\b/g, ' ')
    .replace(/\d{4}\/\d{2}\/\d{2}/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseOcrSegments(line) {
  const segments = []
  const regex = /«(\d+)»([^«]*)/g
  let match = regex.exec(line || '')
  while (match) {
    const text = (match[2] || '').trim()
    if (text) {
      segments.push({
        x: Number(match[1]),
        text
      })
    }
    match = regex.exec(line || '')
  }
  return segments
}

function buildParsedOcrLines(ocrText) {
  return normalizeText(ocrText)
    .split('\n')
    .map((rawLine) => {
      const text = rawLine.trim()
      return {
        rawLine,
        text,
        segments: parseOcrSegments(rawLine)
      }
    })
    .filter((item) => item.text)
}

function getOcrColumnSplit(parsedLines) {
  const candidateSplits = (parsedLines || [])
    .filter((line) => (line.segments || []).some((segment) => extractKdaCandidate(segment.text) || extractRatingCandidate(segment.text)))
    .map((line) => {
      const xs = (line.segments || [])
        .map((segment) => segment.x)
        .filter((x) => Number.isFinite(x) && x >= 800 && x <= 3200)
        .sort((a, b) => a - b)

      let bestGap = 0
      let bestSplit = null
      for (let i = 1; i < xs.length; i += 1) {
        const left = xs[i - 1]
        const right = xs[i]
        const gap = right - left
        if (left > 1800 || right < 1800 || gap < 280) continue
        if (gap > bestGap) {
          bestGap = gap
          bestSplit = (left + right) / 2
        }
      }
      return bestSplit
    })
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b)

  if (candidateSplits.length) {
    return candidateSplits[Math.floor(candidateSplits.length / 2)]
  }

  const xs = (parsedLines || [])
    .flatMap((line) => (line.segments || []).map((segment) => segment.x))
    .filter((x) => Number.isFinite(x) && x >= 1200 && x <= 2400)
    .sort((a, b) => a - b)

  if (xs.length < 2) return 1800

  let bestGap = 0
  let split = 1800
  for (let i = 1; i < xs.length; i += 1) {
    const gap = xs[i] - xs[i - 1]
    if (gap > bestGap) {
      bestGap = gap
      split = (xs[i] + xs[i - 1]) / 2
    }
  }

  return bestGap >= 120 ? split : 1800
}

function getSegmentSide(x, split) {
  return x >= split ? 'right' : 'left'
}

function getSideSegments(segments, side, split) {
  return (segments || []).filter((item) => getSegmentSide(item.x, split) === side)
}

function isHeroCandidateText(text) {
  const cleaned = cleanOcrArtifacts(text)
  // 王者荣耀英雄名字通常为2-4个汉字，极少数5个（如成吉思汗、娜可露露、不知火舞、橘右京、马可波罗、百里守约、百里玄策、干将莫邪、上官婉儿、公孙离、司马懿、诸葛亮、鲁班七号、达摩、墨子、韩信、赵云、典韦、曹操、吕布、关羽、张飞、刘备、孙尚香、大乔、小乔、周瑜、孙策、狂铁、米莱狄、弈星、裴擒虎、杨玉环、公孙离、明世隐、女娲、梦奇、苏烈、百里玄策、百里守约、铠、鬼谷子、干将莫邪、东皇太一、大乔、黄忠、诸葛亮、哪吒、太乙真人、蔡文姬、雅典娜、夏侯惇、虞姬、关羽、不知火舞、成吉思汗、橘右京、娜可露露、李元芳、钟馗、刘备、张飞、花木兰、吕布、周瑜、孙悟空、牛魔、亚瑟、露娜、韩信、狄仁杰、达摩、老夫子、程咬金、小乔、墨子、妲己、嬴政、孙尚香、鲁班七号、庄周、甄姬、扁鹊、孙膑、廉颇、高渐离、钟无艳、阿轲、白起、芈月、刘邦、姜子牙、项羽、安琪拉、赵云、武则天、韩信、宫本武藏、花木兰、兰陵王、娜可露露、不知火舞、橘右京、成吉思汗、雅典娜、杨戬、哪吒、诸葛亮、黄忠、大乔、东皇太一、干将莫邪、鬼谷子、铠、百里守约、百里玄策、苏烈、梦奇、女娲、明世隐、公孙离、杨玉环、裴擒虎、弈星、狂铁、米莱狄、元歌、孙策、司马懿、盾山、伽罗、沈梦溪、李信、上官婉儿、嫦娥、猪八戒、盘古、瑶、云中君、曜、西施、马超、鲁班大师、蒙犽、镜、蒙恬、阿古朵、夏洛特、澜、司空震、艾琳、云缨、戈娅、海月、赵怀真、莱西奥、姬小满、亚连、朵莉娅、海诺、大司命、元流之子）
  // 绝大多数英雄名字在2-4个字，极少数5个字。玩家名字通常较长。
  if (cleaned.length < 2 || cleaned.length > 5) return false
  if (!/^[\u4e00-\u9fa5]+$/.test(cleaned)) return false
  // 英雄名字段通常比较纯净，如果包含这些关键字且长度较短，则可能是误判
  const keywords = /(MVP|金牌|银牌|铜牌|顶级|失败|胜利|发育路|游走|对抗路|中路|打野|复盘|更多|查看回放|最佳搭档|数据)/i
  if (keywords.test(cleaned) && cleaned.length <= 4) return false
  return true
}

function extractHeroCandidate(parsedLines, lineIndex, side, split) {
  const offsets = [2, 1, 3, -1]
  for (const offset of offsets) {
    const line = parsedLines[lineIndex + offset]
    if (!line) continue
    const hit = getSideSegments(line.segments, side, split)
      .map((item) => cleanOcrArtifacts(item.text))
      .find((item) => isHeroCandidateText(item))
    if (hit) return hit
  }
  return ''
}

function extractMergedKdaTail(tail) {
  if (!tail) return ''

  const candidates = [1, 2]
    .map((kdaLen) => {
      const third = tail.slice(0, kdaLen)
      const money = tail.slice(kdaLen)
      return {
        third,
        money,
        thirdNum: Number(third),
        moneyNum: Number(money)
      }
    })
    .filter((item) => item.money.length >= 4 && item.money.length <= 5)
    .filter((item) => Number.isFinite(item.thirdNum) && item.thirdNum >= 0 && item.thirdNum <= 25)
    .filter((item) => Number.isFinite(item.moneyNum) && item.moneyNum >= 1000 && item.moneyNum <= 30000)
    .sort((a, b) => b.money.length - a.money.length || a.thirdNum - b.thirdNum)

  return candidates[0] ? candidates[0].third : ''
}

function extractKdaCandidate(text) {
  const compact = `${text || ''}`.replace(/\s+/g, '')
  const direct = compact.match(/(\d{1,2}\/\d{1,2}\/\d{1,2})(?!\d|\/)/)
  if (direct) return direct[1]

  const merged = compact.match(/(\d{1,2})\/(\d{1,2})\/(\d{5,7})/)
  if (!merged) return ''

  const third = extractMergedKdaTail(merged[3])
  return third ? `${merged[1]}/${merged[2]}/${third}` : ''
}

function extractRatingCandidate(text) {
  const cleaned = cleanOcrArtifacts(text)
  const matches = cleaned.match(/(?:1[0-6](?:\.\d)?|[0-9](?:\.\d)?)(?![\d/])/g) || []
  const value = matches.find((item) => item.includes('.')) || matches[0] || ''
  if (!value) return ''
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 16) return ''
  return value
}

function extractKdaByColumn(line, matchedSegment, side, split) {
  if (matchedSegment) {
    const own = extractKdaCandidate(matchedSegment.text)
    if (own) return own
  }

  const sideSegments = getSideSegments(line.segments, side, split)
  const ordered = sideSegments.slice().sort((a, b) => {
    if (!matchedSegment) return a.x - b.x
    const aRank = a.x >= matchedSegment.x ? 0 : 1
    const bRank = b.x >= matchedSegment.x ? 0 : 1
    if (aRank !== bRank) return aRank - bRank
    return Math.abs(a.x - matchedSegment.x) - Math.abs(b.x - matchedSegment.x)
  })

  for (const segment of ordered) {
    if (matchedSegment && segment.x === matchedSegment.x && segment.text === matchedSegment.text) continue
    const hit = extractKdaCandidate(segment.text)
    if (hit) return hit
  }
  return ''
}

function extractRatingByColumn(parsedLines, lineIndex, side, split) {
  const offsets = [1, 2, 0, -1, 3]
  for (const offset of offsets) {
    const line = parsedLines[lineIndex + offset]
    if (!line) continue
    const hit = getSideSegments(line.segments, side, split)
      .map((item) => extractRatingCandidate(item.text))
      .find(Boolean)
    if (hit) return hit
  }
  return ''
}

function buildPlayerSlots(parsedLines, split) {
  const slots = []

  parsedLines.forEach((line, index) => {
    ;['left', 'right'].forEach((side) => {
      const sideSegments = getSideSegments(line.segments, side, split)
      const nameSegment = sideSegments.find((segment) => {
        const cleaned = cleanOcrArtifacts(segment.text)
        if (!cleaned || cleaned.length < 2) return false

        // 如果包含 KDA，但同时也包含明显的昵称特征（如汉字、@、特殊符号），则仍视为可能的昵称段
        const hasKda = !!extractKdaCandidate(segment.text)
        const hasNameFeature = /[\u4e00-\u9fa5@_⑤①\u2460-\u2469\u2605\u2606\u00d7]/.test(cleaned)

        if (hasKda && !hasNameFeature) return false
        if (extractRatingCandidate(segment.text)) return false
        if (isHeroCandidateText(segment.text)) {
          // 利用 X 坐标进一步区分：英雄名字通常在每侧的最左边，玩家昵称靠右
          // 左侧英雄 X ~290, 玩家 X ~990; 右侧英雄 X ~2015, 玩家 X ~2630
          const isPlayerX = side === 'left' ? segment.x > 700 : segment.x > split + 400
          if (!isPlayerX) return false
        }

        // 移除常见的勋章和分路前缀后再判断
        const stripped = cleaned.replace(/^(MVP|金牌|银牌|铜牌|顶级|发育路|游走|对抗路|中路|打野|失败|胜利|更多|查看回放|最佳搭档|数据|[×☆\u2460-\u2469])+/i, '').trim()
        if (!stripped || stripped.length < 1) {
           // 如果剥离后啥也没了，且原词就是这些关键字，则排除
           if (/(MVP|金牌|银牌|铜牌|顶级|发育路|游走|对抗路|中路|打野|失败|胜利|更多|查看回放|最佳搭档|数据)/i.test(cleaned)) return false
        }

        return /[\u4e00-\u9fa5a-z0-9@_⑤①\u2460-\u2469\u2605\u2606\u00d7]/i.test(cleaned)
      })

      if (!nameSegment) return

      slots.push({
        side,
        lineIndex: index,
        nameSegment,
        line: line.text,
        mergedText: [parsedLines[index - 1]?.text, line.text, parsedLines[index + 1]?.text].filter(Boolean).join(' '),
        hero: extractHeroCandidate(parsedLines, index, side, split),
        kdaText: extractKdaByColumn(line, nameSegment, side, split),
        rating: extractRatingByColumn(parsedLines, index, side, split),
        isMvp: /MVP/i.test(line.text)
      })
    })
  })

  return slots
}

function isOcrMetaToken(token) {
  const cleaned = `${token || ''}`.replace(/\s+/g, '').trim()
  if (!cleaned) return false
  if (/^(MVP|失败|胜利|更多|查看回放|最佳搭档|数据|复盘)$/.test(cleaned)) return true
  return /^(金牌|银牌|铜牌|顶级)?(发育路|游走|对抗路|中路|打野)$/.test(cleaned)
}

function extractPlainTextPlayerSlot(line, lineIndex, slotIndex) {
  const sourceLine = (line || '').trim()
  const kdaText = extractKdaCandidate(sourceLine)
  if (!kdaText) return null

  const kdaIndex = sourceLine.indexOf(kdaText)
  const prefixText = kdaIndex >= 0 ? sourceLine.slice(0, kdaIndex).trim() : sourceLine
  const tokens = prefixText.split(/\s+/).map((item) => item.trim()).filter(Boolean)
  if (!tokens.length) return null

  const filteredTokens = tokens.filter((token) => !/^MVP$/i.test(token))
  const heroIndex = filteredTokens.findIndex((token) => isHeroCandidateText(token))
  if (heroIndex < 0) return null

  const hero = filteredTokens[heroIndex]
  const nameTokens = filteredTokens.slice(heroIndex + 1).filter((token) => !isOcrMetaToken(token))
  const matchedNameText = nameTokens.join(' ').trim()
  if (!matchedNameText) return null

  return {
    side: slotIndex < 5 ? 'left' : 'right',
    lineIndex,
    nameSegment: {
      x: slotIndex,
      text: matchedNameText
    },
    line: sourceLine,
    mergedText: sourceLine,
    hero,
    kdaText,
    rating: extractRatingCandidate(sourceLine),
    isMvp: /MVP/i.test(sourceLine)
  }
}

function buildPlainTextPlayerSlots(parsedLines) {
  const slots = []
  ;(parsedLines || []).forEach((line, index) => {
    const slot = extractPlainTextPlayerSlot(line.text, index, slots.length)
    if (slot) {
      slots.push(slot)
    }
  })
  return slots
}

function resolveRecordDate(matchTimeText) {
  const source = `${matchTimeText || ''}`
  // 匹配日期 YYYY/MM/DD
  const dateMatch = source.match(/(\d{4})\/(\d{2})\/(\d{2})/)
  if (dateMatch) {
    // OCR 识别的日期直接使用，不进行凌晨偏移
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  }
  // 如果没有 OCR 日期（手动点击保存），则使用带凌晨偏移的“逻辑今天”
  return todayText()
}

function buildPlayerRecordKey(item, meta) {
  return [
    item.memberId,
    resolveRecordDate(meta.matchTime),
    meta.matchTime || '',
    meta.matchResult || '',
    item.hero || '',
    item.kdaText || '',
    item.rating || ''
  ].join('|')
}

function persistMatchedPlayerRecords(records, meta) {
  ;(records || []).forEach((item) => {
    if (!item.matchedByOcr) return
    const matchTimeOnly = meta.matchTime && meta.matchTime.includes(' ') ? meta.matchTime.split(' ')[1] : ''
    store.appendPlayerRecord(item.memberId, {
      recordKey: buildPlayerRecordKey(item, meta),
      date: resolveRecordDate(meta.matchTime),
      matchTime: matchTimeOnly,
      hero: item.hero,
      kdaText: item.kdaText,
      rating: item.rating,
      score: item.score != null ? item.score : item.todayScore,
      matchResult: meta.matchResult || '',
      isMvp: item.isMvp
    })
  })
}

async function buildPatchedRecords(records, ocrText) {
  const parsedLines = buildParsedOcrLines(ocrText)
  const split = getOcrColumnSplit(parsedLines)
  const slots = buildPlayerSlots(parsedLines, split)
  const resolvedSlots = slots.length ? slots : buildPlainTextPlayerSlots(parsedLines)
  const members = (await store.getMembers()).filter((item) => item.active !== false)
  const memberMap = {}
  members.forEach((item) => {
    memberMap[item.id] = item
  })

  let matchedCount = 0
  const usedSlotKeys = new Set()

  const patched = (records || []).map((record) => {
    const member = memberMap[record.memberId] || {}
    const aliasList = [...new Set(((member.gameNames || [record.name]) || []).filter(Boolean))]
      .sort((a, b) => normalizeMatchText(b).length - normalizeMatchText(a).length)

    let best = null

    aliasList.forEach((alias) => {
      const threshold = getAliasThreshold(alias)
      resolvedSlots.forEach((slot) => {
        const slotKey = `${slot.lineIndex}:${slot.side}:${slot.nameSegment.x}:${slot.nameSegment.text}`
        if (usedSlotKeys.has(slotKey)) return

        const segmentScore = computeAliasScore(alias, slot.nameSegment.text)
        if (segmentScore < threshold) return

        const lineScore = Math.max(0, computeAliasScore(alias, slot.line) - 0.02)
        const mergedScore = Math.max(0, computeAliasScore(alias, slot.mergedText) - 0.04)
        const score = Math.max(segmentScore, lineScore, mergedScore)

        if (
          !best ||
          segmentScore > best.segmentScore ||
          (segmentScore === best.segmentScore && score > best.score)
        ) {
          best = {
            score,
            segmentScore,
            alias,
            slot,
            slotKey,
            threshold
          }
        }
      })
    })

    if (!best) {
      return clearOcrFields(record)
    }

    usedSlotKeys.add(best.slotKey)
    matchedCount += 1

    return {
      ...record,
      matchedByOcr: true,
      matchedName: best.alias,
      matchedLine: best.slot.line,
      matchedContext: best.slot.mergedText,
      matchScore: Number(best.score.toFixed(2)),
      hero: best.slot.hero,
      rating: best.slot.rating,
      kdaText: best.slot.kdaText,
      isMvp: best.slot.isMvp
    }
  })

  return { patched, matchedCount, meta: parseMatchMeta(ocrText) }
}

Page({
  data: {
    displayDate: todayText(),
    memberInput: '',
    aliasInput: '',
    members: [],
    records: [],
    settings: store.getSettings(),
    showAddModal: false,
    showSettingsModal: false,
    settingsForm: {
      ocrMode: 'ai',
      aiBaseUrl: '',
      aiModel: '',
      aiApiKey: ''
    },
    editingMemberId: '',
    resultRows: [],
    summaryText: '',
    historySessions: [],
    selectedSessionId: '',
    selectedSession: null,
    calendarDays: [],
    calendarMonthText: '',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    ocrProcessing: false,
    ocrStage: '',
    ocrProgress: 0,
    ocrStatusText: '',
    ocrRawText: '',
    ocrMatchedCount: 0,
    matchResult: '',
    matchTime: '',
    sessionStatus: ''
  },

  onLoad() {
    this.refreshAll()
  },

  async refreshAll(callback) {
    const settings = store.getSettings()
    const members = (await store.getMembers()).filter((item) => item.active !== false)
    const records = buildRecords(members, settings, this.data.records)
    const historySessions = store.getSessions()
    this.setData({
      displayDate: todayText(),
      members,
      records,
      settings,
      settingsForm: {
        ocrMode: settings.ocrMode || 'default',
        aiBaseUrl: settings.aiBaseUrl || '',
        aiModel: settings.aiModel || '',
        aiApiKey: settings.aiApiKey || ''
      },
      historySessions,
      selectedSession: historySessions.find((item) => item.id === this.data.selectedSessionId) || null
    }, () => {
      this.generateCalendar()
      if (callback) callback()
    })
  },

  generateCalendar() {
    const { currentYear, currentMonth, historySessions } = this.data
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    
    const daysInMonth = lastDay.getDate()
    const startWeekDay = firstDay.getDay() // 0 is Sunday
    
    const days = []
    
    // Fill empty days before start of month
    for (let i = 0; i < startWeekDay; i++) {
      days.push({ day: '', fullDate: '', status: '' })
    }
    
    const sessionMap = {}
    historySessions.forEach(s => {
      sessionMap[s.date] = s
    })
    
    const today = todayText()
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const session = sessionMap[dateStr]
      days.push({
        day: i,
        fullDate: dateStr,
        isToday: dateStr === today,
        status: session ? (session.sessionStatus === '光荣下播' ? 'good' : 'bad') : '',
        sessionId: session ? session.id : ''
      })
    }
    
    this.setData({
      calendarDays: days,
      calendarMonthText: `${currentYear}年${currentMonth + 1}月`
    })
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 0) {
      currentYear--
      currentMonth = 11
    } else {
      currentMonth--
    }
    this.setData({ currentYear, currentMonth }, () => this.generateCalendar())
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 11) {
      currentYear++
      currentMonth = 0
    } else {
      currentMonth++
    }
    this.setData({ currentYear, currentMonth }, () => this.generateCalendar())
  },

  onDayTap(e) {
    const { fullDate, sessionId } = e.currentTarget.dataset
    if (!sessionId) {
      this.setData({ selectedSessionId: '', selectedSession: null })
      return
    }
    
    const selectedSession = JSON.parse(JSON.stringify(this.data.historySessions.find(s => s.id === sessionId)))
    if (selectedSession && selectedSession.records) {
      selectedSession.records = selectedSession.records.map(r => {
        const summary = store.getPlayerRecordSummary(r.memberId)
        return {
          ...r,
          avgRating: summary.avgRating
        }
      })
    }
    this.setData({
      selectedSessionId: sessionId,
      selectedSession
    })
  },

  showAddMember() {
    this.setData({ showAddModal: true })
  },

  hideAddMember() {
    this.setData({ showAddModal: false, memberInput: '', aliasInput: '', editingMemberId: '' })
  },

  onMemberInput(e) {
    this.setData({ memberInput: e.detail.value || '' })
  },

  onAliasInput(e) {
    this.setData({ aliasInput: e.detail.value || '' })
  },

  async addMember() {
    let result
    if (this.data.editingMemberId) {
      result = await store.updateMember(this.data.editingMemberId, this.data.memberInput, this.data.aliasInput)
    } else {
      result = await store.addMember(this.data.memberInput, this.data.aliasInput)
    }

    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    this.setData({ showAddModal: false, memberInput: '', aliasInput: '', editingMemberId: '' })
    this.refreshAll()
  },

  editMember(e) {
    const memberId = e.currentTarget.dataset.memberId
    const member = this.data.members.find((item) => item.id === memberId)
    if (!member) return

    const displayGameNames = (member.gameNames || []).filter((name) => name !== member.realName)

    this.setData({
      showAddModal: true,
      editingMemberId: memberId,
      memberInput: member.realName,
      aliasInput: displayGameNames.join(', ')
    })
  },

  openPlayerRecord(e) {
    const { memberId, date } = e.currentTarget.dataset
    if (!memberId) return
    let url = `/pages/king-score-player/index?memberId=${memberId}`
    if (date) {
      url += `&date=${date}`
    }
    wx.navigateTo({ url })
  },

  openOverviewPage() {
    wx.navigateTo({ url: '/pages/king-score-overview/index' })
  },

  showOcrSettings() {
    const settings = this.data.settings || store.getSettings()
    this.setData({
      showSettingsModal: true,
      settingsForm: {
        ocrMode: settings.ocrMode || 'default',
        aiBaseUrl: settings.aiBaseUrl || '',
        aiModel: settings.aiModel || '',
        aiApiKey: settings.aiApiKey || ''
      }
    })
  },

  hideOcrSettings() {
    this.setData({ showSettingsModal: false })
  },

  switchOcrMode(e) {
    const mode = e.currentTarget.dataset.mode || 'default'
    this.setData({
      'settingsForm.ocrMode': mode === 'ai' ? 'ai' : 'default'
    })
  },

  onAiBaseUrlInput(e) {
    this.setData({ 'settingsForm.aiBaseUrl': e.detail.value || '' })
  },

  onAiModelInput(e) {
    this.setData({ 'settingsForm.aiModel': e.detail.value || '' })
  },

  onAiApiKeyInput(e) {
    this.setData({ 'settingsForm.aiApiKey': e.detail.value || '' })
  },

  saveOcrSettings() {
    const form = this.data.settingsForm || {}
    const payload = {
      ocrMode: form.ocrMode === 'ai' ? 'ai' : 'default',
      aiBaseUrl: (form.aiBaseUrl || '').trim(),
      aiModel: (form.aiModel || '').trim(),
      aiApiKey: (form.aiApiKey || '').trim()
    }

    if (payload.ocrMode === 'ai') {
      if (!payload.aiBaseUrl) {
        wx.showToast({ title: '请先填写 AI 请求地址', icon: 'none' })
        return
      }
      if (!payload.aiModel) {
        wx.showToast({ title: '请先填写 AI 模型', icon: 'none' })
        return
      }
      if (!payload.aiApiKey) {
        wx.showToast({ title: '请先填写 AI 密钥', icon: 'none' })
        return
      }
    }

    const settings = store.saveSettings(payload)
    this.setData({
      settings,
      settingsForm: {
        ocrMode: settings.ocrMode || 'default',
        aiBaseUrl: settings.aiBaseUrl || '',
        aiModel: settings.aiModel || '',
        aiApiKey: settings.aiApiKey || ''
      },
      showSettingsModal: false
    })
    wx.showToast({ title: '设置已保存', icon: 'success' })
  },

  chooseOcrImage() {
    if (!this.data.members.length) {
      wx.showToast({ title: '请先添加成员', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = (res.tempFiles || [])[0]
        if (!file || !file.tempFilePath) return
        this.uploadOcrImage(file.tempFilePath)
      }
    })
  },

  async uploadOcrImage(filePath) {
    const settings = this.data.settings || store.getSettings()
    const ocrMode = settings.ocrMode === 'ai' ? 'ai' : 'default'
    const aiBaseUrl = (settings.aiBaseUrl || '').trim()
    const aiModel = (settings.aiModel || '').trim()
    const aiApiKey = (settings.aiApiKey || '').trim()

    if (ocrMode === 'ai') {
      if (!aiBaseUrl) {
        wx.showToast({ title: '请先填写 AI 请求地址', icon: 'none' })
        return
      }
      if (!aiModel) {
        wx.showToast({ title: '请先填写 AI 模型', icon: 'none' })
        return
      }
      if (!aiApiKey) {
        wx.showToast({ title: '请先填写 AI 密钥', icon: 'none' })
        return
      }
    }

    const modeText = ocrMode === 'ai' ? 'AI 识别' : '百度 OCR';
    this.setData({
      ocrProcessing: true,
      ocrStage: 'uploading',
      ocrProgress: 0,
      ocrStatusText: `正在上传截图 (${modeText}) 0%`,
      ocrRawText: '',
      ocrMatchedCount: 0,
      records: (this.data.records || []).map(clearOcrFields),
      resultRows: [],
      summaryText: '',
      matchResult: '',
      matchTime: ''
    })

    try {
      const res = await upload('/tool/king-score-ocr', filePath, {
        ocrMode,
        aiBaseUrl,
        aiModel,
        aiApiKey
      }, {
        onProgress: ({ progress }) => {
          this.setData({
            ocrStage: 'uploading',
            ocrProgress: progress,
            ocrStatusText: `正在上传截图 (${modeText}) ${progress}%`
          })
        },
        onResponsePending: () => {
          this.setData({
            ocrStage: 'processing',
            ocrStatusText: `识别中 (${modeText})`
          })
        }
      })
      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '任务创建失败')
      }
      this.pollOcrTaskStatus(res.data)
    } catch (err) {
      this.setData({ ocrProcessing: false, ocrStage: 'done' })
      wx.showToast({ title: err.message || '识别失败', icon: 'none' })
    }
  },

  async pollOcrTaskStatus(taskId) {
    const settings = this.data.settings || store.getSettings()
    const modeText = settings.ocrMode === 'ai' ? 'AI 识别' : '百度 OCR'

    const poll = async () => {
      try {
        const res = await request.get(`/file/status/${taskId}`, null, { timeout: 20000 })
        if (res.code !== 200) {
          setTimeout(poll, 1500)
          return
        }
        const status = res.data || {}
        if (status.status === 'SUCCESS') {
          const ocrRawText = status.extraData || ''
          const built = await buildPatchedRecords(this.data.records, ocrRawText)
          persistMatchedPlayerRecords(built.patched, built.meta)
          this.setData({
            ocrProcessing: false,
            ocrStage: 'done',
            ocrProgress: 100,
            ocrStatusText: `${modeText}完成`,
            ocrRawText,
            ocrMatchedCount: built.matchedCount,
            records: built.patched,
            matchResult: built.meta.matchResult,
            matchTime: built.meta.matchTime
          })
          wx.showToast({ title: built.matchedCount ? `已提取${built.matchedCount}人并已写入战绩` : '识别完成，请手动核对原文', icon: 'success' })
          return
        }
        if (status.status === 'FAIL') {
          this.setData({ ocrProcessing: false, ocrStage: 'done' })
          wx.showModal({ title: '识别失败', content: status.message || '截图识别失败', showCancel: false })
          return
        }
        this.setData({
          ocrStage: 'processing',
          ocrProgress: status.progress || 50,
          ocrStatusText: status.status === 'PROCESSING' ? `识别中 (${modeText})` : '任务排队中...'
        })
        setTimeout(poll, 1500)
      } catch (err) {
        this.setData({ ocrProcessing: false, ocrStage: 'done' })
        wx.showToast({ title: err.message || '网络异常', icon: 'none' })
      }
    }

    poll()
  },

  copyOcrText() {
    if (!this.data.ocrRawText) return
    wx.setClipboardData({
      data: this.data.ocrRawText,
      success: () => {
        wx.showToast({ title: '已复制 OCR 内容', icon: 'success' })
      }
    })
  },

  clearOcr() {
    this.setData({
      ocrStage: '',
      ocrRawText: '',
      ocrMatchedCount: 0,
      matchResult: '',
      matchTime: '',
      records: (this.data.records || []).map(clearOcrFields),
      resultRows: [],
      summaryText: ''
    })
  },

  async onCardTap(e) {
    const memberId = e.currentTarget.dataset.memberId
    if (!memberId) return

    const result = await store.adjustMemberDeduction(memberId, this.data.settings.deductStep, this.data.settings.dailyBaseScore)
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }

    const records = this.data.records.map((item) => {
      if (item.memberId === memberId) {
        return {
          ...item,
          todayDeducted: result.member.dailyDeducted,
          totalDeducted: result.member.totalDeducted,
          todayScore: Math.max(0, this.data.settings.dailyBaseScore - result.member.dailyDeducted),
          showBadge: true,
          animating: true
        }
      }
      return item
    })

    this.setData({ records }, () => {
      if (this.data.resultRows.length) {
        this.calcResultRows()
      }
    })
    wx.vibrateShort({ type: 'light' })

    setTimeout(() => {
      const resetRecords = this.data.records.map((item) => {
        if (item.memberId === memberId) {
          return { ...item, showBadge: false, animating: false }
        }
        return item
      })
      this.setData({ records: resetRecords })
    }, 1000)
  },

  calcResultRows() {
    const settings = this.data.settings
    const dailyBaseScore = toNonNegativeInt(settings.dailyBaseScore) || 100
    const sourceRecords = this.data.ocrRawText
      ? (this.data.records || []).filter((item) => item.matchedByOcr)
      : (this.data.records || [])
    const rows = sourceRecords.map((item) => {
      const score = Math.max(0, dailyBaseScore - toNonNegativeInt(item.todayDeducted))
      return {
        ...item,
        score,
        status: score >= settings.gloryLine ? '光荣下播' : '耻辱下播'
      }
    }).sort((a, b) => b.score - a.score)

    const summaryText = `日期 ${this.data.matchTime || todayText()} · ${this.data.matchResult || '战绩待确认'} · 参赛${rows.length}人 · 今日满分${dailyBaseScore}`
    this.setData({ resultRows: rows, summaryText })
    return { rows, summaryText }
  },

  settleNow() {
    if (!this.data.members.length) {
      wx.showToast({ title: '请先添加成员', icon: 'none' })
      return
    }
    this.calcResultRows()
  },

  saveSessionWithStatus(e) {
    const status = e.currentTarget.dataset.status || ''
    this.saveSession(status)
  },

  saveSession(sessionStatus = '') {
    if (!this.data.members.length) {
      wx.showToast({ title: '请先添加成员', icon: 'none' })
      return
    }

    const built = this.data.resultRows.length
      ? { rows: this.data.resultRows, summaryText: this.data.summaryText }
      : this.calcResultRows()

    const summaryText = sessionStatus
      ? `${built.summaryText} · ${sessionStatus}`
      : built.summaryText

    const finalRows = built.rows.map((item) => ({
      ...item,
      sessionStatus: sessionStatus || item.status,
      matchResult: this.data.matchResult || ''
    }))

    const sessionDate = resolveRecordDate(this.data.matchTime)
    store.addSession({
      date: sessionDate,
      settings: { ...this.data.settings },
      records: finalRows,
      summaryText,
      sessionStatus,
      matchResult: this.data.matchResult || ''
    })

    persistMatchedPlayerRecords(finalRows, {
      matchTime: this.data.matchTime,
      matchResult: this.data.matchResult
    })

    this.setData({ sessionStatus })
    this.refreshAll()
    wx.showToast({ title: '今晚记录已保存', icon: 'success' })
  },

  selectHistory(e) {
    const sessionId = e.currentTarget.dataset.sessionId
    const current = this.data.selectedSessionId
    const selectedSessionId = current === sessionId ? '' : sessionId
    const selectedSession = (this.data.historySessions || []).find((item) => item.id === selectedSessionId) || null
    this.setData({ selectedSessionId, selectedSession })
  }
})
