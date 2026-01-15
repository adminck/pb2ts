import type { Pb2tsConfig } from '../config/types'
import { loadConfig } from '../config/loadConfig'
import { runParser } from '../parser/runParser'

export async function useGenerator(cwd: string = process.cwd(), overrides?: Partial<Pb2tsConfig>) {
    const config = loadConfig(cwd, { overrides })
    const services = await runParser(config)

    return {
        config,
        services,
    }
}

