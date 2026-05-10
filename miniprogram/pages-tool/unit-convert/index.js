const unitData = {
  length: {
    name: '长度',
    keywords: ['距离', '路程', '尺寸'],
    units: [
      { name: '米 (m)', symbol: 'm', ratio: 1 },
      { name: '千米 (km)', symbol: 'km', ratio: 1000 },
      { name: '分米 (dm)', symbol: 'dm', ratio: 0.1 },
      { name: '厘米 (cm)', symbol: 'cm', ratio: 0.01 },
      { name: '毫米 (mm)', symbol: 'mm', ratio: 0.001 },
      { name: '微米 (μm)', symbol: 'μm', ratio: 0.000001 },
      { name: '纳米 (nm)', symbol: 'nm', ratio: 1e-9 },
      { name: '英里 (mi)', symbol: 'mi', ratio: 1609.344 },
      { name: '码 (yd)', symbol: 'yd', ratio: 0.9144 },
      { name: '英尺 (ft)', symbol: 'ft', ratio: 0.3048 },
      { name: '英寸 (in)', symbol: 'in', ratio: 0.0254 },
      { name: '海里 (nmi)', symbol: 'nmi', ratio: 1852 }
    ]
  },
  area: {
    name: '面积',
    keywords: ['地面', '平方'],
    units: [
      { name: '平方米 (m²)', symbol: 'm²', ratio: 1 },
      { name: '平方千米 (km²)', symbol: 'km²', ratio: 1000000 },
      { name: '平方厘米 (cm²)', symbol: 'cm²', ratio: 0.0001 },
      { name: '平方毫米 (mm²)', symbol: 'mm²', ratio: 0.000001 },
      { name: '公顷 (ha)', symbol: 'ha', ratio: 10000 },
      { name: '亩', symbol: '亩', ratio: 666.6666667 },
      { name: '平方英里 (mi²)', symbol: 'mi²', ratio: 2589988.110336 },
      { name: '英亩 (acre)', symbol: 'acre', ratio: 4046.8564224 },
      { name: '平方码 (yd²)', symbol: 'yd²', ratio: 0.83612736 },
      { name: '平方英尺 (ft²)', symbol: 'ft²', ratio: 0.09290304 },
      { name: '平方英寸 (in²)', symbol: 'in²', ratio: 0.00064516 }
    ]
  },
  volume: {
    name: '体积',
    keywords: ['容积', '容量'],
    units: [
      { name: '立方米 (m³)', symbol: 'm³', ratio: 1 },
      { name: '升 (L)', symbol: 'L', ratio: 0.001 },
      { name: '毫升 (mL)', symbol: 'mL', ratio: 0.000001 },
      { name: '立方厘米 (cm³)', symbol: 'cm³', ratio: 0.000001 },
      { name: '立方分米 (dm³)', symbol: 'dm³', ratio: 0.001 },
      { name: '立方英尺 (ft³)', symbol: 'ft³', ratio: 0.028316846592 },
      { name: '立方英寸 (in³)', symbol: 'in³', ratio: 0.000016387064 },
      { name: '加仑(美) (gal)', symbol: 'gal', ratio: 0.003785411784 },
      { name: '夸脱(美) (qt)', symbol: 'qt', ratio: 0.000946352946 },
      { name: '品脱(美) (pt)', symbol: 'pt', ratio: 0.000473176473 },
      { name: '液体盎司(美) (fl oz)', symbol: 'fl oz', ratio: 0.0000295735295625 }
    ]
  },
  angle: {
    name: '角度',
    keywords: ['方向', '旋转角'],
    units: [
      { name: '弧度 (rad)', symbol: 'rad', ratio: 1 },
      { name: '角度 (°)', symbol: '°', ratio: 0.017453292519943295 },
      { name: '分 (′)', symbol: '′', ratio: 0.0002908882086657216 },
      { name: '秒 (″)', symbol: '″', ratio: 0.00000484813681109536 },
      { name: '圆周 (turn)', symbol: 'turn', ratio: 6.283185307179586 },
      { name: '梯度 (gon)', symbol: 'gon', ratio: 0.015707963267948967 }
    ]
  },
  speed: {
    name: '速度',
    keywords: ['车速', '速率'],
    units: [
      { name: '米/秒 (m/s)', symbol: 'm/s', ratio: 1 },
      { name: '千米/时 (km/h)', symbol: 'km/h', ratio: 0.2777777778 },
      { name: '英里/时 (mph)', symbol: 'mph', ratio: 0.44704 },
      { name: '节 (kn)', symbol: 'kn', ratio: 0.5144444444 },
      { name: '英尺/秒 (ft/s)', symbol: 'ft/s', ratio: 0.3048 },
      { name: '厘米/秒 (cm/s)', symbol: 'cm/s', ratio: 0.01 }
    ]
  },
  acceleration: {
    name: '加速度',
    keywords: ['重力加速度'],
    units: [
      { name: '米/秒² (m/s²)', symbol: 'm/s²', ratio: 1 },
      { name: '厘米/秒² (cm/s²)', symbol: 'cm/s²', ratio: 0.01 },
      { name: '英尺/秒² (ft/s²)', symbol: 'ft/s²', ratio: 0.3048 },
      { name: '标准重力 (g)', symbol: 'g', ratio: 9.80665 },
      { name: '伽 (Gal)', symbol: 'Gal', ratio: 0.01 }
    ]
  },
  time: {
    name: '时间',
    keywords: ['时长', '周期'],
    units: [
      { name: '秒 (s)', symbol: 's', ratio: 1 },
      { name: '毫秒 (ms)', symbol: 'ms', ratio: 0.001 },
      { name: '微秒 (μs)', symbol: 'μs', ratio: 0.000001 },
      { name: '纳秒 (ns)', symbol: 'ns', ratio: 1e-9 },
      { name: '分钟 (min)', symbol: 'min', ratio: 60 },
      { name: '小时 (h)', symbol: 'h', ratio: 3600 },
      { name: '天 (d)', symbol: 'd', ratio: 86400 },
      { name: '周 (wk)', symbol: 'wk', ratio: 604800 },
      { name: '月 (30天)', symbol: 'mo', ratio: 2592000 },
      { name: '年 (365天)', symbol: 'yr', ratio: 31536000 }
    ]
  },
  frequency: {
    name: '频率',
    keywords: ['转速', '赫兹'],
    units: [
      { name: '赫兹 (Hz)', symbol: 'Hz', ratio: 1 },
      { name: '千赫 (kHz)', symbol: 'kHz', ratio: 1000 },
      { name: '兆赫 (MHz)', symbol: 'MHz', ratio: 1000000 },
      { name: '吉赫 (GHz)', symbol: 'GHz', ratio: 1000000000 },
      { name: '转/分 (rpm)', symbol: 'rpm', ratio: 0.016666666666666666 }
    ]
  },
  mass: {
    name: '质量',
    keywords: ['重量', '体重'],
    units: [
      { name: '千克 (kg)', symbol: 'kg', ratio: 1 },
      { name: '吨 (t)', symbol: 't', ratio: 1000 },
      { name: '克 (g)', symbol: 'g', ratio: 0.001 },
      { name: '毫克 (mg)', symbol: 'mg', ratio: 0.000001 },
      { name: '微克 (μg)', symbol: 'μg', ratio: 1e-9 },
      { name: '磅 (lb)', symbol: 'lb', ratio: 0.45359237 },
      { name: '盎司 (oz)', symbol: 'oz', ratio: 0.028349523125 },
      { name: '英石 (st)', symbol: 'st', ratio: 6.35029318 },
      { name: '短吨(美) (short ton)', symbol: 'short ton', ratio: 907.18474 },
      { name: '长吨(英) (long ton)', symbol: 'long ton', ratio: 1016.0469088 }
    ]
  },
  density: {
    name: '密度',
    keywords: ['比重'],
    units: [
      { name: '千克/立方米 (kg/m³)', symbol: 'kg/m³', ratio: 1 },
      { name: '克/立方厘米 (g/cm³)', symbol: 'g/cm³', ratio: 1000 },
      { name: '克/升 (g/L)', symbol: 'g/L', ratio: 1 },
      { name: '千克/升 (kg/L)', symbol: 'kg/L', ratio: 1000 },
      { name: '磅/立方英尺 (lb/ft³)', symbol: 'lb/ft³', ratio: 16.01846337 }
    ]
  },
  force: {
    name: '力',
    keywords: ['推力', '拉力'],
    units: [
      { name: '牛顿 (N)', symbol: 'N', ratio: 1 },
      { name: '千牛 (kN)', symbol: 'kN', ratio: 1000 },
      { name: '达因 (dyn)', symbol: 'dyn', ratio: 0.00001 },
      { name: '千克力 (kgf)', symbol: 'kgf', ratio: 9.80665 },
      { name: '磅力 (lbf)', symbol: 'lbf', ratio: 4.4482216152605 }
    ]
  },
  pressure: {
    name: '压力',
    keywords: ['气压', '胎压'],
    units: [
      { name: '帕斯卡 (Pa)', symbol: 'Pa', ratio: 1 },
      { name: '千帕 (kPa)', symbol: 'kPa', ratio: 1000 },
      { name: '兆帕 (MPa)', symbol: 'MPa', ratio: 1000000 },
      { name: '巴 (bar)', symbol: 'bar', ratio: 100000 },
      { name: '标准大气压 (atm)', symbol: 'atm', ratio: 101325 },
      { name: '托 (Torr)', symbol: 'Torr', ratio: 133.3223684211 },
      { name: '毫米汞柱 (mmHg)', symbol: 'mmHg', ratio: 133.322387415 },
      { name: '磅力/平方英寸 (psi)', symbol: 'psi', ratio: 6894.757293168 }
    ]
  },
  temperature: {
    name: '温度',
    mode: 'temperature',
    keywords: ['气温', '体温'],
    units: [
      { name: '摄氏度 (°C)', symbol: '°C', key: 'C' },
      { name: '华氏度 (°F)', symbol: '°F', key: 'F' },
      { name: '开尔文 (K)', symbol: 'K', key: 'K' },
      { name: '兰氏度 (°R)', symbol: '°R', key: 'R' }
    ]
  },
  energy: {
    name: '能量',
    keywords: ['热量', '功'],
    units: [
      { name: '焦耳 (J)', symbol: 'J', ratio: 1 },
      { name: '千焦 (kJ)', symbol: 'kJ', ratio: 1000 },
      { name: '卡路里 (cal)', symbol: 'cal', ratio: 4.184 },
      { name: '千卡 (kcal)', symbol: 'kcal', ratio: 4184 },
      { name: '瓦时 (Wh)', symbol: 'Wh', ratio: 3600 },
      { name: '千瓦时 (kWh)', symbol: 'kWh', ratio: 3600000 },
      { name: '电子伏特 (eV)', symbol: 'eV', ratio: 1.602176634e-19 },
      { name: '英热单位 (BTU)', symbol: 'BTU', ratio: 1055.05585262 }
    ]
  },
  power: {
    name: '功率',
    keywords: ['电功率', '输出功率'],
    units: [
      { name: '瓦 (W)', symbol: 'W', ratio: 1 },
      { name: '千瓦 (kW)', symbol: 'kW', ratio: 1000 },
      { name: '兆瓦 (MW)', symbol: 'MW', ratio: 1000000 },
      { name: '毫瓦 (mW)', symbol: 'mW', ratio: 0.001 },
      { name: '马力(公制) (PS)', symbol: 'PS', ratio: 735.49875 },
      { name: '马力(英制) (hp)', symbol: 'hp', ratio: 745.699871582 }
    ]
  },
  flowRate: {
    name: '流量',
    keywords: ['流速', '排量'],
    units: [
      { name: '立方米/秒 (m³/s)', symbol: 'm³/s', ratio: 1 },
      { name: '立方米/小时 (m³/h)', symbol: 'm³/h', ratio: 1 / 3600 },
      { name: '升/秒 (L/s)', symbol: 'L/s', ratio: 0.001 },
      { name: '升/分 (L/min)', symbol: 'L/min', ratio: 0.001 / 60 },
      { name: '升/小时 (L/h)', symbol: 'L/h', ratio: 0.001 / 3600 },
      { name: '加仑(美)/分 (gpm)', symbol: 'gpm', ratio: 0.003785411784 / 60 }
    ]
  },
  viscosity: {
    name: '黏度(动力)',
    keywords: ['粘度'],
    units: [
      { name: '帕·秒 (Pa·s)', symbol: 'Pa·s', ratio: 1 },
      { name: '毫帕·秒 (mPa·s)', symbol: 'mPa·s', ratio: 0.001 },
      { name: '微帕·秒 (μPa·s)', symbol: 'μPa·s', ratio: 0.000001 },
      { name: '泊 (P)', symbol: 'P', ratio: 0.1 },
      { name: '厘泊 (cP)', symbol: 'cP', ratio: 0.001 }
    ]
  },
  voltage: {
    name: '电压',
    keywords: ['伏特'],
    units: [
      { name: '伏特 (V)', symbol: 'V', ratio: 1 },
      { name: '千伏 (kV)', symbol: 'kV', ratio: 1000 },
      { name: '毫伏 (mV)', symbol: 'mV', ratio: 0.001 },
      { name: '微伏 (μV)', symbol: 'μV', ratio: 0.000001 }
    ]
  },
  current: {
    name: '电流',
    keywords: ['安培'],
    units: [
      { name: '安培 (A)', symbol: 'A', ratio: 1 },
      { name: '千安 (kA)', symbol: 'kA', ratio: 1000 },
      { name: '毫安 (mA)', symbol: 'mA', ratio: 0.001 },
      { name: '微安 (μA)', symbol: 'μA', ratio: 0.000001 }
    ]
  },
  resistance: {
    name: '电阻',
    keywords: ['欧姆'],
    units: [
      { name: '欧姆 (Ω)', symbol: 'Ω', ratio: 1 },
      { name: '千欧 (kΩ)', symbol: 'kΩ', ratio: 1000 },
      { name: '兆欧 (MΩ)', symbol: 'MΩ', ratio: 1000000 },
      { name: '毫欧 (mΩ)', symbol: 'mΩ', ratio: 0.001 }
    ]
  },
  capacitance: {
    name: '电容',
    keywords: ['法拉'],
    units: [
      { name: '法拉 (F)', symbol: 'F', ratio: 1 },
      { name: '毫法 (mF)', symbol: 'mF', ratio: 0.001 },
      { name: '微法 (μF)', symbol: 'μF', ratio: 0.000001 },
      { name: '纳法 (nF)', symbol: 'nF', ratio: 1e-9 },
      { name: '皮法 (pF)', symbol: 'pF', ratio: 1e-12 }
    ]
  },
  inductance: {
    name: '电感',
    keywords: ['亨利'],
    units: [
      { name: '亨利 (H)', symbol: 'H', ratio: 1 },
      { name: '毫亨 (mH)', symbol: 'mH', ratio: 0.001 },
      { name: '微亨 (μH)', symbol: 'μH', ratio: 0.000001 }
    ]
  },
  charge: {
    name: '电荷',
    keywords: ['库仑'],
    units: [
      { name: '库仑 (C)', symbol: 'C', ratio: 1 },
      { name: '毫库仑 (mC)', symbol: 'mC', ratio: 0.001 },
      { name: '微库仑 (μC)', symbol: 'μC', ratio: 0.000001 },
      { name: '安时 (Ah)', symbol: 'Ah', ratio: 3600 },
      { name: '毫安时 (mAh)', symbol: 'mAh', ratio: 3.6 }
    ]
  },
  amountSubstance: {
    name: '物质的量',
    keywords: ['摩尔'],
    units: [
      { name: '摩尔 (mol)', symbol: 'mol', ratio: 1 },
      { name: '毫摩尔 (mmol)', symbol: 'mmol', ratio: 0.001 },
      { name: '微摩尔 (μmol)', symbol: 'μmol', ratio: 0.000001 },
      { name: '千摩尔 (kmol)', symbol: 'kmol', ratio: 1000 }
    ]
  },
  concentrationMass: {
    name: '质量浓度',
    keywords: ['浓度', 'ppm'],
    units: [
      { name: '克/立方米 (g/m³)', symbol: 'g/m³', ratio: 1 },
      { name: '毫克/升 (mg/L)', symbol: 'mg/L', ratio: 1 },
      { name: '克/升 (g/L)', symbol: 'g/L', ratio: 1000 },
      { name: '千克/立方米 (kg/m³)', symbol: 'kg/m³', ratio: 1000 },
      { name: '微克/升 (μg/L)', symbol: 'μg/L', ratio: 0.001 },
      { name: 'ppm (近似水溶液)', symbol: 'ppm', ratio: 1 }
    ]
  },
  radioactivity: {
    name: '放射性活度',
    keywords: ['贝可勒尔', '居里'],
    units: [
      { name: '贝可勒尔 (Bq)', symbol: 'Bq', ratio: 1 },
      { name: '千贝可勒尔 (kBq)', symbol: 'kBq', ratio: 1000 },
      { name: '兆贝可勒尔 (MBq)', symbol: 'MBq', ratio: 1000000 },
      { name: '居里 (Ci)', symbol: 'Ci', ratio: 37000000000 },
      { name: '毫居里 (mCi)', symbol: 'mCi', ratio: 37000000 },
      { name: '微居里 (μCi)', symbol: 'μCi', ratio: 37000 }
    ]
  },
  data: {
    name: '数据存储',
    keywords: ['容量', '字节'],
    units: [
      { name: '比特 (b)', symbol: 'b', ratio: 1 },
      { name: '字节 (B)', symbol: 'B', ratio: 8 },
      { name: '千字节 (KB)', symbol: 'KB', ratio: 8192 },
      { name: '兆字节 (MB)', symbol: 'MB', ratio: 8388608 },
      { name: '吉字节 (GB)', symbol: 'GB', ratio: 8589934592 },
      { name: '太字节 (TB)', symbol: 'TB', ratio: 8796093022208 },
      { name: '千比特 (Kb)', symbol: 'Kb', ratio: 1000 },
      { name: '兆比特 (Mb)', symbol: 'Mb', ratio: 1000000 },
      { name: '吉比特 (Gb)', symbol: 'Gb', ratio: 1000000000 }
    ]
  },
  dataRate: {
    name: '数据速率',
    keywords: ['网速', '带宽'],
    units: [
      { name: '比特/秒 (bps)', symbol: 'bps', ratio: 1 },
      { name: '千比特/秒 (Kbps)', symbol: 'Kbps', ratio: 1000 },
      { name: '兆比特/秒 (Mbps)', symbol: 'Mbps', ratio: 1000000 },
      { name: '吉比特/秒 (Gbps)', symbol: 'Gbps', ratio: 1000000000 },
      { name: '字节/秒 (B/s)', symbol: 'B/s', ratio: 8 },
      { name: '千字节/秒 (KB/s)', symbol: 'KB/s', ratio: 8192 },
      { name: '兆字节/秒 (MB/s)', symbol: 'MB/s', ratio: 8388608 }
    ]
  },
  fuelConsumption: {
    name: '油耗',
    mode: 'fuel',
    keywords: ['百公里油耗', 'mpg'],
    units: [
      { name: '升/百公里 (L/100km)', symbol: 'L/100km', key: 'L100KM' },
      { name: '公里/升 (km/L)', symbol: 'km/L', key: 'KML' },
      { name: '英里/加仑(美) (mpg US)', symbol: 'mpg US', key: 'MPG_US' },
      { name: '英里/加仑(英) (mpg UK)', symbol: 'mpg UK', key: 'MPG_UK' }
    ]
  },
  cookingVolume: {
    name: '烹饪容量',
    keywords: ['茶匙', '汤匙', '杯'],
    units: [
      { name: '毫升 (mL)', symbol: 'mL', ratio: 1 },
      { name: '升 (L)', symbol: 'L', ratio: 1000 },
      { name: '茶匙 (tsp)', symbol: 'tsp', ratio: 4.92892159375 },
      { name: '汤匙 (tbsp)', symbol: 'tbsp', ratio: 14.78676478125 },
      { name: '杯(美) (cup)', symbol: 'cup', ratio: 236.5882365 },
      { name: '液体盎司(美) (fl oz)', symbol: 'fl oz', ratio: 29.5735295625 }
    ]
  },
  torque: {
    name: '扭矩',
    keywords: ['力矩', '牛米'],
    units: [
      { name: '牛·米 (N·m)', symbol: 'N·m', ratio: 1 },
      { name: '千牛·米 (kN·m)', symbol: 'kN·m', ratio: 1000 },
      { name: '磅·英尺 (lb·ft)', symbol: 'lb·ft', ratio: 1.3558179483314 },
      { name: '磅·英寸 (lb·in)', symbol: 'lb·in', ratio: 0.11298482902762 },
      { name: '千克力·米 (kgf·m)', symbol: 'kgf·m', ratio: 9.80665 }
    ]
  }
};

