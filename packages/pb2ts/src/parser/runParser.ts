import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import type { ParseResult } from './types'
import type {Pb2tsConfig} from "../config/types";

export async function runParser(config: Pb2tsConfig): Promise<ParseResult> {
    const packageRoot = path.resolve(__dirname, '..', '..')

    const possiblePaths = [
        path.resolve(packageRoot, 'bin/pb2ts-parser.exe'),
        path.resolve(packageRoot, 'bin/pb2ts-parser'),
        path.resolve(packageRoot, '../../bin/pb2ts-parser.exe'),
        path.resolve(packageRoot, '../../bin/pb2ts-parser'),
        path.resolve(process.cwd(), 'bin/pb2ts-parser.exe'),
        path.resolve(process.cwd(), 'bin/pb2ts-parser'),
        'pb2ts-parser',
    ]

    let binPath = ''
    for (const p of possiblePaths) {
        if (p === 'pb2ts-parser') {
            binPath = p
            break
        }
        if (fs.existsSync(p)) {
            binPath = p
            break
        }
    }

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
