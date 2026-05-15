const { copyText, filterItems } = require('../utils/tool-common.js')

const FORMULAS = [
  { id: 'mech-uniform', category: '力学', name: '匀速直线运动', formula: 's = vt', units: 's：m，v：m/s，t：s', variables: 's 为位移或路程，v 为恒定速度，t 为时间', tip: '常见于无加速度、速度恒定、追及相遇的基础题' },
  { id: 'mech-acc-speed', category: '力学', name: '匀变速速度', formula: 'v = v₀ + at', units: 'v、v₀：m/s，a：m/s²，t：s', variables: 'v₀ 初速度，a 加速度，t 运动时间', tip: '先判断加速度方向，刹车题要检查是否已停下' },
  { id: 'mech-acc-displacement', category: '力学', name: '匀变速位移', formula: 's = v₀t + at²/2', units: 's：m，v₀：m/s，a：m/s²，t：s', variables: 's 位移，v₀ 初速度，a 加速度', tip: '适合已知时间求位移，方向统一后代入' },
  { id: 'mech-acc-no-time', category: '力学', name: '无时速度位移', formula: 'v² - v₀² = 2as', units: 'v、v₀：m/s，a：m/s²，s：m', variables: '连接速度、加速度和位移，不含时间', tip: '题目没有时间或要求刹车距离时常用' },
  { id: 'mech-average-speed', category: '力学', name: '平均速度', formula: 'v̄ = Δx / Δt', units: 'v̄：m/s，Δx：m，Δt：s', variables: 'Δx 位移变化，Δt 时间间隔', tip: '注意平均速度是位移除以时间，不等于平均速率' },
  { id: 'mech-newton2', category: '力学', name: '牛顿第二定律', formula: 'F = ma', units: 'F：N，m：kg，a：m/s²', variables: 'F 为合外力，m 为质量，a 为加速度', tip: '受力分析后取合力，连接力学和运动学公式' },
  { id: 'mech-gravity', category: '力学', name: '重力', formula: 'G = mg', units: 'G：N，m：kg，g：m/s²', variables: 'g 常取 9.8 m/s² 或 10 m/s²', tip: '重力方向竖直向下，和质量不同' },
  { id: 'mech-friction', category: '力学', name: '滑动摩擦力', formula: 'f = μN', units: 'f、N：N，μ：无量纲', variables: 'μ 动摩擦因数，N 正压力', tip: '方向与相对运动方向相反，先判断正压力' },
  { id: 'mech-hooke', category: '力学', name: '胡克定律', formula: 'F = kx', units: 'F：N，k：N/m，x：m', variables: 'k 劲度系数，x 形变量', tip: '弹簧在弹性限度内使用，方向指向恢复原状' },
  { id: 'mech-centripetal', category: '力学', name: '向心力', formula: 'F = mv²/r = mω²r', units: 'F：N，m：kg，v：m/s，r：m，ω：rad/s', variables: 'r 半径，ω 角速度', tip: '向心力是合力效果，不是额外一种力' },
  { id: 'mech-circular', category: '力学', name: '圆周运动关系', formula: 'v = ωr，ω = 2π/T = 2πf', units: 'v：m/s，ω：rad/s，r：m，T：s，f：Hz', variables: 'T 周期，f 频率', tip: '转盘、卫星、竖直圆周运动常用' },
  { id: 'mech-momentum', category: '力学', name: '动量', formula: 'p = mv', units: 'p：kg·m/s，m：kg，v：m/s', variables: 'p 为动量，方向与速度相同', tip: '碰撞、爆炸、反冲问题先看系统动量守恒' },
  { id: 'mech-impulse', category: '力学', name: '冲量定理', formula: 'I = Ft = Δp', units: 'I：N·s，F：N，t：s，p：kg·m/s', variables: 'I 冲量，Δp 动量变化', tip: '变力可用力-时间图像面积表示冲量' },
  { id: 'mech-energy', category: '力学', name: '动能', formula: 'Eₖ = mv² / 2', units: 'Eₖ：J，m：kg，v：m/s', variables: 'm 为质量，v 为速度大小', tip: '适合功-能关系、碰撞前后能量判断题' },
  { id: 'mech-potential', category: '力学', name: '重力势能', formula: 'Eₚ = mgh', units: 'Eₚ：J，m：kg，g：m/s²，h：m', variables: 'h 为相对参考面的高度', tip: '参考面不同势能值不同，势能变化有意义' },
  { id: 'mech-work', category: '力学', name: '功', formula: 'W = Fscosθ', units: 'W：J，F：N，s：m', variables: 'θ 为力与位移夹角', tip: '正功加速，负功减速，垂直不做功' },
  { id: 'mech-power', category: '力学', name: '功率', formula: 'P = W/t = Fv', units: 'P：W，W：J，t：s，F：N，v：m/s', variables: 'Fv 适用于力与速度同向的瞬时功率', tip: '汽车启动、机械效率题常用' },
  { id: 'mech-energy-conservation', category: '力学', name: '机械能守恒', formula: 'Eₖ₁ + Eₚ₁ = Eₖ₂ + Eₚ₂', units: '能量单位：J', variables: '只受重力或弹力做功时适用', tip: '先判断是否有摩擦、阻力或外力做功' },
  { id: 'mech-density', category: '力学', name: '密度', formula: 'ρ = m / V', units: 'ρ：kg/m³，m：kg，V：m³', variables: 'ρ 密度，m 质量，V 体积', tip: '浮力、压强、材料辨识常用' },
  { id: 'fluid-pressure', category: '流体', name: '压强', formula: 'p = F / S', units: 'p：Pa，F：N，S：m²', variables: 'F 压力，S 受力面积', tip: '固体压强与受力面积有关，注意单位换算' },
  { id: 'fluid-liquid-pressure', category: '流体', name: '液体压强', formula: 'p = ρgh', units: 'p：Pa，ρ：kg/m³，g：m/s²，h：m', variables: 'h 为液面到该点的深度', tip: '只与深度、密度有关，与容器形状无关' },
  { id: 'fluid-buoyancy', category: '流体', name: '阿基米德原理', formula: 'F浮 = ρ液gV排', units: 'F浮：N，ρ：kg/m³，V排：m³', variables: 'V排 为排开液体体积', tip: '漂浮时浮力等于重力，浸没时 V排 等于物体体积' },
  { id: 'fluid-continuity', category: '流体', name: '连续性方程', formula: 'A₁v₁ = A₂v₂', units: 'A：m²，v：m/s', variables: '适用于不可压缩稳定流', tip: '管道变窄流速增大' },
  { id: 'fluid-bernoulli', category: '流体', name: '伯努利方程', formula: 'p + ρgh + ρv²/2 = 常量', units: '各项单位均为 Pa 或 J/m³', variables: 'p 静压，ρgh 重力势能密度，ρv²/2 动能密度', tip: '流速大处压强小，用于喷雾、机翼等分析' },
  { id: 'heat-quantity', category: '热学', name: '吸放热公式', formula: 'Q = cmΔt', units: 'Q：J，c：J/(kg·℃)，m：kg，Δt：℃', variables: 'c 比热容，m 质量，Δt 温度变化量', tip: '热平衡题常用吸热量等于放热量' },
  { id: 'heat-latent', category: '热学', name: '物态变化热量', formula: 'Q = mL', units: 'Q：J，m：kg，L：J/kg', variables: 'L 为熔化热、汽化热等潜热', tip: '温度不变但状态改变时使用' },
  { id: 'heat-efficiency', category: '热学', name: '热机效率', formula: 'η = W / Q₁', units: 'η：无量纲或%，W、Q₁：J', variables: 'W 有用功，Q₁ 吸收热量', tip: '注意百分数换算，效率一定小于 100%' },
  { id: 'heat-first-law', category: '热学', name: '热力学第一定律', formula: 'ΔU = Q + W', units: 'ΔU、Q、W：J', variables: 'W 表示外界对系统做功时常取正', tip: '不同教材符号约定可能不同，先看题目定义' },
  { id: 'heat-ideal-gas', category: '热学', name: '理想气体状态方程', formula: 'pV = nRT', units: 'p：Pa，V：m³，n：mol，R：J/(mol·K)，T：K', variables: 'T 为热力学温度', tip: '气体状态变化题注意温度必须用 K' },
  { id: 'heat-gay-lussac', category: '热学', name: '查理/盖吕萨克定律', formula: 'V/T = 常量，p/T = 常量', units: 'V：m³，p：Pa，T：K', variables: '分别对应等压和等容过程', tip: '温度统一用开尔文，不能直接用摄氏度' },
  { id: 'electric-ohm', category: '电学', name: '欧姆定律', formula: 'I = U / R', units: 'I：A，U：V，R：Ω', variables: 'I 电流，U 电压，R 电阻', tip: '串并联电路计算的核心公式，注意适用纯电阻元件' },
  { id: 'electric-resistance', category: '电学', name: '电阻定律', formula: 'R = ρL / S', units: 'R：Ω，ρ：Ω·m，L：m，S：m²', variables: 'ρ 电阻率，L 长度，S 横截面积', tip: '导线越长电阻越大，横截面积越大电阻越小' },
  { id: 'electric-series', category: '电学', name: '串联电阻', formula: 'R = R₁ + R₂ + ...', units: 'R：Ω', variables: '多个电阻首尾相连', tip: '串联电流相等，总电压分配到各电阻' },
  { id: 'electric-parallel', category: '电学', name: '并联电阻', formula: '1/R = 1/R₁ + 1/R₂ + ...', units: 'R：Ω', variables: '多个电阻两端分别相连', tip: '并联电压相等，总电流等于支路电流之和' },
  { id: 'electric-power', category: '电学', name: '电功率', formula: 'P = UI = I²R = U²/R', units: 'P：W，U：V，I：A，R：Ω', variables: 'P 功率，U 电压，I 电流，R 电阻', tip: '根据已知量选择变形，额定功率题要区分实际电压' },
  { id: 'electric-work', category: '电学', name: '电功', formula: 'W = UIt = Pt', units: 'W：J 或 kW·h，U：V，I：A，t：s', variables: '1 kW·h = 3.6×10⁶ J', tip: '电能表、电费、用电量题常用' },
  { id: 'electric-joule', category: '电学', name: '焦耳定律', formula: 'Q = I²Rt', units: 'Q：J，I：A，R：Ω，t：s', variables: '电流通过电阻产生的热量', tip: '电热器、导线发热、电路安全题常用' },
  { id: 'electric-charge-current', category: '电学', name: '电流定义式', formula: 'I = Q / t', units: 'I：A，Q：C，t：s', variables: 'Q 电荷量，t 时间', tip: '电解、电量、电流微观解释常用' },
  { id: 'electric-cap', category: '电学', name: '电容定义式', formula: 'C = Q / U', units: 'C：F，Q：C，U：V', variables: 'C 电容，Q 电荷量，U 两端电压', tip: '电容器充放电、能量与板间场强题常用' },
  { id: 'electric-cap-parallel', category: '电学', name: '平行板电容器', formula: 'C = εS / d', units: 'C：F，ε：F/m，S：m²，d：m', variables: 'S 极板正对面积，d 板间距', tip: '距离越小、电容越大；插入介质电容增大' },
  { id: 'electric-field', category: '电场', name: '电场强度', formula: 'E = F / q', units: 'E：N/C 或 V/m，F：N，q：C', variables: 'q 为试探电荷', tip: '电场强度由场源决定，与试探电荷无关' },
  { id: 'electric-coulomb', category: '电场', name: '库仑定律', formula: 'F = kq₁q₂ / r²', units: 'F：N，q：C，r：m，k：N·m²/C²', variables: 'r 为两点电荷距离', tip: '同号相斥、异号相吸，注意矢量方向' },
  { id: 'electric-potential', category: '电场', name: '电势能与电势', formula: 'φ = Eₚ / q，UAB = φA - φB', units: 'φ、U：V，Eₚ：J，q：C', variables: 'φ 电势，UAB 电势差', tip: '电势是标量，沿电场线方向电势降低' },
  { id: 'electric-uniform-field', category: '电场', name: '匀强电场电势差', formula: 'U = Ed', units: 'U：V，E：V/m，d：m', variables: 'd 为沿电场方向距离', tip: '平行板电容器、带电粒子加速常用' },
  { id: 'electric-field-energy', category: '电场', name: '电容器能量', formula: 'E = CU²/2 = QU/2 = Q²/(2C)', units: 'E：J，C：F，U：V，Q：C', variables: '电容器储存的电场能', tip: '电容充放电和能量变化题常用' },
  { id: 'em-lorentz', category: '电磁学', name: '洛伦兹力', formula: 'F = qvBsinθ', units: 'F：N，q：C，v：m/s，B：T', variables: 'θ 为速度方向与磁场方向夹角', tip: '带电粒子在磁场中偏转，垂直时 sinθ=1' },
  { id: 'em-ampere', category: '电磁学', name: '安培力', formula: 'F = BILsinθ', units: 'F：N，B：T，I：A，L：m', variables: 'θ 为电流方向与磁场方向夹角', tip: '通电导线在磁场中受力，方向用左手定则' },
  { id: 'em-flux', category: '电磁学', name: '磁通量', formula: 'Φ = BScosθ', units: 'Φ：Wb，B：T，S：m²', variables: 'θ 为磁场与面积法线夹角', tip: '电磁感应题先判断磁通量是否变化' },
  { id: 'em-faraday', category: '电磁学', name: '法拉第电磁感应', formula: 'E = nΔΦ/Δt', units: 'E：V，Φ：Wb，t：s', variables: 'n 匝数，ΔΦ 磁通量变化量', tip: '线圈切割磁感线、磁通量变化产生感应电动势' },
  { id: 'em-motional-emf', category: '电磁学', name: '动生电动势', formula: 'E = BLv', units: 'E：V，B：T，L：m，v：m/s', variables: '导体棒垂直切割磁感线时适用', tip: '若不垂直，需要乘以对应夹角的正弦分量' },
  { id: 'em-self-induction', category: '电磁学', name: '自感电动势', formula: 'E = LΔI/Δt', units: 'E：V，L：H，I：A，t：s', variables: 'L 自感系数', tip: '线圈阻碍电流变化，通断电瞬间常考' },
  { id: 'em-transformer', category: '电磁学', name: '理想变压器', formula: 'U₁/U₂ = n₁/n₂，I₁/I₂ = n₂/n₁', units: 'U：V，I：A，n：匝数', variables: '下标 1 原线圈，2 副线圈', tip: '理想情况下输入功率等于输出功率' },
  { id: 'wave-speed', category: '波动', name: '波速公式', formula: 'v = λf = λ/T', units: 'v：m/s，λ：m，f：Hz，T：s', variables: 'λ 波长，f 频率，T 周期', tip: '机械波、电磁波基础题，频率由波源决定' },
  { id: 'wave-period', category: '波动', name: '周期频率', formula: 'f = 1/T', units: 'f：Hz，T：s', variables: 'f 频率，T 周期', tip: '振动图像、波形图读数题常先找周期' },
  { id: 'wave-simple-harmonic', category: '波动', name: '简谐运动', formula: 'x = Asin(ωt + φ)', units: 'x、A：m，ω：rad/s，t：s', variables: 'A 振幅，ω 角频率，φ 初相', tip: '弹簧振子、单摆小角度近似常用' },
  { id: 'wave-shm-period-spring', category: '波动', name: '弹簧振子周期', formula: 'T = 2π√(m/k)', units: 'T：s，m：kg，k：N/m', variables: 'm 质量，k 劲度系数', tip: '与振幅无关，适用于理想弹簧振子' },
  { id: 'wave-pendulum', category: '波动', name: '单摆周期', formula: 'T = 2π√(l/g)', units: 'T：s，l：m，g：m/s²', variables: 'l 摆长，g 重力加速度', tip: '小角度摆动时适用，与摆球质量无关' },
  { id: 'wave-intensity', category: '波动', name: '声强级', formula: 'L = 10lg(I/I₀)', units: 'L：dB，I、I₀：W/m²', variables: 'I₀ 为参考声强', tip: '分贝是对数量，声强增大 10 倍声强级增加 10 dB' },
  { id: 'optics-reflection', category: '光学', name: '反射定律', formula: 'θ入 = θ反', units: '角度单位：度或弧度', variables: '入射角和反射角均相对法线测量', tip: '镜面反射、平面镜成像基础' },
  { id: 'optics-refraction', category: '光学', name: '折射定律', formula: 'n₁sinθ₁ = n₂sinθ₂', units: 'n：无量纲，θ：度或弧度', variables: 'n₁、n₂ 为折射率，θ₁、θ₂ 为入射角和折射角', tip: '光路可逆，判断向法线靠近或远离' },
  { id: 'optics-critical', category: '光学', name: '全反射临界角', formula: 'sinC = n₂ / n₁，n₁ > n₂', units: 'C：角度，n：无量纲', variables: '光从光密介质射向光疏介质', tip: '入射角大于临界角发生全反射' },
  { id: 'optics-lens', category: '光学', name: '薄透镜成像', formula: '1/f = 1/u + 1/v', units: 'f、u、v：m 或 cm，统一单位', variables: 'f 焦距，u 物距，v 像距', tip: '凸透镜成像题要结合放大率和正倒虚实' },
  { id: 'optics-magnification', category: '光学', name: '透镜放大率', formula: 'm = v/u = h′/h', units: 'm：无量纲，u、v、h：同类单位', variables: 'h′ 像高，h 物高', tip: '判断放大缩小、实像虚像和方向' },
  { id: 'optics-photo-energy', category: '光学', name: '光子能量', formula: 'E = hν = hc/λ', units: 'E：J，h：J·s，ν：Hz，λ：m', variables: 'h 普朗克常量，c 光速', tip: '频率越高、波长越短，单个光子能量越大' },
  { id: 'atom-photoelectric', category: '原子物理', name: '光电效应方程', formula: 'hν = W₀ + Eₖ', units: 'hν、W₀、Eₖ：J 或 eV', variables: 'h 普朗克常量，ν 频率，W₀ 逸出功，Eₖ 最大初动能', tip: '判断截止频率、遏止电压和光强影响' },
  { id: 'atom-de-broglie', category: '原子物理', name: '德布罗意波长', formula: 'λ = h / p', units: 'λ：m，h：J·s，p：kg·m/s', variables: 'p 为粒子动量', tip: '微观粒子波粒二象性题常用' },
  { id: 'atom-bohr-radius', category: '原子物理', name: '玻尔轨道半径', formula: 'rₙ = n²r₁', units: 'r：m，n：正整数', variables: 'r₁ 为氢原子基态轨道半径', tip: '氢原子能级和跃迁模型中使用' },
  { id: 'atom-bohr-energy', category: '原子物理', name: '氢原子能级', formula: 'Eₙ = -13.6eV / n²', units: 'E：eV，n：正整数', variables: 'n 为主量子数', tip: '跃迁发光或吸光能量为能级差' },
  { id: 'atom-mass-energy', category: '原子物理', name: '质能方程', formula: 'E = mc²', units: 'E：J，m：kg，c：m/s', variables: 'm 质量亏损，c 真空光速', tip: '核反应能量释放、质量亏损换算题' },
  { id: 'atom-decay', category: '原子物理', name: '放射性衰变', formula: 'N = N₀(1/2)^(t/T)', units: 'N：粒子数，t、T：s', variables: 'T 为半衰期', tip: '半衰期与外界温度压强等普通条件无关' },
  { id: 'modern-relativity', category: '近代物理', name: '质速关系', formula: 'm = m₀ / √(1 - v²/c²)', units: 'm、m₀：kg，v、c：m/s', variables: 'm₀ 静质量，c 光速', tip: '高速粒子接近光速时相对论效应明显' },
  { id: 'modern-energy-momentum', category: '近代物理', name: '相对论能量动量', formula: 'E² = p²c² + m₀²c⁴', units: 'E：J，p：kg·m/s，c：m/s', variables: 'p 动量，m₀ 静质量', tip: '光子静质量为 0，因此 E=pc' },
  { id: 'unit-ev', category: '常量换算', name: '电子伏特换算', formula: '1 eV = 1.602×10⁻¹⁹ J', units: 'eV、J：能量单位', variables: '电子通过 1 V 电势差获得的能量', tip: '原子物理、光电效应中常在 J 和 eV 间转换' },
  { id: 'unit-kwh', category: '常量换算', name: '千瓦时换算', formula: '1 kW·h = 3.6×10⁶ J', units: 'kW·h、J：能量单位', variables: '俗称一度电', tip: '电功、电费、电能表计算常用' },
  { id: 'const-gravity', category: '常量换算', name: '常用物理常量', formula: 'g≈9.8m/s²，c≈3.00×10⁸m/s，h≈6.63×10⁻³⁴J·s', units: '按题目要求取值', variables: 'g 重力加速度，c 光速，h 普朗克常量', tip: '考试中优先使用题目给定常量' }
]

