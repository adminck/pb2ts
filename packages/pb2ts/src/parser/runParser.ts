import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import type { ParseResult } from './types'
import type {Pb2tsConfig} from "../config/types";

export async function runParser(config: Pb2tsConfig): Promise<ParseResult> {
    const binPath = getBinPath()

    if (!binPath) {
        throw new Error('Could not find pb2ts-parser binary')
    }

    const args = ['--proto', config.proto.root]
    if (config.proto.include.length > 0) {
        args.push('--imports', config.proto.include.join(','))
    }

    if (config.proto.exclude.length > 0) {
        args.push('--exclude', config.proto.exclude.join(','))
    }

    return new Promise((resolve, reject) => {
        const child = spawn(binPath, args)

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Parser exited with code ${code}: ${stderr}`))
                return
            }

            try {
                const result = JSON.parse(stdout) as ParseResult
                resolve(result)
            } catch (err) {
                reject(new Error(`Failed to parse JSON output: ${err}\nOutput: ${stdout}`))
            }
        })

        child.on('error', (err) => {
            reject(err)
        })
    })
}

function getBinPath() {
    const packageRoot = path.resolve(__dirname)
    // 获取当前平台和架构信息
    const platform = process.platform // 'win32', 'linux', 'darwin'
    const arch = process.arch // 'x64', 'arm64'

    // 转换为文件名使用的格式
    const osMap: Record<string, string> = {
        'win32': 'windows',
        'linux': 'linux',
        'darwin': 'darwin'
    }

    const archMap: Record<string, string> = {
        'x64': 'amd64',
        'arm64': 'arm64'
    }

    const os = osMap[platform] || platform
    const cpuArch = archMap[arch] || arch

    // 构建可能的二进制文件名列表（优先当前平台架构，然后尝试其他架构）
    const possibleBinaries = []

    // 当前平台架构优先
    if (platform === 'win32') {
        possibleBinaries.push(`pb2ts-parser-${os}-${cpuArch}.exe`)
    } else {
        possibleBinaries.push(`pb2ts-parser-${os}-${cpuArch}`)
    }

    // 同一平台的其他架构作为备选（例如在 x64 上运行 arm64）
    const otherArches = ['amd64', 'arm64'].filter(a => a !== cpuArch)
    for (const otherArch of otherArches) {
        if (platform === 'win32') {
            possibleBinaries.push(`pb2ts-parser-${os}-${otherArch}.exe`)
        } else {
            possibleBinaries.push(`pb2ts-parser-${os}-${otherArch}`)
        }
    }

    // 在多个可能的路径中查找二进制文件
    const possiblePaths = [
        path.resolve(packageRoot, 'bin'),
        path.resolve(packageRoot, '../../bin'),
        path.resolve(process.cwd(), 'bin')
    ]

    let binPath = ''
    for (const binDir of possiblePaths) {
        for (const binaryName of possibleBinaries) {
            const fullPath = path.join(binDir, binaryName)
            if (fs.existsSync(fullPath)) {
                binPath = fullPath
                break
            }
        }
        if (binPath) break
    }

    // 如果都没找到，尝试直接在 PATH 中查找
    if (!binPath) {
        // 检查 PATH 中是否存在不带后缀的 pb2ts-parser
        try {
            // Windows 下尝试带 .exe
            if (platform === 'win32') {
                const testPath = path.join(process.cwd(), 'pb2ts-parser.exe')
                if (fs.existsSync(testPath)) {
                    binPath = testPath
                }
            }
        } catch (err) {
            // 忽略错误
        }
    }

    return binPath
}