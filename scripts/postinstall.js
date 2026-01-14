#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const binDir = path.join(root, 'bin')

const hasBinary =
    fs.existsSync(path.join(binDir, 'pb2ts-parser')) ||
    fs.existsSync(path.join(binDir, 'pb2ts-parser.exe'))

if (hasBinary) {
  console.log('[pb2ts] go parser already exists, skip build')
  process.exit(0)
}

console.log('[pb2ts] go parser not found, building...')

execSync('node scripts/build-go.js', {
  cwd: root,
  stdio: 'inherit',
})
