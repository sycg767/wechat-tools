const { addHistory, copyText, getHistory, todayKey } = require('../../utils/tool-common')
const { post } = require('../../utils/request')
const { getAiConfig } = require('../../utils/ai-config')

const KEY = 'bagua_fortune'

const TRIGRAMS = [
  { name: '乾', symbol: '☰', bits: [1, 1, 1], nature: '天', trait: '刚健', image: '主动、开阔、承担', role: '定方向' },
  { name: '兑', symbol: '☱', bits: [1, 1, 0], nature: '泽', trait: '悦纳', image: '沟通、反馈、喜悦', role: '通人情' },
  { name: '离', symbol: '☲', bits: [1, 0, 1], nature: '火', trait: '明辨', image: '看见、表达、依附', role: '明事实' },
  { name: '震', symbol: '☳', bits: [1, 0, 0], nature: '雷', trait: '启动', image: '行动、惊醒、变化', role: '开第一步' },
  { name: '巽', symbol: '☴', bits: [0, 1, 1], nature: '风', trait: '渗透', image: '进入、调整、长期影响', role: '渐进推进' },
  { name: '坎', symbol: '☵', bits: [0, 1, 0], nature: '水', trait: '险中求稳', image: '风险、流动、反复验证', role: '控风险' },
  { name: '艮', symbol: '☶', bits: [0, 0, 1], nature: '山', trait: '止定', image: '边界、暂停、沉淀', role: '守边界' },
  { name: '坤', symbol: '☷', bits: [0, 0, 0], nature: '地', trait: '承载', image: '配合、积累、稳定执行', role: '打基础' }
]