const groupDefinitions = [
  { id: 'geo', name: '几何', typeIds: ['length', 'area', 'volume', 'angle'] },
  { id: 'motion', name: '时空运动', typeIds: ['speed', 'acceleration', 'time', 'frequency', 'torque'] },
  { id: 'fluid', name: '力热流体', typeIds: ['mass', 'density', 'force', 'pressure', 'temperature', 'flowRate', 'viscosity', 'energy', 'power'] },
  { id: 'electrical', name: '电学电子', typeIds: ['voltage', 'current', 'resistance', 'capacitance', 'inductance', 'charge'] },
  { id: 'chemical', name: '材料化工', typeIds: ['amountSubstance', 'concentrationMass', 'radioactivity', 'density', 'temperature'] },
  { id: 'digital', name: '信息数字', typeIds: ['data', 'dataRate'] },
  { id: 'daily', name: '生活常用', typeIds: ['fuelConsumption', 'cookingVolume', 'temperature', 'mass', 'length'] },
  { id: 'engineering', name: '工程计量', typeIds: ['pressure', 'flowRate', 'torque', 'power', 'energy', 'viscosity'] }
];

const quickTypeAliasMap = {
  weight: 'mass',
  heat: 'energy'
};

const quickTypeGroupMap = {
  length: 'geo',
  area: 'geo',
  mass: 'fluid',
  time: 'motion',
  temperature: 'fluid',
  pressure: 'fluid',
  energy: 'fluid',
  power: 'fluid'
};

