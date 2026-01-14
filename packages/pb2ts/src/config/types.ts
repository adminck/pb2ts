import type { RPC } from '../parser/types'

export interface ProtoConfig {
    /**
     * Root directory for proto files
     * @default "proto"
     */
    root: string
    /**
     * Glob patterns to include
     * @default ["**\/*.proto"]
     */
    include?: string[]
    /**
     * Glob patterns to exclude
     * @default ["node_modules", "dist"]
     */
    exclude?: string[]
}

type funcCall = (name: RPC) => string

export interface OutputConfig {
    /**
     * Output directory
     * @default "src/api"
     */
    dir: string
    /**
     * HTTP client to generate
     * @default "fetch"
     */
    imports? : string[]
    defaultFuncTemplate? : funcCall
    funcCalls? : {
        [key: string]: funcCall
    }
}

export interface Pb2tsConfig {
    proto: ProtoConfig
    output: OutputConfig
}