const HEXAGRAMS = [
  ['乾为天', '乾', '乾', '自强不息，适合主动承担与确立目标。', ['开创', '担当', '方向'], '把目标说清楚并快速推进第一步。', '避免刚强过度，忽略他人节奏。'],
  ['坤为地', '坤', '坤', '厚德载物，适合承接资源与稳步积累。', ['承载', '配合', '稳定'], '先把基础、流程和协作关系理顺。', '避免过度被动，长期等待别人安排。'],
  ['水雷屯', '坎', '震', '初生多阻，事情刚启动时需要耐心破局。', ['起步', '阻滞', '蓄力'], '先处理最明显的卡点，不急着扩大范围。', '避免一开始就追求完美和规模。'],
  ['山水蒙', '艮', '坎', '蒙昧待启，适合学习、求证和建立规则。', ['启蒙', '学习', '校准'], '把未知问题列出来，逐项请教或验证。', '避免凭模糊感觉做重大判断。'],
  ['水天需', '坎', '乾', '需待时机，已有方向但还需要等待条件成熟。', ['等待', '准备', '时机'], '完善资料和预案，等关键条件出现再行动。', '避免焦急催促导致节奏失衡。'],
  ['天水讼', '乾', '坎', '意见相争，重点在边界、证据和规则。', ['争议', '规则', '证据'], '用事实和书面确认减少误解。', '避免情绪化争输赢。'],
  ['地水师', '坤', '坎', '众人同行但有风险，需要组织与纪律。', ['组织', '纪律', '协同'], '明确分工、负责人和行动顺序。', '避免人多但目标不一致。'],
  ['水地比', '坎', '坤', '亲比相合，适合寻找支持与建立信任。', ['联合', '信任', '靠近'], '选择可靠的人对齐目标。', '避免为了合群放弃原则。'],
  ['风天小畜', '巽', '乾', '小有积蓄，适合微调和短期蓄势。', ['蓄势', '微调', '克制'], '先做轻量优化，等待更大窗口。', '避免小成果就过早冒进。'],
  ['天泽履', '乾', '兑', '履险知礼，行动要有分寸和边界。', ['礼节', '分寸', '谨慎'], '按规则推进，保持沟通礼貌。', '避免踩线或轻率承诺。'],
  ['地天泰', '坤', '乾', '上下通泰，适合推进合作和资源流动。', ['顺畅', '合作', '增长'], '趁沟通顺畅时落实关键事项。', '避免顺境中放松复盘。'],
  ['天地否', '乾', '坤', '上下不通，适合收缩、观察和修复沟通。', ['闭塞', '隔阂', '调整'], '先找出信息断点，再重建连接。', '避免硬推无人响应的方案。'],
  ['天火同人', '乾', '离', '同道同行，适合公开协作与建立共识。', ['共识', '公开', '伙伴'], '把目标公开讲清，吸引同频支持。', '避免只讲立场不听反馈。'],
  ['火天大有', '离', '乾', '资源丰盛，适合展示成果并承担更大责任。', ['丰收', '展示', '责任'], '把已有优势转化为可见成果。', '避免拥有资源却缺少节制。'],
  ['地山谦', '坤', '艮', '谦逊守位，越低调越能聚拢支持。', ['谦逊', '收敛', '修正'], '主动补短板，少争一时高下。', '避免表面谦虚、内里抗拒建议。'],
  ['雷地豫', '震', '坤', '顺势而动，适合预热、动员和提振士气。', ['准备', '动员', '乐观'], '让团队或自己先进入行动状态。', '避免只兴奋不落地。'],
  ['泽雷随', '兑', '震', '顺势跟随，适合根据反馈调整路线。', ['跟随', '反馈', '适应'], '观察形势变化，跟上有效节奏。', '避免盲从没有验证的人或事。'],
  ['山风蛊', '艮', '巽', '旧弊待治，适合清理积压和修复系统。', ['整治', '修复', '除旧'], '找到长期反复的问题并集中处理。', '避免只修表面不碰根因。'],
  ['地泽临', '坤', '兑', '接近与照看，适合主动靠近机会或对象。', ['靠近', '照看', '增长'], '把关心和支持表达出来。', '避免热情来得快去得也快。'],
  ['风地观', '巽', '坤', '观察全局，适合审视趋势与他人反应。', ['观察', '审视', '格局'], '先看全局，再决定切入点。', '避免只盯局部情绪。'],
  ['火雷噬嗑', '离', '震', '咬合破障，适合处理阻碍和明确规则。', ['决断', '规则', '破障'], '把问题摊开，按规则解决。', '避免拖延让小问题变硬结。'],
  ['山火贲', '艮', '离', '文饰有度，适合包装、表达和优化形象。', ['修饰', '表达', '形象'], '让成果更清楚、更好被理解。', '避免重形式轻实质。'],
  ['山地剥', '艮', '坤', '层层剥落，适合止损和保核心。', ['衰减', '止损', '保守'], '删减非必要消耗，守住底线。', '避免在下行时继续加码。'],
  ['地雷复', '坤', '震', '一阳来复，适合恢复节奏和重新开始。', ['回归', '恢复', '重启'], '从一个小习惯或小动作重启。', '避免刚恢复就过度用力。'],
  ['天雷无妄', '乾', '震', '不妄而动，适合真诚行动、顺理而为。', ['真实', '自然', '正当'], '按事实和本心行动，不做多余包装。', '避免侥幸和不切实际的幻想。'],
  ['山天大畜', '艮', '乾', '大有积蓄，适合沉淀能力和储备资源。', ['积累', '储备', '节制'], '把能力、资金或资料系统整理起来。', '避免有力无处用时急于突破。'],
  ['山雷颐', '艮', '震', '养正养身，适合关注输入、饮食和表达。', ['滋养', '输入', '口舌'], '选择高质量信息和稳定作息。', '避免乱吃乱说乱承诺。'],
  ['泽风大过', '兑', '巽', '压力过重，适合调整结构、卸掉负担。', ['过载', '承担', '调整'], '找出最重的压力点并重新分配。', '避免硬撑到结构失衡。'],
  ['坎为水', '坎', '坎', '重险相叠，适合谨慎、试探和保存退路。', ['风险', '反复', '谨慎'], '先做风险排查，再小步通过。', '避免孤注一掷。'],
  ['离为火', '离', '离', '光明相继，适合表达、看清和建立依附。', ['明辨', '表达', '连接'], '把事实照亮，让信息透明。', '避免情绪上头或过度依赖。'],
  ['泽山咸', '兑', '艮', '相感而应，适合关系互动和柔性沟通。', ['感应', '关系', '吸引'], '用真诚反馈建立连接。', '避免操控或试探。'],
  ['雷风恒', '震', '巽', '持久稳定，适合长期执行和固定节奏。', ['恒常', '坚持', '秩序'], '设定可持续的重复动作。', '避免三分钟热度。'],
  ['天山遁', '乾', '艮', '适时退避，适合抽身、避险和保存实力。', ['退避', '保全', '距离'], '把距离拉开，看清局势。', '避免为了面子硬扛。'],
  ['雷天大壮', '震', '乾', '势头强盛，适合推进但必须守正。', ['强势', '推进', '克制'], '把强动力用在正当目标上。', '避免凭气势压人。'],
  ['火地晋', '离', '坤', '光明上进，适合展示进度和争取认可。', ['晋升', '展示', '进展'], '把成果摆出来，争取合理机会。', '避免急于求名。'],
  ['地火明夷', '坤', '离', '光明受伤，适合低调守护和暂避锋芒。', ['隐藏', '受阻', '守光'], '保护核心想法，等待安全表达时机。', '避免在不利场合硬亮底牌。'],
  ['风火家人', '巽', '离', '内外有序，适合家庭、团队和内部规则。', ['秩序', '内部', '责任'], '先把内部职责和沟通方式理顺。', '避免把外部压力带入关系。'],
  ['火泽睽', '离', '兑', '意见相背，适合求同存异、小事可成。', ['分歧', '差异', '求同'], '先找共同点，不急着统一全部看法。', '避免把差异升级成对立。'],
  ['水山蹇', '坎', '艮', '前路艰难，适合求助、绕行和暂停评估。', ['困难', '求助', '绕行'], '承认阻力，寻找外部支持。', '避免独自硬闯。'],
  ['雷水解', '震', '坎', '困局松解，适合释放压力和解决遗留问题。', ['解开', '释放', '转机'], '抓住松动点，快速处理积压。', '避免问题刚缓和就松懈。'],
  ['山泽损', '艮', '兑', '有所减损，适合舍弃低价值消耗。', ['取舍', '减法', '节制'], '删掉一个拖累你的事项。', '避免只减别人不减自己。'],
  ['风雷益', '巽', '震', '增益互助，适合投入、学习和帮助他人。', ['增益', '互助', '成长'], '把资源投向能长期增值的地方。', '避免短期贪多。'],
  ['泽天夬', '兑', '乾', '果断决裂，适合清晰表态和处理顽固问题。', ['决断', '表态', '清除'], '把不能再拖的问题明确处理。', '避免决断变成冲动攻击。'],
  ['天风姤', '乾', '巽', '偶然相遇，适合辨别机会和边界。', ['相遇', '诱因', '边界'], '新机会先观察，再决定是否深入。', '避免被突发吸引带偏主线。'],
  ['泽地萃', '兑', '坤', '聚集成势，适合会议、整合和资源汇聚。', ['聚合', '资源', '共识'], '把分散的人和信息聚到同一桌。', '避免聚而不决。'],
  ['地风升', '坤', '巽', '循序上升，适合稳步成长和长期推进。', ['上升', '渐进', '积累'], '用小台阶推进大目标。', '避免急于跳级。'],
  ['泽水困', '兑', '坎', '受困待守，适合守信、节流和寻找出口。', ['困境', '守信', '节流'], '先稳住基本盘，再寻找突破口。', '避免抱怨消耗信用。'],
  ['水风井', '坎', '巽', '井养众人，适合维护基础系统和长期价值。', ['供养', '系统', '基础'], '修好能持续产出的底层机制。', '避免只换外表不修水源。'],
  ['泽火革', '兑', '离', '革故鼎新，适合明确改革和换旧规则。', ['变革', '更新', '决心'], '说明改变原因，再逐步替换旧做法。', '避免为变而变。'],
  ['火风鼎', '离', '巽', '鼎新承载，适合升级结构和稳定产出。', ['更新', '承载', '成器'], '把新方法放进稳定流程。', '避免只有创意没有容器。'],
  ['震为雷', '震', '震', '震动惊醒，适合启动但要稳住心神。', ['震动', '启动', '警醒'], '把惊扰转化为行动清单。', '避免被突发情绪带跑。'],
  ['艮为山', '艮', '艮', '止而后定，适合暂停、边界和复盘。', ['停止', '边界', '沉静'], '先停下不必要动作，看清界限。', '避免停滞变成逃避。'],
  ['风山渐', '巽', '艮', '渐进有序，适合按阶段成长。', ['渐进', '阶段', '礼序'], '给目标设置阶段验收。', '避免跳过基础步骤。'],
  ['雷泽归妹', '震', '兑', '关系失序，适合重新确认位置和承诺。', ['关系', '位置', '承诺'], '先确认彼此角色，再谈下一步。', '避免被短期热情带入长期承诺。'],
  ['雷火丰', '震', '离', '盛大丰盈，适合把握高光但也要防过盛。', ['丰盛', '高光', '忙碌'], '趁势完成重点展示。', '避免事情太多导致失焦。'],
  ['火山旅', '离', '艮', '旅途在外，适合灵活适应和轻装前行。', ['漂泊', '适应', '轻装'], '减少依赖，保留机动性。', '避免在临时状态里做永久决定。'],
  ['巽为风', '巽', '巽', '风行渐入，适合柔性影响和持续渗透。', ['进入', '柔和', '影响'], '用持续反馈推进改变。', '避免犹豫太久没有主见。'],
  ['兑为泽', '兑', '兑', '悦而相通，适合表达、谈判和互相成就。', ['喜悦', '沟通', '兑现'], '把话说得舒服，也要说得明确。', '避免只讨好不兑现。'],
  ['风水涣', '巽', '坎', '涣散待聚，适合化解隔阂和重新组织。', ['涣散', '疏通', '重聚'], '先疏通情绪和信息，再谈执行。', '避免人心散了还只抓流程。'],
  ['水泽节', '坎', '兑', '节制有度，适合设限、预算和规则。', ['节制', '边界', '规则'], '定一个清晰上限或截止点。', '避免过度节制变僵硬。'],
  ['风泽中孚', '巽', '兑', '诚信相感，适合建立信任和真诚沟通。', ['诚信', '信任', '内在'], '把真实想法温和说清。', '避免口头好听但行动落空。'],
  ['雷山小过', '震', '艮', '小事可过，大事宜谨慎。', ['小过', '谨慎', '细节'], '先处理小范围试错。', '避免小问题扩大化。'],
  ['水火既济', '坎', '离', '事已成形，适合收尾、复盘和防松懈。', ['完成', '平衡', '收尾'], '把成果交付并检查隐患。', '避免完成后失去警觉。'],
  ['火水未济', '离', '坎', '未竟之事，适合继续校准和完成最后一段。', ['未成', '校准', '继续'], '找到最后没对齐的环节。', '避免临门一脚时急躁。']
].map((item, index) => {
  const upper = TRIGRAMS.find((trigram) => trigram.name === item[1])
  const lower = TRIGRAMS.find((trigram) => trigram.name === item[2])
  return {
    number: index + 1,
    name: item[0],
    upper: item[1],
    lower: item[2],
    judgement: item[3],
    keywords: item[4],
    advice: item[5],
    caution: item[6],
    image: `${upper.nature}在上，${lower.nature}在下：${upper.image}与${lower.image}相互作用。`,
    symbol: `${upper.symbol}\n${lower.symbol}`
  }
})

