const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

try {
  const tsBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tsBin)) {
    console.log('TypeScript 未安装，跳过 TS 编译')
    process.exit(0)
  }
  const cmd = `"${process.execPath}" "${tsBin}" -p "${path.join(__dirname, '..', 'tsconfig.json')}"`
  execSync(cmd, { stdio: 'inherit' })
  console.log('✓ TypeScript 编译完成')
} catch (e) {
  console.error('TypeScript 编译失败:', e.message)
  process.exit(1)
}
