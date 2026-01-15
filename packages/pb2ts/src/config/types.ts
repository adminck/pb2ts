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
    include: string[]
    /**
     * Glob patterns to exclude
     * @default ["node_modules", "dist"]
     */
    exclude: string[]
}

type funcCall = (name: RPC) => string

export type GenerationType = 'service' | 'function'

export interface OutputConfig {
    /**
     * Output directory
     * @default "src/api"
     */
    dir: string
    imports? : string[]
    funcCalls? : {
        [key: string]: funcCall
    }
    /**
     * Generation type: whether to generate service classes or pure functions
     * @default "service"
     */
    generationType?: GenerationType
    /**
     * Template for service class generation
     */
    serviceTemplate?: {
        classWrapper?: (serviceName: string, methodsCode: string) => string
        methodWrapper?: funcCall
        extensionWrapper?: (serviceName: string) => string
    }
    /**
     * Template for function generation
     */
    functionTemplate?: {
        functionWrapper?: funcCall
    }
}

export interface Pb2tsConfig {
    proto: ProtoConfig
    output: OutputConfig
}