const categories = ['全部'].concat(Array.from(new Set(FORMULAS.map((item) => item.category))))

Page({
  data: {
    categories,
    activeCategory: '全部',
    keyword: '',
    list: [],
    selectedItem: null
  },

  onLoad() {
    this.updateList()
  },

  onShow() {
    this.updateList()
  },

  switchCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category, selectedItem: null }, () => this.updateList())
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value || '', selectedItem: null }, () => this.updateList())
  },

  updateList() {
    const activeCategory = this.data.activeCategory
    const source = activeCategory === '全部' ? FORMULAS : FORMULAS.filter((item) => item.category === activeCategory)
    const list = filterItems(source, this.data.keyword, ['name', 'category', 'formula', 'units', 'variables', 'tip'])
    this.setData({ list })
  },

  showDetail(e) {
    const item = this.data.list[e.currentTarget.dataset.index]
    if (!item) return
    this.setData({ selectedItem: item })
  },

  closeDetail() {
    this.setData({ selectedItem: null })
  },

  noop() {},

  copyItem(e) {
    const item = e.currentTarget.dataset.detail ? this.data.selectedItem : this.data.list[e.currentTarget.dataset.index]
    if (!item) return
    copyText(`${item.name}\n${item.formula}\n单位：${item.units}\n变量：${item.variables}\n题型提示：${item.tip}`)
  }
})