const LINE_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const LINE_STAGES = ['起点', '蓄势', '关口', '外应', '主位', '收束']
const LINE_TYPES = [
  { name: '老阴', yang: false, moving: true },
  { name: '少阳', yang: true, moving: false },
  { name: '少阴', yang: false, moving: false },
  { name: '老阳', yang: true, moving: true }
]

const isCurrentHistory = (item) => item && item.primaryHexagram && item.changedHexagram && item.copyText
const mdToHtml = (text) => text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .split('\n')
  .map((line) => {
    const title = line.match(/^#{1,3}\s+(.+)$/)
    if (title) {
      return `<div style="margin:28rpx 0 12rpx;font-size:30rpx;font-weight:700;color:#111827;line-height:1.5">${title[1]}</div>`
    }
    if (!line.trim()) {
      return '<div style="height:10rpx"></div>'
    }
    const body = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2rpx 8rpx;border-radius:6rpx;font-size:24rpx">$1</code>')
    return `<div style="margin:0 0 14rpx;color:#334155;font-size:26rpx;line-height:1.75">${body}</div>`
  })
  .join('')
const hashText = (text) => String(text).split('').reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 2166136261)
const mixSeed = (value) => {
  let seed = value >>> 0
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return seed >>> 0
}
const keyOf = (upper, lower) => `${upper}_${lower}`
const trigramByBits = (bits) => TRIGRAMS.find((item) => item.bits.join('') === bits.join('')) || TRIGRAMS[0]
const hexagramBy = (upper, lower) => HEXAGRAMS.find((item) => keyOf(item.upper, item.lower) === keyOf(upper, lower)) || HEXAGRAMS[0]

