#!/usr/bin/env node
const { execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const root = path.resolve(__dirname, '..')
const goRoot = path.join(root, 'go_pb_parser')
const binDir = path.join(root, 'bin')

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
