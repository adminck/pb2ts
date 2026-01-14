import type { Pb2tsConfig } from './types'
import type { RPC } from '../parser/types'

export const defaultConfig: Pb2tsConfig = {
    proto: {
        root: './',
        include: [],
        exclude: ['node_modules', 'dist'],
    },
    output: {
        dir: 'src/api',
        imports: ['import { fetch } from "fetch"'],
        defaultFuncTemplate : defaultFuncTemplate,
    },
}

function defaultFuncTemplate(r:RPC) {
    if (r.leadingComments == "") {
        r.leadingComments = r.name
    }
    return `
    // ${ r.leadingComments } ${r.name}
    `
}