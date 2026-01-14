import type { Pb2tsConfig } from '../config/types'
import type { Service } from '../parser/types'

export interface GeneratorContext {
    config: Pb2tsConfig
    services: Service[]
}

export class CodeBuilder {
    private lines: string[] = []
    private indentLevel = 0

    indent() {
        this.indentLevel++
    }

    unindent() {
        this.indentLevel = Math.max(0, this.indentLevel - 1)
    }

    push(line: string = '') {
        if (line === '') {
            this.lines.push('')
            return
        }
        const spaces = '    '.repeat(this.indentLevel)
        this.lines.push(spaces + line)
    }

    block(start: string, callback: () => void, end: string = '}') {
        this.push(start)
        this.indent()
        callback()
        this.unindent()
        this.push(end)
    }

    toString() {
        return this.lines.join('\n')
    }
}
