const taskStore = require('../../utils/task-store');
const DEFAULT_OPTIONS = ['黄焖鸡', '麻辣烫', '麦当劳', '肯德基', '沙县小吃', '兰州拉面', '螺蛳粉', '便利店'];
const COLORS = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];

Page({
  data: {
    options: [...DEFAULT_OPTIONS],
    inputValue: '',
    result: '',
    isSpinning: false,
    currentAngle: 0
  },

  onLoad() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;
        this.canvasWidth = res[0].width;
        this.canvasHeight = res[0].height;
        this.drawWheel();
      });
  },

  drawWheel() {
    if (!this.ctx) return;
    const { options } = this.data;
    const ctx = this.ctx;
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const arc = Math.PI * 2 / options.length;

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // 1. 绘制转盘背景圆圈
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.fill();
    ctx.restore();

    // 2. 绘制扇区
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.data.currentAngle);

    options.forEach((option, i) => {
      const angle = i * arc;
      
      // 绘制扇区
      ctx.beginPath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.fill();
      
      // 绘制扇区边框
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 绘制文字（固定径向排列，防止旋转时跳变）
      ctx.save();
      ctx.fillStyle = '#444';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      const textAngle = angle + arc / 2;
      ctx.rotate(textAngle);
      
      // 统一向外侧靠齐，不再根据象限动态翻转
      ctx.fillText(option, radius - 15, 0);
      ctx.restore();
    });
    ctx.restore();

    // 3. 绘制中心按钮和顶部指针
    this.drawUIElements(centerX, centerY, radius);
  },

  drawUIElements(centerX, centerY, radius) {
    const ctx = this.ctx;
    
    // 绘制顶部固定指针
    ctx.save();
    ctx.translate(centerX, centerY - radius - 5);
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 25);
    ctx.closePath();
    ctx.fillStyle = '#ff4d4f';
    ctx.fill();
    ctx.restore();

    // 绘制中心按钮
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // 外圈装饰
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.fill();

    // 内圈按钮
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d4f';
    ctx.fill();

    // “开始”文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始', 0, 0);
    
    ctx.restore();
  },

  startSpin() {
    if (this.data.isSpinning) return;

    this.setData({ isSpinning: true, result: '' });
    
    const spinRounds = 5 + Math.random() * 5; // 旋转圈数
    const targetAngle = this.data.currentAngle + spinRounds * Math.PI * 2 + Math.random() * Math.PI * 2;
    const duration = 3000;
    const startTime = Date.now();
    const startAngle = this.data.currentAngle;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // 缓动函数 (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startAngle + (targetAngle - startAngle) * easeProgress;

      this.setData({ currentAngle });
      this.drawWheel();

      if (progress < 1) {
        this.canvas.requestAnimationFrame(animate);
      } else {
        this.setData({ isSpinning: false });
        this.calculateResult();
      }
    };

    animate();
  },

  calculateResult() {
    const { options, currentAngle } = this.data;
    const arc = Math.PI * 2 / options.length;
    // 指针在正上方 (1.5 * PI)，转盘顺时针转，所以要用 2*PI 减去余数
    const normalizedAngle = (Math.PI * 1.5 - currentAngle) % (Math.PI * 2);
    const positiveAngle = normalizedAngle < 0 ? normalizedAngle + Math.PI * 2 : normalizedAngle;
    const index = Math.floor(positiveAngle / arc);
    
    const result = options[index];
    this.setData({
      result
    });

    taskStore.upsertTask({
      taskId: 'eat_' + Date.now(),
      toolType: 'eat-what',
      sourceFileName: '转盘抽取',
      resultFileName: result,
      status: 'SUCCESS',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      message: '抽取结果：' + result
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  addOption() {
    const val = this.data.inputValue.trim();
    if (!val) return;
    if (this.data.options.length >= 12) {
      wx.showToast({ title: '最多12个选项', icon: 'none' });
      return;
    }
    const options = [...this.data.options, val];
    this.setData({ options, inputValue: '' });
    this.drawWheel();
  },

  removeOption(e) {
    const { index } = e.currentTarget.dataset;
    if (this.data.options.length <= 2) {
      wx.showToast({ title: '至少保留2个选项', icon: 'none' });
      return;
    }
    const options = [...this.data.options];
    options.splice(index, 1);
    this.setData({ options });
    this.drawWheel();
  },

  resetOptions() {
    this.setData({ options: [...DEFAULT_OPTIONS] });
    this.drawWheel();
  }
});