const buildLineText = (line, primary, changed) => {
  const direction = line.yang ? '宜主动表达和推进' : '宜收敛观察和承接'
  const change = line.changedYang !== line.yang ? `此爻发动，事情会从“${primary.name}”转向“${changed.name}”。` : ''
  return `${LINE_STAGES[line.position - 1]}阶段，${direction}。${change}`
}

const buildLines = (seed, question, date) => {
  const cleanQuestion = question || '今日行动建议'
  let state = mixSeed(seed ^ hashText(`${cleanQuestion}-${date}-bagua`))
  const lines = Array.from({ length: 6 }, (_, index) => {
    state = mixSeed(state + hashText(`${date}-${cleanQuestion}-${index + 1}`) + index * 2654435761)
    const roll = state % 100
    const yang = roll % 2 === 1
    const moving = roll < 24
    const type = moving ? (yang ? '老阳' : '老阴') : (yang ? '少阳' : '少阴')
    return {
      position: index + 1,
      label: LINE_NAMES[index],
      type,
      yang,
      moving,
      reference: false,
      changedYang: moving ? !yang : yang
    }
  })
  if (!lines.some((line) => line.moving)) {
    const index = Math.abs(seed) % 6
    lines[index].moving = true
    lines[index].reference = true
    lines[index].type = `${lines[index].type} · 参考动爻`
    lines[index].changedYang = !lines[index].yang
  }
  return lines
}

