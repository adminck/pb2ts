#!/usr/bin/env node
const { execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const root = path.resolve(__dirname, '..')
const goRoot = path.join(root, 'go_pb_parser')
const outDir = path.join(root, 'bin')

const platform = process.platform
const arch = process.arch

const binName = platform === 'win32'
    ? 'pb2ts-parser.exe'
    : 'pb2ts-parser'

const outPath = path.join(outDir, binName)

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
}

console.log('[pb2ts] building go parser...')

execSync(
    `go build -o "${outPath}" ./cmd`,
    {
        cwd: goRoot,
        stdio: 'inherit',
        env: {
            ...process.env,
            CGO_ENABLED: '0',
        },
    },
)

console.log(`[pb2ts] go parser built: ${outPath}`)
