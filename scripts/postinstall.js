#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const binDir = path.join(root, 'bin')

// 检查是否有任何平台的二进制文件
const files = fs.existsSync(binDir) ? fs.readdirSync(binDir) : []
const hasBinary = files.some(file => file.startsWith('pb2ts-parser-'))

if (hasBinary) {
  console.log('[pb2ts] ✓ Go parser binaries found')
  process.exit(0)
}

console.log('[pb2ts] ℹ  No pre-built binaries found. Use local build if needed.')
process.exit(0)
