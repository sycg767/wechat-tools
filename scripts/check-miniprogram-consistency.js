const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(root, 'miniprogram')
const appJsonPath = path.join(miniprogramRoot, 'app.json')
const indexJsPath = path.join(miniprogramRoot, 'pages', 'index', 'index.js')

let hasError = false
let hasWarning = false

function fail(message) {
  hasError = true
  console.error(`ERROR: ${message}`)
}

function warn(message) {
  hasWarning = true
  console.warn(`WARN: ${message}`)
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function registeredPages(appJson) {
  const pages = new Set(appJson.pages || [])
  ;(appJson.subPackages || []).forEach((pkg) => {
    ;(pkg.pages || []).forEach((page) => pages.add(`${pkg.root}/${page}`))
  })
  return pages
}

function toolPaths(indexText) {
  const paths = []
  const re = /path:\s*'([^']+)'/g
  let match
  while ((match = re.exec(indexText)) !== null) {
    paths.push(match[1].replace(/^\//, ''))
  }
  return [...new Set(paths)]
}

function checkToolPaths(indexText, pages) {
  toolPaths(indexText).forEach((toolPath) => {
    if (!pages.has(toolPath)) {
      fail(`首页工具路径未注册到 app.json: ${toolPath}`)
    }
  })
}

function checkRegisteredPageFiles(pages) {
  pages.forEach((page) => {
    const jsPath = path.join(miniprogramRoot, `${page}.js`)
    if (!fs.existsSync(jsPath)) {
      fail(`app.json 注册页面缺少 JS 文件: ${page}.js`)
    }
  })
}

function checkDeferredFeatures(indexText) {
  const forbiddenPatterns = [
    /图片转文字/,
    /文字识别/,
    /番茄钟/,
    /pomodoro/i,
    /pages-tool\/ocr/i,
    /pages-tool\/image-ocr/i,
    /pages-tool\/pomodoro/i
  ]
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(indexText)) {
      fail(`首页出现本轮暂缓功能入口关键词: ${pattern}`)
    }
  })
}

function checkSuspiciousDirs() {
  const dirs = [
    'miniprogram/miniprogram',
    'backend/miniprogram',
    '.claude/worktrees'
  ]
  dirs.forEach((dir) => {
    if (fs.existsSync(path.join(root, dir))) {
      warn(`发现可疑或应排除的目录: ${dir}`)
    }
  })
}

function main() {
  if (!fs.existsSync(appJsonPath)) fail(`缺少文件: ${appJsonPath}`)
  if (!fs.existsSync(indexJsPath)) fail(`缺少文件: ${indexJsPath}`)
  if (hasError) process.exit(1)

  const appJson = JSON.parse(readText(appJsonPath))
  const indexText = readText(indexJsPath)
  const pages = registeredPages(appJson)

  checkToolPaths(indexText, pages)
  checkRegisteredPageFiles(pages)
  checkDeferredFeatures(indexText)
  checkSuspiciousDirs()

  if (hasError) {
    process.exit(1)
  }

  console.log(hasWarning ? '小程序一致性检查通过（存在 warning）' : '小程序一致性检查通过')
}

main()
