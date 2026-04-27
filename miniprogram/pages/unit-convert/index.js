const unitData = {
  length: {
    name: '长度',
    units: [
      { name: '米 (m)', ratio: 1 },
      { name: '厘米 (cm)', ratio: 0.01 },
      { name: '毫米 (mm)', ratio: 0.001 },
      { name: '千米 (km)', ratio: 1000 },
      { name: '英寸 (in)', ratio: 0.0254 },
      { name: '英尺 (ft)', ratio: 0.3048 }
    ]
  },
  weight: {
    name: '重量',
    units: [
      { name: '千克 (kg)', ratio: 1 },
      { name: '克 (g)', ratio: 0.001 },
      { name: '毫克 (mg)', ratio: 0.000001 },
      { name: '吨 (t)', ratio: 1000 },
      { name: '磅 (lb)', ratio: 0.45359237 }
    ]
  },
  area: {
    name: '面积',
    units: [
      { name: '平方米 (m²)', ratio: 1 },
      { name: '平方厘米 (cm²)', ratio: 0.0001 },
      { name: '平方公里 (km²)', ratio: 1000000 },
      { name: '公顷 (ha)', ratio: 10000 },
      { name: '亩', ratio: 666.6666667 }
    ]
  }
};

Page({
  data: {
    types: [
      { id: 'length', name: '长度' },
      { id: 'weight', name: '重量' },
      { id: 'area', name: '面积' }
    ],
    activeType: 'length',
    currentUnits: [],
    fromUnitIndex: 0,
    toUnitIndex: 1,
    inputValue: '1',
    outputValue: '0',
    quickResults: []
  },

  onLoad() {
    this.updateUnits();
  },

  switchType(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ 
      activeType: id,
      fromUnitIndex: 0,
      toUnitIndex: 1
    }, () => {
      this.updateUnits();
    });
  },

  updateUnits() {
    const units = unitData[this.data.activeType].units;
    this.setData({ currentUnits: units }, () => {
      this.calculate();
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value }, () => {
      this.calculate();
    });
  },

  onFromUnitChange(e) {
    this.setData({ fromUnitIndex: e.detail.value }, () => {
      this.calculate();
    });
  },

  onToUnitChange(e) {
    this.setData({ toUnitIndex: e.detail.value }, () => {
      this.calculate();
    });
  },

  calculate() {
    const { inputValue, currentUnits, fromUnitIndex, toUnitIndex } = this.data;
    const val = parseFloat(inputValue);
    if (isNaN(val)) {
      this.setData({ outputValue: '0', quickResults: [] });
      return;
    }

    const fromUnit = currentUnits[fromUnitIndex];
    const toUnit = currentUnits[toUnitIndex];
    
    // 统一转为基准单位再转为目标单位
    const baseValue = val * fromUnit.ratio;
    const result = baseValue / toUnit.ratio;

    // 计算快捷列表
    const quickResults = currentUnits
      .filter((_, index) => index !== fromUnitIndex)
      .map(unit => ({
        name: unit.name,
        value: this.formatNumber(baseValue / unit.ratio),
        unit: ''
      }));

    this.setData({
      outputValue: this.formatNumber(result),
      quickResults
    });
  },

  formatNumber(num) {
    if (num === 0) return '0';
    if (Math.abs(num) < 0.000001) return num.toExponential(4);
    const str = num.toFixed(6);
    return parseFloat(str).toString(); // 去除末尾多余的0
  }
});