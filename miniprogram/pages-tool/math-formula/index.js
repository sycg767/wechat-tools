const { copyText, filterItems } = require('../utils/tool-common.js')

const FORMULAS = [
  { id: 'alg-square-diff', category: '代数', name: '平方差公式', formula: 'a² - b² = (a + b)(a - b)', variables: 'a、b：任意实数或代数式', scene: '因式分解、整式化简、快速计算两个平方数差', example: '例：99² - 1² = (99 + 1)(99 - 1) = 9800' },
  { id: 'alg-perfect-square', category: '代数', name: '完全平方公式', formula: '(a ± b)² = a² ± 2ab + b²', variables: 'a、b：任意实数或代数式，符号同取', scene: '配方、展开、因式分解、一元二次方程整理', example: '例：(x + 3)² = x² + 6x + 9' },
  { id: 'alg-cube-sum', category: '代数', name: '立方和差', formula: 'a³ ± b³ = (a ± b)(a² ∓ ab + b²)', variables: 'a、b：任意实数或代数式', scene: '高次多项式分解、整式化简', example: '例：x³ - 8 = (x - 2)(x² + 2x + 4)' },
  { id: 'alg-binomial', category: '代数', name: '二项式定理', formula: '(a + b)ⁿ = Σ C(n,k)aⁿ⁻ᵏbᵏ', variables: 'n：非负整数，k=0,1,...,n', scene: '展开高次幂、求指定项系数、组合计数', example: '例：(x+1)⁴ 的 x² 项系数为 C(4,2)=6' },
  { id: 'alg-quadratic-root', category: '代数', name: '一元二次方程求根', formula: 'x = [-b ± √(b² - 4ac)] / 2a', variables: 'a、b、c：ax² + bx + c = 0 的系数，a≠0', scene: '求二次方程根、判断根的个数、解应用题', example: '例：x² - 5x + 6 = 0，x = 2 或 3' },
  { id: 'alg-discriminant', category: '代数', name: '判别式', formula: 'Δ = b² - 4ac', variables: 'a、b、c：一元二次方程系数', scene: '判断二次方程实根个数、函数与 x 轴交点', example: '例：Δ>0 有两个不等实根，Δ=0 有两个相等实根' },
  { id: 'alg-vieta', category: '代数', name: '韦达定理', formula: 'x₁ + x₂ = -b/a，x₁x₂ = c/a', variables: 'x₁、x₂：ax²+bx+c=0 的两根', scene: '根与系数关系、构造方程、对称式计算', example: '例：x²-5x+6=0，两根和 5，积 6' },
  { id: 'alg-absolute', category: '代数', name: '绝对值性质', formula: '|ab| = |a||b|，|a+b| ≤ |a| + |b|', variables: 'a、b：实数或向量分量', scene: '不等式证明、距离问题、分类讨论', example: '例：|x-2| 表示 x 到 2 的距离' },
  { id: 'alg-log-basic', category: '代数', name: '对数运算', formula: 'logₐ(MN)=logₐM+logₐN，logₐMⁿ=nlogₐM', variables: 'a>0 且 a≠1，M、N>0', scene: '指数对数化简、解指数方程、数量级计算', example: '例：log₂8 + log₂4 = log₂32 = 5' },
  { id: 'alg-exp-log', category: '代数', name: '指数对数互化', formula: 'aˣ = N ⇔ x = logₐN', variables: 'a>0 且 a≠1，N>0', scene: '指数方程、对数方程、增长模型', example: '例：2ˣ=16，则 x=log₂16=4' },
  { id: 'func-linear', category: '函数', name: '一次函数', formula: 'y = kx + b', variables: 'k：斜率，b：截距', scene: '线性关系建模、直线图像、增长率分析', example: '例：每小时增加 3，初始 2，则 y=3x+2' },
  { id: 'func-quadratic', category: '函数', name: '二次函数顶点式', formula: 'y = a(x - h)² + k', variables: '(h,k)：顶点，a 决定开口方向和宽窄', scene: '抛物线图像、最值、对称轴问题', example: '例：y=(x-2)²+3 的顶点为 (2,3)' },
  { id: 'func-vertex', category: '函数', name: '二次函数顶点坐标', formula: 'x = -b / 2a，y = (4ac - b²) / 4a', variables: 'a、b、c：y=ax²+bx+c 的系数', scene: '求最值、对称轴、图像平移', example: '例：y=x²-4x+1 的顶点 x=2' },
  { id: 'func-exponential', category: '函数', name: '指数函数', formula: 'y = aˣ', variables: 'a>0 且 a≠1', scene: '增长衰减模型、复利、人口模型', example: '例：a>1 时单调递增，0<a<1 时单调递减' },
  { id: 'func-logarithm', category: '函数', name: '对数函数', formula: 'y = logₐx', variables: 'a>0 且 a≠1，x>0', scene: '数量级、反函数、指数方程转换', example: '例：y=log₂x 是 y=2ˣ 的反函数' },
  { id: 'seq-arithmetic', category: '数列', name: '等差数列通项', formula: 'aₙ = a₁ + (n - 1)d', variables: 'a₁：首项，d：公差，n：项数', scene: '线性递增递减序列、求指定项', example: '例：首项 2、公差 3，则 a₅=14' },
  { id: 'seq-arithmetic-sum', category: '数列', name: '等差数列求和', formula: 'Sₙ = n(a₁ + aₙ)/2 = n[2a₁ + (n - 1)d]/2', variables: 'Sₙ：前 n 项和', scene: '连续均匀变化量求和、阶梯计数', example: '例：1 到 100 的和为 100×101/2=5050' },
  { id: 'seq-geometric', category: '数列', name: '等比数列通项', formula: 'aₙ = a₁qⁿ⁻¹', variables: 'q：公比', scene: '倍增衰减、复利、指数型序列', example: '例：首项 3、公比 2，则 a₄=24' },
  { id: 'seq-geometric-sum', category: '数列', name: '等比数列求和', formula: 'Sₙ = a₁(1 - qⁿ)/(1 - q)，q≠1', variables: 'a₁：首项，q：公比', scene: '倍增累加、分形、复利累计', example: '例：1+2+4+8=15' },
  { id: 'seq-infinite', category: '数列', name: '无穷等比和', formula: 'S = a₁ / (1 - q)，|q| < 1', variables: 'a₁：首项，q：公比', scene: '无限递减求和、循环小数、极限模型', example: '例：1 + 1/2 + 1/4 + ... = 2' },
  { id: 'geo-triangle-area', category: '几何', name: '三角形面积', formula: 'S = ah/2 = absinC/2', variables: 'a：底边，h：高，C：两边夹角', scene: '平面几何、坐标几何、向量面积', example: '例：底 6 高 4，面积 12' },
  { id: 'geo-heron', category: '几何', name: '海伦公式', formula: 'S = √[p(p-a)(p-b)(p-c)]，p=(a+b+c)/2', variables: 'a、b、c：三边，p：半周长', scene: '已知三边求三角形面积', example: '例：3、4、5 三角形面积为 6' },
  { id: 'geo-circle-area', category: '几何', name: '圆面积与周长', formula: 'S = πr²，C = 2πr', variables: 'r：半径，π≈3.1416', scene: '圆形区域面积、周长、扇形推导', example: '例：r=3，则 S=9π，C=6π' },
  { id: 'geo-sector', category: '几何', name: '扇形面积与弧长', formula: 'S = θr²/2，l = θr', variables: 'θ：圆心角弧度，r：半径', scene: '扇形面积、弧长、旋转问题', example: '例：θ=π/3，r=6，则 l=2π' },
  { id: 'geo-prism-volume', category: '几何', name: '柱体体积', formula: 'V = Sh', variables: 'S：底面积，h：高', scene: '棱柱、圆柱、容积估算', example: '例：底面积 10，高 3，体积 30' },
  { id: 'geo-cone-volume', category: '几何', name: '锥体体积', formula: 'V = Sh/3', variables: 'S：底面积，h：高', scene: '圆锥、棱锥、立体几何', example: '例：底面积 9，高 6，体积 18' },
  { id: 'geo-sphere-volume', category: '几何', name: '球体体积与表面积', formula: 'V = 4πr³/3，S = 4πr²', variables: 'r：球半径', scene: '空间几何、容积估算、球面问题', example: '例：r=2，则 V=32π/3，S=16π' },
  { id: 'geo-pythagorean', category: '几何', name: '勾股定理', formula: 'a² + b² = c²', variables: 'a、b：直角边，c：斜边', scene: '直角三角形边长、距离计算、坐标几何基础', example: '例：3²+4²=5²' },
  { id: 'tri-basic', category: '三角', name: '基本恒等式', formula: 'sin²x + cos²x = 1，tanx = sinx/cosx', variables: 'x：角度或弧度', scene: '三角化简、求值、证明恒等式', example: '例：若 sinx=3/5，则 cosx=4/5 或 -4/5' },
  { id: 'tri-sum-diff', category: '三角', name: '和差角公式', formula: 'sin(a±b)=sinacosb±cosasinb，cos(a±b)=cosacosb∓sinasinb', variables: 'a、b：角', scene: '三角函数化简、特殊角求值', example: '例：sin75°=sin(45°+30°)' },
  { id: 'tri-double', category: '三角', name: '倍角公式', formula: 'sin2x=2sinxcosx，cos2x=cos²x-sin²x', variables: 'x：角', scene: '三角化简、解三角方程、积分变形', example: '例：cos2x=2cos²x-1=1-2sin²x' },
  { id: 'tri-half', category: '三角', name: '半角公式', formula: 'sin²(x/2)=(1-cosx)/2，cos²(x/2)=(1+cosx)/2', variables: 'x：角', scene: '降幂、积分、三角方程', example: '例：1-cosx=2sin²(x/2)' },
  { id: 'tri-sine', category: '三角', name: '正弦定理', formula: 'a/sinA = b/sinB = c/sinC = 2R', variables: 'a、b、c：边长，A、B、C：对角，R：外接圆半径', scene: '已知两角一边或两边一对角求三角形', example: '例：a=6，A=30°，B=45°，b=6sin45°/sin30°' },
  { id: 'tri-cosine', category: '三角', name: '余弦定理', formula: 'c² = a² + b² - 2abcosC', variables: 'a、b、c：边长，C：夹角', scene: '已知两边夹角求第三边、判断三角形', example: '例：a=3，b=4，C=90°，c=5' },
  { id: 'analytic-distance', category: '解析几何', name: '两点距离', formula: 'd = √[(x₂-x₁)² + (y₂-y₁)²]', variables: '(x₁,y₁)、(x₂,y₂)：平面两点坐标', scene: '坐标系中求线段长度、圆半径、轨迹问题', example: '例：(0,0) 到 (3,4) 的距离为 5' },
  { id: 'analytic-midpoint', category: '解析几何', name: '中点公式', formula: 'M((x₁+x₂)/2, (y₁+y₂)/2)', variables: 'M：两点连线中点', scene: '线段中点、对称点、几何构造', example: '例：(0,2) 与 (4,6) 的中点为 (2,4)' },
  { id: 'analytic-slope', category: '解析几何', name: '斜率公式', formula: 'k = (y₂ - y₁)/(x₂ - x₁)', variables: 'x₂≠x₁', scene: '直线倾斜程度、平行垂直判断', example: '例：斜率乘积为 -1 的两直线互相垂直' },
  { id: 'analytic-line', category: '解析几何', name: '直线方程', formula: 'y - y₁ = k(x - x₁)，Ax + By + C = 0', variables: 'k：斜率，A、B、C：常数', scene: '确定直线、点到线距离、交点问题', example: '例：过 (1,2) 斜率 3，y-2=3(x-1)' },
  { id: 'analytic-point-line', category: '解析几何', name: '点到直线距离', formula: 'd = |Ax₀ + By₀ + C| / √(A² + B²)', variables: '点 (x₀,y₀)，直线 Ax+By+C=0', scene: '距离、面积、高、最短路径', example: '例：点到 x 轴的距离为 |y₀|' },
  { id: 'analytic-circle', category: '解析几何', name: '圆标准方程', formula: '(x-a)² + (y-b)² = r²', variables: '(a,b)：圆心，r：半径', scene: '圆与直线位置关系、轨迹方程', example: '例：圆心 (1,-2)，半径 3，方程为 (x-1)²+(y+2)²=9' },
  { id: 'analytic-ellipse', category: '解析几何', name: '椭圆标准方程', formula: 'x²/a² + y²/b² = 1，a>b>0', variables: 'a：长半轴，b：短半轴，c²=a²-b²', scene: '圆锥曲线、焦点、离心率', example: '例：离心率 e=c/a' },
  { id: 'analytic-hyperbola', category: '解析几何', name: '双曲线标准方程', formula: 'x²/a² - y²/b² = 1', variables: 'a、b：半轴参数，c²=a²+b²', scene: '圆锥曲线、渐近线、焦点', example: '例：渐近线 y=±(b/a)x' },
  { id: 'analytic-parabola', category: '解析几何', name: '抛物线标准方程', formula: 'y² = 2px 或 x² = 2py', variables: 'p：焦准距参数', scene: '焦点准线、圆锥曲线、最值', example: '例：y²=2px 的焦点为 (p/2,0)' },
  { id: 'cal-limit-basic', category: '微积分', name: '重要极限', formula: 'lim(x→0) sinx/x = 1，lim(n→∞)(1+1/n)ⁿ = e', variables: 'x 用弧度制，e 为自然常数', scene: '求极限、导数推导、指数模型', example: '例：lim(x→0) tanx/x = 1' },
  { id: 'cal-power-derivative', category: '微积分', name: '幂函数导数', formula: '(xⁿ)′ = nxⁿ⁻¹', variables: 'n：常数，x：自变量', scene: '求切线斜率、函数单调性、极值分析', example: '例：(x³)′ = 3x²' },
  { id: 'cal-common-derivative', category: '微积分', name: '常用导数', formula: '(sinx)′=cosx，(cosx)′=-sinx，(eˣ)′=eˣ，(lnx)′=1/x', variables: 'x：自变量，lnx 要求 x>0', scene: '函数求导、切线、极值、优化问题', example: '例：(lnx + eˣ)′ = 1/x + eˣ' },
  { id: 'cal-chain', category: '微积分', name: '链式法则', formula: '[f(g(x))]′ = f′(g(x))g′(x)', variables: 'f、g：可导函数', scene: '复合函数求导、隐函数求导基础', example: '例：(sin x²)′ = cos(x²)·2x' },
  { id: 'cal-product', category: '微积分', name: '乘积求导', formula: '(uv)′ = u′v + uv′', variables: 'u、v：可导函数', scene: '两个函数相乘求导', example: '例：(xeˣ)′=eˣ+xeˣ' },
  { id: 'cal-quotient', category: '微积分', name: '商法则', formula: '(u/v)′ = (u′v - uv′)/v²', variables: 'v≠0', scene: '分式函数求导', example: '例：(sinx/x)′=(xcosx-sinx)/x²' },
  { id: 'cal-newton-leibniz', category: '微积分', name: '牛顿-莱布尼茨公式', formula: '∫ₐᵇ f(x)dx = F(b) - F(a)', variables: 'F(x)：f(x) 的一个原函数', scene: '定积分计算、面积、累积量模型', example: '例：∫₀² x dx = x²/2|₀² = 2' },
  { id: 'cal-common-integral', category: '微积分', name: '常用积分', formula: '∫xⁿdx = xⁿ⁺¹/(n+1)+C，∫eˣdx=eˣ+C，∫1/x dx=ln|x|+C', variables: 'n≠-1，C：积分常数', scene: '不定积分、面积、微分方程', example: '例：∫3x²dx = x³ + C' },
  { id: 'cal-integration-parts', category: '微积分', name: '分部积分', formula: '∫u dv = uv - ∫v du', variables: 'u、v：可微函数', scene: '乘积型积分、含 ln 或反三角函数积分', example: '例：∫x eˣdx = x eˣ - eˣ + C' },
  { id: 'prob-permutation', category: '概率统计', name: '排列数', formula: 'A(n,m) = n! / (n-m)!', variables: 'n：总数，m：取出并排序的数量', scene: '考虑顺序的选取、排队、密码位数', example: '例：5 人排 3 位，A(5,3)=60' },
  { id: 'prob-combination', category: '概率统计', name: '组合数', formula: 'C(n,m) = n! / [m!(n-m)!]', variables: 'n：总数，m：选取数，0≤m≤n', scene: '不考虑顺序的抽取、二项分布、计数问题', example: '例：5 人选 2 人，C(5,2)=10' },
  { id: 'prob-addition', category: '概率统计', name: '加法公式', formula: 'P(A∪B)=P(A)+P(B)-P(A∩B)', variables: 'A、B：随机事件', scene: '求至少发生一个事件的概率', example: '例：互斥事件时 P(A∪B)=P(A)+P(B)' },
  { id: 'prob-conditional', category: '概率统计', name: '条件概率', formula: 'P(A|B)=P(A∩B)/P(B)', variables: 'P(B)>0', scene: '已知条件下的概率、贝叶斯公式基础', example: '例：已知抽到红球，再求来自某袋的概率' },
  { id: 'prob-bayes', category: '概率统计', name: '贝叶斯公式', formula: 'P(Aᵢ|B)=P(Aᵢ)P(B|Aᵢ)/ΣP(Aⱼ)P(B|Aⱼ)', variables: 'Aᵢ：完备事件组，B：观测事件', scene: '诊断、分类、原因反推', example: '例：根据检测阳性反推真实患病概率' },
  { id: 'prob-expectation', category: '概率统计', name: '离散期望', formula: 'E(X) = Σxᵢpᵢ', variables: 'xᵢ：取值，pᵢ：对应概率', scene: '平均收益、风险评估、随机变量分析', example: '例：投硬币正面得 1，反面得 0，E=0.5' },
  { id: 'prob-variance', category: '概率统计', name: '方差', formula: 'D(X) = E(X²) - [E(X)]²', variables: 'E(X)：期望，E(X²)：平方的期望', scene: '衡量波动程度、统计稳定性、风险大小', example: '例：若 X 为 0/1 且 p=0.5，D=0.25' },
  { id: 'prob-binomial', category: '概率统计', name: '二项分布', formula: 'P(X=k)=C(n,k)pᵏ(1-p)ⁿ⁻ᵏ', variables: 'n：试验次数，p：成功概率', scene: '独立重复试验、命中次数概率', example: '例：抛 3 次硬币恰 2 次正面概率为 3/8' },
  { id: 'stat-normal', category: '概率统计', name: '正态分布密度', formula: 'f(x)=1/(σ√(2π))·e^[-(x-μ)²/(2σ²)]', variables: 'μ：均值，σ：标准差', scene: '连续变量建模、误差分布、统计推断', example: '例：标准正态分布 μ=0，σ=1' },
  { id: 'stat-zscore', category: '概率统计', name: '标准化', formula: 'Z = (X - μ) / σ', variables: 'X：原变量，μ：均值，σ：标准差', scene: '不同量纲比较、查标准正态表', example: '例：分数 85、均值 75、标准差 10，则 Z=1' },
  { id: 'la-dot', category: '线性代数', name: '向量点积', formula: 'a·b = |a||b|cosθ = Σaᵢbᵢ', variables: 'θ：两个向量夹角', scene: '夹角、投影、相似度、功的计算', example: '例：点积为 0 表示两个非零向量垂直' },
  { id: 'la-cross', category: '线性代数', name: '向量叉积', formula: '|a×b| = |a||b|sinθ', variables: '三维向量 a、b，θ：夹角', scene: '面积、法向量、空间几何', example: '例：平行向量叉积为零向量' },
  { id: 'la-determinant-2', category: '线性代数', name: '二阶行列式', formula: '|a b; c d| = ad - bc', variables: 'a、b、c、d：矩阵元素', scene: '线性方程组、面积缩放、可逆判断', example: '例：行列式不为 0 则二阶矩阵可逆' },
  { id: 'la-inverse-2', category: '线性代数', name: '二阶矩阵逆', formula: 'A⁻¹ = 1/(ad-bc) · [d -b; -c a]', variables: 'A=[a b; c d]，ad-bc≠0', scene: '解线性方程组、坐标变换逆运算', example: '例：单位矩阵的逆仍是单位矩阵' },
  { id: 'disc-inclusion', category: '离散数学', name: '容斥原理', formula: '|A∪B|=|A|+|B|-|A∩B|', variables: 'A、B：集合', scene: '集合计数、重复统计去重', example: '例：会英语或数学的人数要减去都学的人数' },
  { id: 'disc-handshake', category: '离散数学', name: '握手定理', formula: 'Σdeg(v) = 2|E|', variables: 'deg(v)：顶点度数，E：边集合', scene: '图论计数、判断度数序列', example: '例：奇度顶点个数一定为偶数' }
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
    const list = filterItems(source, this.data.keyword, ['name', 'category', 'formula', 'variables', 'scene', 'example'])
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
    copyText(`${item.name}\n${item.formula}\n变量：${item.variables}\n适用：${item.scene}\n例题：${item.example}`)
  }
})
