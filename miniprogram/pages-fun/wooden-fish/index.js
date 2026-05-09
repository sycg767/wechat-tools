const STORAGE_KEY = 'WOODEN_FISH_COUNT';
const CUSTOM_TEXT_KEY = 'WOODEN_FISH_TEXT';
const COUNT_LABEL_KEY = 'WOODEN_FISH_LABEL';
const LOCAL_AUDIO_SRC = '/assets/audio/wooden-fish.wav';
const AUDIO_POOL_SIZE = 6;
const MIN_AUDIO_INTERVAL = 60;
const MIN_VIBRATE_INTERVAL = 80;
const HIT_ANIMATION_DURATION = 90;
const MAX_FLOATING_TEXTS = 12;

Page({
  data: {
    totalCount: 0,
    countLabel: '累计功德',
    customText: '功德 +1',
    isHitting: false,
    floatingTexts: [],
    showSettings: false,
    nextId: 0
  },

  onLoad() {
    // 全局音频配置：确保在静音模式下也能播放
    if (wx.setInnerAudioOption) {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false,
        speakerOn: true
      });
    }

    // 初始化音频上下文
    this.initAudio();

    // 加载本地持久化数据
    const count = wx.getStorageSync(STORAGE_KEY) || 0;
    const text = wx.getStorageSync(CUSTOM_TEXT_KEY) || '功德 +1';
    const label = wx.getStorageSync(COUNT_LABEL_KEY) || '累计功德';
    this.setData({
      totalCount: count,
      customText: text,
      countLabel: label
    });
  },

  initAudio() {
    if (this.audioPool) {
      this.audioPool.forEach((ctx) => {
        try {
          ctx.destroy();
        } catch (e) {}
      });
    }

    this.audioPool = Array.from({ length: AUDIO_POOL_SIZE }, () => {
      const ctx = wx.createInnerAudioContext();
      ctx.obeyMuteSwitch = false;
      ctx.autoplay = false;
      ctx.src = LOCAL_AUDIO_SRC;
      ctx.onError((res) => {
        console.error('音频播放错误详情:', res);
      });
      return ctx;
    });
    this.audioCursor = 0;
    this.lastAudioAt = 0;
    this.lastVibrateAt = 0;
    this.hitAnimating = false;
  },


  onUnload() {
    if (this.hitTimer) {
      clearTimeout(this.hitTimer);
      this.hitTimer = null;
    }
    if (this.hitAnimTimer) {
      clearTimeout(this.hitAnimTimer);
      this.hitAnimTimer = null;
    }
    this.stopAutoHit();
    if (this.audioPool) {
      this.audioPool.forEach((ctx) => {
        try {
          ctx.destroy();
        } catch (e) {}
      });
      this.audioPool = null;
    }
  },

  // 触摸开始：处理单次点击与长按连敲
  onTouchStart(e) {
    this.lastTouchPos = e.touches[0];
    this.triggerHit(this.lastTouchPos);
    
    // 开启长按定时器：500ms 后开始连敲
    this.hitTimer = setTimeout(() => {
      this.startAutoHit();
    }, 500);
  },

  // 触摸结束：清除定时器
  onTouchEnd() {
    if (this.hitTimer) {
      clearTimeout(this.hitTimer);
      this.hitTimer = null;
    }
    this.stopAutoHit();
  },

  // 开始自动连敲
  startAutoHit() {
    if (this.autoHitInterval) return;
    this.autoHitInterval = setInterval(() => {
      this.triggerHit(this.lastTouchPos);
    }, 200); // 连敲频率：每 200ms 一次
  },

  // 停止自动连敲
  stopAutoHit() {
    if (this.autoHitInterval) {
      clearInterval(this.autoHitInterval);
      this.autoHitInterval = null;
    }
  },

  // 核心击打逻辑
  triggerHit(pos) {
    const now = Date.now();

    // 1. 视觉反馈
    if (!this.hitAnimating) {
      this.hitAnimating = true;
      this.setData({ isHitting: true });
      this.hitAnimTimer = setTimeout(() => {
        this.setData({ isHitting: false });
        this.hitAnimating = false;
        this.hitAnimTimer = null;
      }, HIT_ANIMATION_DURATION);
    }

    // 2. 触觉反馈
    if (now - this.lastVibrateAt >= MIN_VIBRATE_INTERVAL) {
      this.lastVibrateAt = now;
      wx.vibrateShort({ type: 'light' });
    }

    // 3. 听觉反馈
    if (this.audioPool && this.audioPool.length && now - this.lastAudioAt >= MIN_AUDIO_INTERVAL) {
      this.lastAudioAt = now;
      const ctx = this.audioPool[this.audioCursor];
      this.audioCursor = (this.audioCursor + 1) % this.audioPool.length;
      try {
        ctx.seek(0);
      } catch (err) {}
      ctx.play();
    }

    // 4. 数据更新
    const newCount = this.data.totalCount + 1;
    this.setData({ totalCount: newCount });
    wx.nextTick(() => {
      wx.setStorageSync(STORAGE_KEY, newCount);
    });

    // 5. 飘字逻辑
    if (pos) {
      this.addFloatingText({
        detail: { x: pos.clientX, y: pos.clientY }
      });
    }
  },

  // 添加飘字
  addFloatingText(e) {
    const { x, y } = e.detail;
    const id = this.data.nextId;
    const newText = {
      id,
      text: this.data.customText,
      x: x - 50, // 居中偏移优化
      y: y - 80
    };

    const floatingTexts = [...this.data.floatingTexts, newText].slice(-MAX_FLOATING_TEXTS);
    this.setData({
      floatingTexts,
      nextId: id + 1
    });

    // 800ms 后移除该飘字，释放内存
    setTimeout(() => {
      this.setData({
        floatingTexts: this.data.floatingTexts.filter(t => t.id !== id)
      });
    }, 800);
  },

  // 设置相关
  toggleSettings() {
    this.setData({ showSettings: !this.data.showSettings });
  },

  onInputUpdate(e) {
    const { key } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [key]: value });
    
    // 持久化存储
    if (key === 'customText') {
      wx.setStorageSync(CUSTOM_TEXT_KEY, value);
    } else if (key === 'countLabel') {
      wx.setStorageSync(COUNT_LABEL_KEY, value);
    }
  }
});