import { runParser } from '../parser/runParser'
import type { Pb2tsConfig } from '../config/types'
import { generateService } from './service'
import path from 'path'
import { CodeBuilder } from './context'

export async function generate(config: Pb2tsConfig) {
    const protoRoot = path.resolve(process.cwd(), config.proto.root)
    
    // 1. Parse
    // config.proto.include could be passed as imports if they are directories
    // But currently include is glob patterns.
    // We'll just pass root to parser.
    const services = await runParser(protoRoot)

    const builder = new CodeBuilder()
    
    // 2. Generate
    for (const service of services) {
        generateService(service, builder, config)
    }

    // 3. Emit
    const outFile = path.join(config.output.dir, 'index.ts')
    await emitFile(outFile, builder.toString())
}


async function emitFile (filePath: string, content: string) {
    console.log(filePath,content)
}