const STOP_WORDS = ['今天', '明天', '是否', '应该', '可以', '适合', '要不要', '怎么样', '如何', '吗', '呢', '吧', '啊', '的', '了', '我', '我们', '你', '他', '她', '它', '他们', '这个', '那个', '什么', '怎么', '为什么', '还是', '或者', '继续', '现在', '目前', '最近', '一下', '一个']

const extractTopic = (question) => {
  const cleaned = question.replace(/[？?！!，,。.、\s]+/g, '').trim()
  const words = []
  let current = ''
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    if (/[\u4e00-\u9fa5]/.test(char)) {
      current += char
    } else {
      if (current) { words.push(current); current = '' }
    }
  }
  if (current) words.push(current)
  const meaningful = words.filter((w) => w.length >= 2 && !STOP_WORDS.includes(w))
  return meaningful.length > 0 ? meaningful.join('、') : '当前事项'
}

const buildResult = (question) => {
  const date = todayKey()
  const cleanQuestion = question.replace(/\s+/g, '').trim() || '今日行动建议'
  const seed = hashText(`${date}-${cleanQuestion}`)
  const topic = extractTopic(cleanQuestion)
  const lines = buildLines(seed, cleanQuestion, date)
  const lower = trigramByBits(lines.slice(0, 3).map((line) => line.yang ? 1 : 0))
  const upper = trigramByBits(lines.slice(3, 6).map((line) => line.yang ? 1 : 0))
  const changedLower = trigramByBits(lines.slice(0, 3).map((line) => line.changedYang ? 1 : 0))
  const changedUpper = trigramByBits(lines.slice(3, 6).map((line) => line.changedYang ? 1 : 0))
  const primaryHexagram = hexagramBy(upper.name, lower.name)
  const changedHexagram = hexagramBy(changedUpper.name, changedLower.name)
  const changingLines = lines
    .filter((line) => line.moving)
    .map((line) => ({ ...line, text: buildLineText(line, primaryHexagram, changedHexagram) }))
  const displayLines = lines
    .map((line) => ({ ...line, text: buildLineText(line, primaryHexagram, changedHexagram) }))
    .reverse()
  const cleanAdvice = primaryHexagram.advice.replace(/[。.]$/, '')
  const cleanCaution = primaryHexagram.caution.replace(/[。.]$/, '')
  const dynamicJudgement = primaryHexagram.judgement.replace(/适合[^，。]*/, `针对“${topic}”，建议$&`)
  const dynamicAdvice = `${cleanAdvice}，同时留意“${topic}”相关的节奏和边界。`
  const dynamicCaution = `${cleanCaution}，尤其不要在“${topic}”上急于推进。`
  const dynamicSummary = `针对你关心的“${topic}”，${primaryHexagram.name}提示：${primaryHexagram.judgement} 变化之后走向${changedHexagram.name}，行动重点落在“${changedHexagram.keywords[0]}”上。`
  const focus = `本卦提示“${primaryHexagram.keywords[0]}”，变卦指向“${changedHexagram.keywords[0]}”，可围绕“${topic}”调整行动节奏。`
  const result = {
    id: `${date}_${seed}`,
    date,
    question: cleanQuestion,
    topic,
    primaryHexagram,
    changedHexagram,
    lines: displayLines,
    changingLines,
    focus,
    summary: dynamicSummary,
    judgement: dynamicJudgement,
    advice: dynamicAdvice,
    caution: dynamicCaution,
    score: 60 + Math.abs(seed * 13) % 39
  }
  result.copyText = [
    `事项：${result.question}`,
    `本卦：第${primaryHexagram.number}卦 ${primaryHexagram.name}（上${primaryHexagram.upper}下${primaryHexagram.lower}）`,
    `卦意：${primaryHexagram.judgement}`,
    `动爻：${changingLines.map((line) => `${line.label}${line.reference ? '（参考）' : ''}`).join('、')}`,
    `变卦：第${changedHexagram.number}卦 ${changedHexagram.name}（上${changedHexagram.upper}下${changedHexagram.lower}）`,
    `行动建议：${result.advice}`,
    `慎做：${result.caution}`,
    '说明：仅作自我梳理和行动提醒，不作为预测或决策依据。'
  ].join('\n')
  return result
}

