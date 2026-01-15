#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const packageDir = path.join(root, 'packages', 'pb2ts')
const binDir = path.join(packageDir, 'bin')
const scriptsDir = path.join(packageDir, 'scripts')

console.log('[pb2ts] Preparing package for publish...')

// 确保 bin 目录存在
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true })
}

// 确保 scripts 目录存在
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true })
}

// 复制 bin 目录内容
const rootBinDir = path.join(root, 'bin')
if (fs.existsSync(rootBinDir)) {
  console.log('[pb2ts] Copying bin directory...')
  copyDir(rootBinDir, binDir)
}

// 复制 scripts/postinstall.js
const postinstallSource = path.join(root, 'scripts', 'postinstall.js')
const postinstallTarget = path.join(scriptsDir, 'postinstall.js')
if (fs.existsSync(postinstallSource)) {
  fs.copyFileSync(postinstallSource, postinstallTarget)
  console.log('[pb2ts] ✓ postinstall.js copied')
}

// 复制 README.md（中文版）并添加语言切换
const readmeSource = path.join(root, 'README.md')
const readmeTarget = path.join(packageDir, 'README.md')
if (fs.existsSync(readmeSource)) {
  let readmeContent = fs.readFileSync(readmeSource, 'utf-8')
  // 在开头添加语言切换链接
  const languageToggle = '\n---\n**[English](./README_EN.md)** | 中文\n---\n\n'
  readmeContent = languageToggle + readmeContent
  fs.writeFileSync(readmeTarget, readmeContent)
  console.log('[pb2ts] ✓ README.md copied')
}

// 复制 README_EN.md（英文版）并添加语言切换
const readmeEnSource = path.join(root, 'README_EN.md')
const readmeEnTarget = path.join(packageDir, 'README_EN.md')
if (fs.existsSync(readmeEnSource)) {
  let readmeEnContent = fs.readFileSync(readmeEnSource, 'utf-8')
  // 在开头添加语言切换链接
  const languageToggleEn = '\n---\nEnglish | **[中文](./README.md)**\n---\n\n'
  readmeEnContent = languageToggleEn + readmeEnContent
  fs.writeFileSync(readmeEnTarget, readmeEnContent)
  console.log('[pb2ts] ✓ README_EN.md copied')
}

console.log('[pb2ts] ✓ Package prepared for publish')

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true })
      }
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
