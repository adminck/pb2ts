import type { RPC } from '../parser/types'

export interface ProtoConfig {
    /**
     * Root directory for proto files
     * @default "proto"
     */
    root: string
    /**
     * Glob patterns to include
     * @default []
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
     * @default "api"
     */
    dir: string
    /**
     * Additional import statements to include in generated files
     * @default []
     */
    imports? : string[]
    /**
     * Custom function calls for specific RPC methods
     * Allows overriding the default template for individual methods
     * @default {}
     */
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
        /**
         * Wrapper function for the entire service class
         * Takes the service name and generated methods code as parameters
         */
        classWrapper?: (serviceName: string, methodsCode: string) => string
        /**
         * Wrapper function for individual service methods
         * Defines how each RPC method is generated within the service class
         */
        methodWrapper?: funcCall
        /**
         * Template for the extension file that users can customize
         * This file won't be overwritten on regeneration
         */
        extensionWrapper?: (serviceName: string) => string
    }
    /**
     * Template for function generation
     */
    functionTemplate?: {
        /**
         * Wrapper function for individual functions when using function generation mode
         * Defines how each RPC method is generated as a standalone function
         */
        functionWrapper?: funcCall
    }
}

export interface Pb2tsConfig {
    proto: ProtoConfig
    output: OutputConfig
}