Page({
  data: {
    question: '',
    trigrams: TRIGRAMS,
    result: null,
    history: [],
    aiLoading: false,
    aiError: '',
    disclaimer: '本工具以易经八卦结构做自我梳理和行动提醒，不代表确定性预测，也不作为投资、医疗、法律或重大决策依据。'
  },

  onLoad() {
    this.setData({ history: getHistory(KEY).filter(isCurrentHistory) })
  },

  onQuestionInput(event) {
    this.setData({ question: event.detail.value })
  },

  generate() {
    const result = buildResult(this.data.question)
    const history = addHistory(KEY, result, 10).filter(isCurrentHistory)
    this.setData({ result, history, aiLoading: true, aiError: '' })
    this.callAiInterpret(result)
  },

  async callAiInterpret(result) {
    const config = getAiConfig()
    if (!config.baseUrl || !config.model || !config.apiKey) {
      this.setData({ aiLoading: false, aiError: '未配置 AI' })
      return
    }
    try {
      const res = await post('/tool/bagua-ai', {
        question: result.question,
        primaryHexagram: result.primaryHexagram,
        changedHexagram: result.changedHexagram,
        changingLines: result.changingLines,
        aiBaseUrl: config.baseUrl,
        aiModel: config.model,
        aiApiKey: config.apiKey
      })
      const interpretation = res.data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const aiHtml = mdToHtml(interpretation)
      const updated = { ...this.data.result, aiInterpretation: interpretation, aiHtml }
      this.setData({ result: updated, aiLoading: false, aiError: '' })
    } catch (err) {
      this.setData({ aiLoading: false, aiError: err.message || 'AI 解读失败' })
    }
  },

  goToAiConfig() {
    wx.navigateTo({ url: '/pages-tool/ai-config/index' })
  },

  copyResult() {
    if (!this.data.result) return
    const r = this.data.result
    let text
    if (r.aiInterpretation) {
      text = [
        `事项：${r.question}`,
        `本卦：第${r.primaryHexagram.number}卦 ${r.primaryHexagram.name}（上${r.primaryHexagram.upper}下${r.primaryHexagram.lower}）`,
        `变卦：第${r.changedHexagram.number}卦 ${r.changedHexagram.name}（上${r.changedHexagram.upper}下${r.changedHexagram.lower}）`,
        '',
        r.aiInterpretation,
        '',
        '说明：仅作自我梳理和行动提醒，不作为预测或决策依据。'
      ].join('\n')
    } else {
      text = r.copyText
    }
    copyText(text)
  },

  copyHistory(event) {
    const item = this.data.history[event.currentTarget.dataset.index]
    if (!item) return
    copyText(item.copyText)
  }
})
