export interface Field {
    /**
     * The field name
     */
    name: string
    /**
     * The field type as defined in the Protocol Buffer specification
     */
    type: string
    /**
     * The name of the custom type if this field refers to a message or enum
     */
    typeName: string
    /**
     * Comments associated with this field
     */
    leadingComments: string
    /**
     * Indicates if this field is a map type
     */
    isMap: boolean
    /**
     * Indicates if this field is a repeated type (array)
     */
    isRepeated: boolean
    /**
     * The key type for map fields
     */
    mapKey: string
    /**
     * The value type for map fields
     */
    mapValue: string
}

export interface Message {
    /**
     * The name of the message type
     */
    name: string
    /**
     * Comments associated with this message
     */
    leadingComments: string
    /**
     * The list of fields in this message
     */
    fields: Field[]
}

export interface EnumItem {
    /**
     * The name/key of the enum item
     */
    key: string
    /**
     * The numeric value of the enum item
     */
    value: number
    /**
     * Comments associated with this enum item
     */
    leadingComments: string
}

export interface Enum {
    /**
     * The name of the enum
     */
    name: string
    /**
     * Comments associated with this enum
     */
    leadingComments: string
    /**
     * The list of items in this enum
     */
    enumItems: EnumItem[]
}

export interface RPC {
    /**
     * The name of the RPC method
     */
    name: string
    /**
     * Comments associated with this RPC method
     */
    leadingComments: string
    /**
     * The HTTP method (GET, POST, PUT, DELETE, etc.)
     */
    method: string
    /**
     * The HTTP path for this endpoint
     */
    path: string
    /**
     * The name of the request message type
     */
    request: string
    /**
     * The name of the response message type
     */
    resp: string
}

export interface Service {
    /**
     * The name of the service
     */
    name: string
    /**
     * Comments associated with this service
     */
    leadingComments: string
    /**
     * The list of messages defined in this service
     */
    message: Message[]
    /**
     * The list of RPC methods defined in this service
     */
    rpc: RPC[]
    /**
     * The list of enums defined in this service
     */
    enums: Enum[]
}

export type ParseResult = Service[]
