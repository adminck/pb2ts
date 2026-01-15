#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

// 获取包的安装路径
const packageDir = __dirname
const binDir = path.join(packageDir, 'bin')

console.log('[pb2ts] Post-install script running...')

// 根据平台确定二进制文件名
const platform = process.platform
const arch = process.arch

// 映射平台名称
let os = platform
if (platform === 'win32') os = 'windows'
else if (platform === 'darwin') os = 'darwin'
else if (platform === 'linux') os = 'linux'

// 确定 arch
if (arch === 'x64') arch = 'amd64'
else if (arch === 'arm') arch = 'arm'

// 构建预编译文件的名称
const precompiledName = `pb2ts-parser-${os}-${arch}${platform === 'win32' ? '.exe' : ''}`
const precompiledPath = path.join(binDir, precompiledName)

// 目标文件名
const targetName = platform === 'win32' ? 'pb2ts-parser.exe' : 'pb2ts-parser'
const targetPath = path.join(binDir, targetName)

// 检查预编译文件是否存在
if (fs.existsSync(precompiledPath)) {
  // 复制到目标路径
  fs.copyFileSync(precompiledPath, targetPath)
  fs.chmodSync(targetPath, 0o755) // 设置可执行权限
  console.log('[pb2ts] ✓ Go parser binary installed successfully')
  process.exit(0)
}

console.log('[pb2ts] Pre-compiled binary not found for your platform')
console.log(`[pb2ts]   Platform: ${os}-${arch}`)
console.log('[pb2ts]')
console.log('[pb2ts] Please report this issue at: https://github.com/adminck/pb2ts/issues')
console.log('[pb2ts] Or build manually:')
console.log('[pb2ts]   git clone https://github.com/adminck/pb2ts.git')
console.log('[pb2ts]   cd pb2ts')
console.log('[pb2ts]   go build -o bin/pb2ts-parser ./go_pb_parser/cmd')

process.exit(0)
