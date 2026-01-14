import type { Pb2tsConfig } from './types'

export function validateConfig(config: Pb2tsConfig): void {
    if (!config.proto?.root) {
        throw new Error('config.proto.root is required')
    }

    if (!config.output?.dir) {
        throw new Error('config.output.dir is required')
    }
}
