const taskStore = require('../../utils/task-store');
const HISTORY_KEY = 'random_gen_history_v1';
const MAX_HISTORY = 20;

function pickRandomChar(text) {
  return text.charAt(Math.floor(Math.random() * text.length));
}

function pickRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pad2(num) {
  return `${num}`.padStart(2, '0');
}

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function addDays(dateText, days) {
  const base = new Date(`${dateText}T00:00:00`);
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`;
}

Page({
  data: {
    tabs: [
      { key: 'number', label: '随机数' },
      { key: 'password', label: '强密码' },
      { key: 'date', label: '随机日期' },
      { key: 'nickname', label: '随机昵称' },
      { key: 'verify', label: '验证码' },
      { key: 'group', label: '随机分组' }
    ],
    activeTab: 'number',

    min: 1,
    max: 100,
    count: 1,
    allowDuplicate: true,

    pwdLength: 12,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: false,
    excludeAmbiguous: false,
    passwordStrength: '',

    dateStart: getTodayDate(),
    dateEnd: addDays(getTodayDate(), 30),
    dateIncludeTime: false,
    dateCount: 5,

    nicknameCount: 10,

    verifyLength: 6,
    verifyCount: 5,
    verifyUseNumbers: true,
    verifyUseUppercase: false,
    verifyUseLowercase: false,

    groupMembersInput: '',
    groupLockInput: '',
    groupMode: 'count',
    groupCount: 2,
    groupSize: 3,

    results: [],
    historyItems: []
  },

  onLoad() {
    this.loadHistory();
  },

  switchTab(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab,
      results: [],
      passwordStrength: ''
    });
  },

  onInputMin(e) { this.setData({ min: parseInt(e.detail.value, 10) || 0 }); },
  onInputMax(e) { this.setData({ max: parseInt(e.detail.value, 10) || 0 }); },
  onCountChange(e) { this.setData({ count: Number(e.detail.value) || 1 }); },
  onPwdLengthChange(e) { this.setData({ pwdLength: Number(e.detail.value) || 12 }); },

  onDateStartChange(e) { this.setData({ dateStart: e.detail.value }); },
  onDateEndChange(e) { this.setData({ dateEnd: e.detail.value }); },
  onDateCountChange(e) { this.setData({ dateCount: Number(e.detail.value) || 1 }); },

  onNicknameCountChange(e) { this.setData({ nicknameCount: Number(e.detail.value) || 1 }); },

  onVerifyLengthChange(e) { this.setData({ verifyLength: Number(e.detail.value) || 6 }); },
  onVerifyCountChange(e) { this.setData({ verifyCount: Number(e.detail.value) || 1 }); },

  onGroupMembersInput(e) { this.setData({ groupMembersInput: e.detail.value || '' }); },
  onGroupLockInput(e) { this.setData({ groupLockInput: e.detail.value || '' }); },
  onGroupCountChange(e) { this.setData({ groupCount: Number(e.detail.value) || 1 }); },
  onGroupSizeChange(e) { this.setData({ groupSize: Number(e.detail.value) || 1 }); },

  switchGroupMode(e) {
    this.setData({ groupMode: e.currentTarget.dataset.mode });
  },

  toggleOption(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: !this.data[key] });
  },

  generateNumbers() {
    const { min, max, count, allowDuplicate } = this.data;

    if (min > max) {
      wx.showToast({ title: '最小值不能大于最大值', icon: 'none' });
      return;
    }
    if (count <= 0) {
      wx.showToast({ title: '生成个数需大于0', icon: 'none' });
      return;
    }

    const rangeSize = max - min + 1;
    if (!allowDuplicate && count > rangeSize) {
      wx.showToast({ title: '去重模式下个数超出范围容量', icon: 'none' });
      return;
    }

    const results = this.buildRandomNumberResults(min, max, count, allowDuplicate);
    this.setData({ results, passwordStrength: '' });

    this.saveHistory({
      type: 'number',
      paramsText: `范围 ${min}~${max} · ${count}个 · ${allowDuplicate ? '允许重复' : '去重'}`,
      resultText: this.buildResultPreview(results),
      copyText: results.join('\n'),
      payload: { tab: 'number', min, max, count, allowDuplicate }
    });
  },

  generatePassword() {
    const {
      pwdLength,
      useUppercase,
      useLowercase,
      useNumbers,
      useSymbols,
      excludeAmbiguous
    } = this.data;

    const built = this.buildPassword({
      pwdLength,
      useUppercase,
      useLowercase,
      useNumbers,
      useSymbols,
      excludeAmbiguous
    });

    if (built.error) {
      wx.showToast({ title: built.error, icon: 'none' });
      return;
    }

    const passwordStrength = this.getPasswordStrength(built.password, {
      pwdLength,
      useUppercase,
      useLowercase,
      useNumbers,
      useSymbols
    });

    this.setData({
      results: [built.password],
      passwordStrength
    });

    this.saveHistory({
      type: 'password',
      paramsText: `长度 ${pwdLength} · ${excludeAmbiguous ? '排除易混字符' : '含易混字符'}`,
      resultText: built.password,
      copyText: built.password,
      payload: {
        tab: 'password',
        pwdLength,
        useUppercase,
        useLowercase,
        useNumbers,
        useSymbols,
        excludeAmbiguous
      }
    });
  },

  generateRandomDateTimes() {
    const { dateStart, dateEnd, dateIncludeTime, dateCount } = this.data;
    const start = new Date(`${dateStart}T00:00:00`).getTime();
    const end = new Date(`${dateEnd}T23:59:59`).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      wx.showToast({ title: '日期格式无效', icon: 'none' });
      return;
    }
    if (start > end) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }

    const results = [];
    for (let i = 0; i < dateCount; i++) {
      const t = start + Math.floor(Math.random() * (end - start + 1));
      results.push(dateIncludeTime ? this.formatDateTime(t) : this.formatDate(t));
    }

    this.setData({ results, passwordStrength: '' });
    this.saveHistory({
      type: 'date',
      paramsText: `${dateStart} ~ ${dateEnd} · ${dateCount}个 · ${dateIncludeTime ? '含时分秒' : '仅日期'}`,
      resultText: this.buildResultPreview(results),
      copyText: results.join('\n'),
      payload: { tab: 'date', dateStart, dateEnd, dateIncludeTime, dateCount }
    });
  },

  generateNicknames() {
    const { nicknameCount } = this.data;
    const results = this.buildNicknames(nicknameCount);

    this.setData({ results, passwordStrength: '' });
    this.saveHistory({
      type: 'nickname',
      paramsText: `生成 ${nicknameCount} 个`,
      resultText: this.buildResultPreview(results),
      copyText: results.join('\n'),
      payload: { tab: 'nickname', nicknameCount }
    });
  },

  generateVerifyCodes() {
    const {
      verifyLength,
      verifyCount,
      verifyUseNumbers,
      verifyUseUppercase,
      verifyUseLowercase
    } = this.data;

    const built = this.buildVerifyCodes({
      verifyLength,
      verifyCount,
      verifyUseNumbers,
      verifyUseUppercase,
      verifyUseLowercase
    });

    if (built.error) {
      wx.showToast({ title: built.error, icon: 'none' });
      return;
    }

    this.setData({ results: built.codes, passwordStrength: '' });
    this.saveHistory({
      type: 'verify',
      paramsText: `长度 ${verifyLength} · ${verifyCount}个`,
      resultText: this.buildResultPreview(built.codes),
      copyText: built.codes.join('\n'),
      payload: {
        tab: 'verify',
        verifyLength,
        verifyCount,
        verifyUseNumbers,
        verifyUseUppercase,
        verifyUseLowercase
      }
    });
  },

  generateGroups() {
    const {
      groupMembersInput,
      groupLockInput,
      groupMode,
      groupCount,
      groupSize
    } = this.data;

    const members = this.parseNameList(groupMembersInput);
    if (members.length < 2) {
      wx.showToast({ title: '至少输入2名成员', icon: 'none' });
      return;
    }

    const lockCandidates = this.parseNameList(groupLockInput);
    const memberSet = new Set(members);
    const lockedMembers = lockCandidates.filter((name) => memberSet.has(name));
    const lockedSet = new Set(lockedMembers);

    let groupTotal = 1;
    if (groupMode === 'count') {
      groupTotal = Math.max(1, Math.min(Number(groupCount) || 1, members.length));
    } else {
      const size = Math.max(1, Number(groupSize) || 1);
      groupTotal = Math.ceil(members.length / size);
    }

    const groups = Array.from({ length: groupTotal }, () => []);
    lockedMembers.forEach((name) => groups[0].push(name));

    const rest = members.filter((name) => !lockedSet.has(name));
    shuffleArray(rest);
    rest.forEach((name, idx) => {
      groups[idx % groupTotal].push(name);
    });

    const results = groups.map((names, idx) => `第${idx + 1}组（${names.length}人）：${names.join('、') || '（空）'}`);

    this.setData({ results, passwordStrength: '' });
    this.saveHistory({
      type: 'group',
      paramsText: `成员${members.length}人 · ${groupMode === 'count' ? `${groupTotal}组` : `每组${Math.max(1, Number(groupSize) || 1)}人`} · 锁定${lockedMembers.length}人`,
      resultText: this.buildResultPreview(results),
      copyText: results.join('\n'),
      payload: {
        tab: 'group',
        groupMembersInput,
        groupLockInput,
        groupMode,
        groupCount: Number(groupCount) || 1,
        groupSize: Number(groupSize) || 1
      }
    });
  },

  buildRandomNumberResults(min, max, count, allowDuplicate) {
    if (allowDuplicate) {
      const results = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
      return results;
    }

    const pool = [];
    for (let v = min; v <= max; v++) pool.push(v);

    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  },

  buildPassword(options) {
    const {
      pwdLength,
      useUppercase,
      useLowercase,
      useNumbers,
      useSymbols,
      excludeAmbiguous
    } = options;

    const ambiguous = '0O1lI';
    const upperBase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerBase = 'abcdefghijklmnopqrstuvwxyz';
    const numsBase = '0123456789';
    const symsBase = '!@#$%^&*()_+~`|}{[]:;?><,./-';

    const upper = excludeAmbiguous ? upperBase.replace(/[OI]/g, '') : upperBase;
    const lower = excludeAmbiguous ? lowerBase.replace(/l/g, '') : lowerBase;
    const nums = excludeAmbiguous ? numsBase.replace(/[01]/g, '') : numsBase;
    const syms = symsBase;

    const groups = [];
    if (useUppercase) groups.push(upper);
    if (useLowercase) groups.push(lower);
    if (useNumbers) groups.push(nums);
    if (useSymbols) groups.push(syms);

    if (!groups.length) {
      return { error: '请至少选择一种字符类型' };
    }

    if (groups.some((g) => !g)) {
      return { error: '当前配置导致字符集为空，请调整配置' };
    }

    if (pwdLength < groups.length) {
      return { error: '密码长度过短，无法覆盖所选字符类型' };
    }

    const chars = groups.map((group) => pickRandomChar(group));
    const all = groups.join('');

    for (let i = chars.length; i < pwdLength; i++) {
      chars.push(pickRandomChar(all));
    }

    shuffleArray(chars);
    const password = chars.join('');

    if (excludeAmbiguous && password.split('').some((ch) => ambiguous.includes(ch))) {
      return { error: '生成失败，请重试' };
    }

    return { password };
  },

  buildNicknames(count) {
    const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '谢', '邹', '喻', '柏', '水', '窦', '章', '云'];
    const chars = ['子', '若', '一', '可', '思', '安', '雨', '晨', '沐', '星', '清', '书', '泽', '言', '然', '柠', '溪', '悦', '辰', '北', '南', '知', '夏', '念', '亦', '锦', '舒', '宸', '宁', '禾', '岚', '奕', '航', '嘉', '宁', '语', '乔', '伊', '诺', '舟'];

    const results = [];
    for (let i = 0; i < count; i++) {
      const a = pickRandomChar(chars);
      const b = pickRandomChar(chars);
      const third = Math.random() < 0.35 ? pickRandomChar(chars) : '';
      results.push(`${pickRandomItem(surnames)}${a}${b}${third}`);
    }
    return results;
  },

  buildVerifyCodes(options) {
    const {
      verifyLength,
      verifyCount,
      verifyUseNumbers,
      verifyUseUppercase,
      verifyUseLowercase
    } = options;

    const groups = [];
    if (verifyUseNumbers) groups.push('0123456789');
    if (verifyUseUppercase) groups.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (verifyUseLowercase) groups.push('abcdefghijklmnopqrstuvwxyz');

    if (!groups.length) {
      return { error: '请至少选择一种验证码字符类型' };
    }
    if (verifyLength < groups.length) {
      return { error: '验证码长度不足以覆盖所选字符类型' };
    }

    const all = groups.join('');
    const codes = [];

    for (let c = 0; c < verifyCount; c++) {
      const chars = groups.map((g) => pickRandomChar(g));
      for (let i = chars.length; i < verifyLength; i++) {
        chars.push(pickRandomChar(all));
      }
      shuffleArray(chars);
      codes.push(chars.join(''));
    }

    return { codes };
  },

  getPasswordStrength(password, options) {
    const { pwdLength, useUppercase, useLowercase, useNumbers, useSymbols } = options;
    const groupCount = [useUppercase, useLowercase, useNumbers, useSymbols].filter(Boolean).length;

    let score = 0;
    if (pwdLength >= 10) score += 1;
    if (pwdLength >= 14) score += 1;
    if (groupCount >= 2) score += 1;
    if (groupCount >= 3) score += 1;
    if (groupCount >= 4) score += 1;

    const hasMixed = /[A-Z]/.test(password) && /[a-z]/.test(password);
    if (hasMixed) score += 1;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  },

  parseNameList(text) {
    const parts = `${text || ''}`
      .split(/[\n,，;；\t ]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    parts.forEach((name) => {
      if (!seen.has(name)) {
        unique.push(name);
        seen.add(name);
      }
    });

    return unique;
  },

  buildResultPreview(results) {
    const text = results.join(', ');
    if (text.length <= 80) return text;
    return `${text.slice(0, 80)}...`;
  },

  loadHistory() {
    const stored = wx.getStorageSync(HISTORY_KEY) || [];
    const raw = Array.isArray(stored) ? stored : [];
    const historyItems = raw.map((item) => this.normalizeHistoryItem(item));
    this.setData({ historyItems });
  },

  normalizeHistoryItem(item) {
    return {
      ...item,
      typeLabel: item.typeLabel || this.getTypeLabel(item.type),
      paramsText: item.paramsText || '',
      resultText: item.resultText || '',
      copyText: item.copyText || ''
    };
  },

  getTypeLabel(type) {
    if (type === 'number') return '随机数';
    if (type === 'password') return '强密码';
    if (type === 'date') return '随机日期';
    if (type === 'nickname') return '随机昵称';
    if (type === 'verify') return '验证码';
    if (type === 'group') return '随机分组';
    return '随机生成';
  },

  saveHistory(item) {
    const now = Date.now();
    const historyItem = this.normalizeHistoryItem({
      id: `${now}-${Math.floor(Math.random() * 1000000)}`,
      createdAt: this.formatTime(now),
      ...item
    });

    const next = [historyItem, ...(this.data.historyItems || [])].slice(0, MAX_HISTORY);
    this.setData({ historyItems: next });
    wx.setStorageSync(HISTORY_KEY, next);

    // 同步到任务历史
    taskStore.upsertTask({
      taskId: 'rand_' + now,
      toolType: 'random-gen',
      sourceFileName: historyItem.typeLabel,
      resultFileName: historyItem.resultText,
      status: 'SUCCESS',
      updatedAt: now,
      createdAt: now,
      message: historyItem.paramsText
    });
  },

  reuseHistory(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.historyItems || [])[index];
    if (!item || !item.payload) return;

    const payload = item.payload;

    if (item.type === 'number') {
      this.setData({
        activeTab: 'number',
        min: Number(payload.min) || 1,
        max: Number(payload.max) || 100,
        count: Number(payload.count) || 1,
        allowDuplicate: !!payload.allowDuplicate
      }, () => this.generateNumbers());
      return;
    }

    if (item.type === 'password') {
      this.setData({
        activeTab: 'password',
        pwdLength: Number(payload.pwdLength) || 12,
        useUppercase: !!payload.useUppercase,
        useLowercase: !!payload.useLowercase,
        useNumbers: !!payload.useNumbers,
        useSymbols: !!payload.useSymbols,
        excludeAmbiguous: !!payload.excludeAmbiguous
      }, () => this.generatePassword());
      return;
    }

    if (item.type === 'date') {
      this.setData({
        activeTab: 'date',
        dateStart: payload.dateStart || getTodayDate(),
        dateEnd: payload.dateEnd || addDays(getTodayDate(), 30),
        dateIncludeTime: !!payload.dateIncludeTime,
        dateCount: Number(payload.dateCount) || 1
      }, () => this.generateRandomDateTimes());
      return;
    }

    if (item.type === 'nickname') {
      this.setData({
        activeTab: 'nickname',
        nicknameCount: Number(payload.nicknameCount) || 1
      }, () => this.generateNicknames());
      return;
    }

    if (item.type === 'verify') {
      this.setData({
        activeTab: 'verify',
        verifyLength: Number(payload.verifyLength) || 6,
        verifyCount: Number(payload.verifyCount) || 1,
        verifyUseNumbers: !!payload.verifyUseNumbers,
        verifyUseUppercase: !!payload.verifyUseUppercase,
        verifyUseLowercase: !!payload.verifyUseLowercase
      }, () => this.generateVerifyCodes());
      return;
    }

    if (item.type === 'group') {
      this.setData({
        activeTab: 'group',
        groupMembersInput: payload.groupMembersInput || '',
        groupLockInput: payload.groupLockInput || '',
        groupMode: payload.groupMode === 'size' ? 'size' : 'count',
        groupCount: Number(payload.groupCount) || 2,
        groupSize: Number(payload.groupSize) || 3
      }, () => this.generateGroups());
    }
  },

  copyHistoryItem(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({
      data: text.toString(),
      success: () => wx.showToast({ title: '已复制' })
    });
  },

  formatDate(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  },

  formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  copyItem(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text.toString(),
      success: () => wx.showToast({ title: '已复制' })
    });
  },

  copyAll() {
    wx.setClipboardData({
      data: this.data.results.join('\n'),
      success: () => wx.showToast({ title: '全部已复制' })
    });
  }
});
