import fs from 'fs'
import path from 'path'
import jiti from 'jiti'

import type { Pb2tsConfig } from './types'
import { defaultConfig } from './defaults'
import { validateConfig } from './validate'

export interface LoadConfigOptions {
    /**
     * CLI 参数覆盖
     * 优先级最高
     */
    overrides?: Partial<Pb2tsConfig>

    /**
     * 指定 config 文件路径
     * 默认自动查找
     */
    configFile?: string
}

const CONFIG_FILES = [
    'pb2ts.config.ts',
]

export function loadConfig(
    cwd: string = process.cwd(),
    options: LoadConfigOptions = {},
): Pb2tsConfig {
    const configPath = options.configFile
        ? path.resolve(cwd, options.configFile)
        : findConfigFile(cwd)

    let userConfig: Partial<Pb2tsConfig> = {}

    if (configPath) {
        const load = jiti(__filename, {
            interopDefault: true,
            esmResolve: true,
        })

        try {
            userConfig = load(configPath)
        } catch (err) {
            throw new Error(
                `Failed to load config file: ${configPath}\n` +
                (err instanceof Error ? err.message : String(err)),
            )
        }
    }

    // 合并顺序：default -> user -> cli overrides
    const merged = mergeConfig(
        defaultConfig,
        userConfig,
        options.overrides,
    )

    // 确保模板函数有值
    ensureTemplateFunctions(merged)

    validateConfig(merged)

    return freezeConfig(merged)
}

/**
 * 在 cwd 中查找 config 文件
 */
function findConfigFile(cwd: string): string | undefined {
    for (const name of CONFIG_FILES) {
        const file = path.join(cwd, name)
        if (fs.existsSync(file)) {
            return file
        }
    }
    return undefined
}

/**
 * 明确的、可控的 merge 逻辑
 * - object: shallow merge
 * - array: override
 * - primitive: override
 */
function mergeConfig(
    base: Pb2tsConfig,
    user?: Partial<Pb2tsConfig>,
    overrides?: Partial<Pb2tsConfig>,
): Pb2tsConfig {
    const merged: Pb2tsConfig = {
        ...base,
        ...user,
        proto: {
            ...base.proto,
            ...user?.proto,
        },
        output: {
            ...base.output,
            ...user?.output,
        },
    }

    if (overrides) {
        if (overrides.proto) {
            merged.proto = { ...merged.proto, ...overrides.proto }
        }
        if (overrides.output) {
            merged.output = { ...merged.output, ...overrides.output }
        }
    }

    return merged
}

/**
 * 防止后续阶段（generator / plugin）意外修改 config
 */
function freezeConfig<T>(config: T): T {
    Object.freeze(config)

    for (const value of Object.values(config as Record<string, unknown>)) {
        if (value && typeof value === 'object') {
            Object.freeze(value)
        }
    }

    return config
}

/**
 * 确保配置中的模板函数有值，否则抛出错误
 */
function ensureTemplateFunctions(config: Pb2tsConfig): void {
    if (config.output.generationType === 'function') {
        // 对于函数模式，确保函数模板存在
        if (!config.output.functionTemplate?.functionWrapper) {
            throw new Error('Function generation mode requires output.functionTemplate.functionWrapper to be defined')
        }
    } else {
        // 对于服务类模式（默认），确保服务模板存在
        if (!config.output.serviceTemplate?.classWrapper) {
            throw new Error('Service generation mode requires output.serviceTemplate.classWrapper to be defined')
        }
        if (!config.output.serviceTemplate?.methodWrapper) {
            throw new Error('Service generation mode requires output.serviceTemplate.methodWrapper to be defined')
        }
        if (!config.output.serviceTemplate?.extensionWrapper) {
            throw new Error('Service generation mode requires output.serviceTemplate.extensionWrapper to be defined')
        }
    }
}