function getTypeMeta(typeId) {
  return unitData[typeId] || null;
}


Page({
  data: {
    groups: [],
    activeGroup: 'geo',
    types: [],
    activeType: 'length',
    activeTypeName: '',
    searchKeyword: '',
    currentUnits: [],
    fromUnitIndex: 0,
    toUnitIndex: 1,
    inputValue: '1',
    outputValue: '0',
    quickResults: []
  },

  onLoad(options = {}) {
    const groups = groupDefinitions.map((group) => ({ id: group.id, name: group.name }));
    const requestedType = quickTypeAliasMap[options.type] || options.type;
    const preferredType = unitData[requestedType] ? requestedType : '';
    const activeGroup = quickTypeGroupMap[preferredType] || this.data.activeGroup;
    const activeType = preferredType || this.data.activeType;

    this.setData({ groups, activeGroup, activeType }, () => {
      this.updateTypesForGroup(preferredType);
    });
  },

  switchGroup(e) {
    const groupId = e.currentTarget.dataset.id;
    this.setData({
      activeGroup: groupId,
      fromUnitIndex: 0,
      toUnitIndex: 1,
      searchKeyword: ''
    }, () => {
      this.updateTypesForGroup();
    });
  },

  onSearchTypeInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' }, () => {
      this.updateTypesForGroup();
    });
  },

  updateTypesForGroup(preferredTypeId = '') {
    const group = groupDefinitions.find((item) => item.id === this.data.activeGroup);
    if (!group) return;

    const keyword = (this.data.searchKeyword || '').trim().toLowerCase();
    const filteredIds = group.typeIds.filter((typeId) => {
      const type = getTypeMeta(typeId);
      if (!type) return false;
      if (!keyword) return true;
      const keywordHit = type.name.toLowerCase().includes(keyword);
      const aliasHit = (type.keywords || []).some((item) => item.toLowerCase().includes(keyword));
      return keywordHit || aliasHit;
    });

    const types = filteredIds.map((typeId) => ({ id: typeId, name: unitData[typeId].name }));
    let activeType = preferredTypeId || this.data.activeType;
    if (!filteredIds.includes(activeType)) {
      activeType = filteredIds.length ? filteredIds[0] : '';
    }

    this.setData({ types, activeType }, () => {
      this.refreshActiveTypeState();
      this.updateUnits();
    });
  },

  switchType(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      activeType: id,
      fromUnitIndex: 0,
      toUnitIndex: 1
    }, () => {
      this.refreshActiveTypeState();
      this.updateUnits();
    });
  },


  refreshActiveTypeState() {
    const type = getTypeMeta(this.data.activeType);
    this.setData({
      activeTypeName: type ? type.name : ''
    });
  },

  updateUnits() {
    if (!this.data.activeType || !unitData[this.data.activeType]) {
      this.setData({ currentUnits: [], outputValue: '0', quickResults: [] });
      return;
    }
    const units = unitData[this.data.activeType].units;
    const toUnitIndex = units.length > 1 ? 1 : 0;
    this.setData({ currentUnits: units, toUnitIndex }, () => {
      this.calculate();
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value }, () => {
      this.calculate();
    });
  },

  onFromUnitChange(e) {
    this.setData({ fromUnitIndex: Number(e.detail.value) }, () => {
      this.calculate();
    });
  },

  onToUnitChange(e) {
    this.setData({ toUnitIndex: Number(e.detail.value) }, () => {
      this.calculate();
    });
  },

  calculate() {
    const { inputValue, currentUnits, fromUnitIndex, toUnitIndex, activeType } = this.data;
    const val = parseFloat(inputValue);
    if (isNaN(val) || !currentUnits.length || !unitData[activeType]) {
      this.setData({ outputValue: '0', quickResults: [] });
      return;
    }

    const fromUnit = currentUnits[fromUnitIndex];
    const toUnit = currentUnits[toUnitIndex];

    let result = 0;
    let quickResults = [];

    if (unitData[activeType].mode === 'temperature') {
      result = this.convertTemperature(val, fromUnit.key, toUnit.key);
      quickResults = currentUnits
        .filter((_, index) => index !== fromUnitIndex)
        .map((unit) => ({
          name: unit.name,
          value: this.formatNumber(this.convertTemperature(val, fromUnit.key, unit.key)),
          unit: unit.symbol || ''
        }));
    } else if (unitData[activeType].mode === 'fuel') {
      result = this.convertFuelConsumption(val, fromUnit.key, toUnit.key);
      quickResults = currentUnits
        .filter((_, index) => index !== fromUnitIndex)
        .map((unit) => ({
          name: unit.name,
          value: this.formatNumber(this.convertFuelConsumption(val, fromUnit.key, unit.key)),
          unit: unit.symbol || ''
        }));
    } else {
      const baseValue = val * fromUnit.ratio;
      result = baseValue / toUnit.ratio;
      quickResults = currentUnits
        .filter((_, index) => index !== fromUnitIndex)
        .map((unit) => ({
          name: unit.name,
          value: this.formatNumber(baseValue / unit.ratio),
          unit: unit.symbol || ''
        }));
    }

    this.setData({
      outputValue: this.formatNumber(result),
      quickResults: quickResults.slice(0, 10)
    });
  },

  convertTemperature(value, from, to) {
    let celsius = 0;
    if (from === 'C') celsius = value;
    else if (from === 'F') celsius = (value - 32) * 5 / 9;
    else if (from === 'K') celsius = value - 273.15;
    else if (from === 'R') celsius = (value - 491.67) * 5 / 9;

    if (to === 'C') return celsius;
    if (to === 'F') return celsius * 9 / 5 + 32;
    if (to === 'K') return celsius + 273.15;
    if (to === 'R') return (celsius + 273.15) * 9 / 5;
    return value;
  },

  convertFuelConsumption(value, from, to) {
    const safeValue = Number(value);
    if (!Number.isFinite(safeValue)) return 0;

    let l100km = 0;
    if (from === 'L100KM') l100km = safeValue;
    else if (from === 'KML') l100km = safeValue > 0 ? 100 / safeValue : Infinity;
    else if (from === 'MPG_US') l100km = safeValue > 0 ? 235.214583 / safeValue : Infinity;
    else if (from === 'MPG_UK') l100km = safeValue > 0 ? 282.480936 / safeValue : Infinity;

    if (to === 'L100KM') return l100km;
    if (to === 'KML') return l100km > 0 ? 100 / l100km : Infinity;
    if (to === 'MPG_US') return l100km > 0 ? 235.214583 / l100km : Infinity;
    if (to === 'MPG_UK') return l100km > 0 ? 282.480936 / l100km : Infinity;
    return safeValue;
  },

  formatNumber(num) {
    if (Number.isNaN(num)) return '0';
    if (!Number.isFinite(num)) return '∞';
    if (num === 0) return '0';
    if (Math.abs(num) < 0.000001 || Math.abs(num) >= 1e12) return num.toExponential(6);
    const str = num.toFixed(10);
    return parseFloat(str).toString();
  }
});
