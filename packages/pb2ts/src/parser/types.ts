export interface Field {
    name: string
    type: string
    typeName: string
    leadingComments: string
    isMap: boolean
    isRepeated: boolean
    mapKey: string
    mapValue: string
}

export interface Message {
    name: string
    leadingComments: string
    fields: Field[]
}

export interface EnumItem {
    key: string
    value: number
    leadingComments: string
}

export interface Enum {
    name: string
    leadingComments: string
    enumItems: EnumItem[]
}

export interface RPC {
    name: string
    leadingComments: string
    method: string
    path: string
    request: string
    resp: string
}

export interface Service {
    name: string
    leadingComments: string
    message: Message[]
    rpc: RPC[]
    enums: Enum[]
}

export type ParseResult = Service[]
