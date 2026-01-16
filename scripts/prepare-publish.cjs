#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

/**
 * 1. 初始化路径信息
 */
function initializePaths() {
  const root = path.resolve(__dirname, '..')
  const packageDir = path.join(root,'packages' , 'pb2ts')
  const binDir = path.join(root, 'bin')
  const scriptsDir = path.join(root, 'scripts')
  const goRoot = path.join(root, 'go_pb_parser')
  const readmeSource = path.join(root, 'README.md')
  const readmeEnSource = path.join(root, 'README_EN.md')
  const LICENSE = path.join(root, 'LICENSE')

  return {
    root,
    packageDir,
    binDir,
    scriptsDir,
    goRoot,
    readmeSource,
	readmeEnSource,
    LICENSE
  }
}

/**
 * 2. 编译go解析器
 */
function compileGoParser(paths) {
  const { binDir,goRoot } = paths

  console.log('[pb2ts] Building Go parser for all platforms...')

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }

  console.log('[pb2ts] Building Go parser for all platforms...')

  const platforms = [
    { os: 'windows', arch: 'amd64', name: 'pb2ts-parser-windows-amd64.exe' },
    { os: 'windows', arch: 'arm64', name: 'pb2ts-parser-windows-arm64.exe' },
    { os: 'linux', arch: 'amd64', name: 'pb2ts-parser-linux-amd64' },
    { os: 'linux', arch: 'arm64', name: 'pb2ts-parser-linux-arm64' },
    { os: 'darwin', arch: 'amd64', name: 'pb2ts-parser-darwin-amd64' },
    { os: 'darwin', arch: 'arm64', name: 'pb2ts-parser-darwin-arm64' },
  ]

  for (const platform of platforms) {
    console.log(`[pb2ts] Building for ${platform.os}-${platform.arch}...`)

    const outputPath = path.join(binDir, platform.name)

    try {
      execSync(
          `go build -ldflags="-s -w" -o "${outputPath}" ./cmd`,
          {
            cwd: goRoot,
            stdio: 'inherit',
            env: {
              ...process.env,
              CGO_ENABLED: '0',
              GOOS: platform.os,
              GOARCH: platform.arch,
            },
          }
      )
      console.log(`[pb2ts] ✓ Built ${platform.name}`)
    } catch (error) {
      console.log(`[pb2ts] ✗ Failed to build ${platform.name}: ${error.message}`)
    }
  }

  console.log('[pb2ts] All platforms build complete')
}

/**
 * 3. 打包 pb2ts 包
 */
function packagePb2ts(paths) {
  const { root } = paths

  console.log('[pb2ts] Packaging pb2ts...')

  // 进入 packages/pb2ts 目录并执行构建
  const packagesDir = path.join(root, 'packages', 'pb2ts')
  try {
    console.log('[pb2ts] Building packages/pb2ts with tsup...')
    execSync('npm run build', {
      cwd: packagesDir,
      stdio: 'inherit'
    })
    console.log('[pb2ts] ✓ Build completed')
  } catch (error) {
    console.error('[pb2ts] ✗ Failed to build packages:', error.message)
    throw error
  }
  console.log('[pb2ts] ✓ pb2ts package prepared')
}

/**
 * 将 需要打包的文件复制到包根目录
 */
function copyDirFiles(paths) {
    const {packageDir, binDir, readmeSource, readmeEnSource, LICENSE} = paths
    const items = [
      { src: binDir, isDir: true },
      { src: readmeSource, isDir: false },
      { src: readmeEnSource, isDir: false },
      { src: LICENSE, isDir: false },
    ]

    items.forEach(item => {
      if (!fs.existsSync(item.src)) return

      if (item.isDir) {
        // 复制目录及其内容
        const dirName = path.basename(item.src)
        const destDir = path.join(packageDir, dirName)

        // 如果目标目录已存在，先删除
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true })
        }

        // 递归复制目录
        fs.cpSync(item.src, destDir, { recursive: true })
        console.log(`[pb2ts] ✓ Copied directory: ${dirName}`)
      } else {
        // 复制单个文件
        const fileName = path.basename(item.src)
        const destFile = path.join(packageDir, fileName)
        fs.copyFileSync(item.src, destFile)
        console.log(`[pb2ts] ✓ Copied file: ${fileName}`)
      }
    })
}

/**
 * 主函数
 */
function main() {
  console.log('[pb2ts] Preparing package for publish...')

  // 1. 初始化路径信息
  const paths = initializePaths()

  // 2. 编译go解析器
  compileGoParser(paths)

  // 3. 打包 pb2ts 包
  packagePb2ts(paths)

  // 4. 复制需要打包的文件
  copyDirFiles(paths)

  console.log('[pb2ts] ✓ Package prepared for publish')
}

// 执行主函数
main()
