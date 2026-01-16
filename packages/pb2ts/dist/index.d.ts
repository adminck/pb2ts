interface Field {
    /**
     * The field name
     */
    name: string;
    /**
     * The field type as defined in the Protocol Buffer specification
     */
    type: string;
    /**
     * The name of the custom type if this field refers to a message or enum
     */
    typeName: string;
    /**
     * Comments associated with this field
     */
    leadingComments: string;
    /**
     * Indicates if this field is a map type
     */
    isMap: boolean;
    /**
     * Indicates if this field is a repeated type (array)
     */
    isRepeated: boolean;
    /**
     * The key type for map fields
     */
    mapKey: string;
    /**
     * The value type for map fields
     */
    mapValue: string;
}
interface Message {
    /**
     * The name of the message type
     */
    name: string;
    /**
     * Comments associated with this message
     */
    leadingComments: string;
    /**
     * The list of fields in this message
     */
    fields: Field[];
}
interface EnumItem {
    /**
     * The name/key of the enum item
     */
    key: string;
    /**
     * The numeric value of the enum item
     */
    value: number;
    /**
     * Comments associated with this enum item
     */
    leadingComments: string;
}
interface Enum {
    /**
     * The name of the enum
     */
    name: string;
    /**
     * Comments associated with this enum
     */
    leadingComments: string;
    /**
     * The list of items in this enum
     */
    enumItems: EnumItem[];
}
interface RPC {
    /**
     * The name of the RPC method
     */
    name: string;
    /**
     * Comments associated with this RPC method
     */
    leadingComments: string;
    /**
     * The HTTP method (GET, POST, PUT, DELETE, etc.)
     */
    method: string;
    /**
     * The HTTP path for this endpoint
     */
    path: string;
    /**
     * The name of the request message type
     */
    request: string;
    /**
     * The name of the response message type
     */
    resp: string;
}
interface Service {
    /**
     * The name of the service
     */
    name: string;
    /**
     * Comments associated with this service
     */
    leadingComments: string;
    /**
     * The list of messages defined in this service
     */
    message: Message[];
    /**
     * The list of RPC methods defined in this service
     */
    rpc: RPC[];
    /**
     * The list of enums defined in this service
     */
    enums: Enum[];
}
type ParseResult = Service[];

interface ProtoConfig {
    /**
     * Root directory for proto files
     * @default "proto"
     */
    root: string;
    /**
     * Glob patterns to include
     * @default []
     */
    include: string[];
    /**
     * Glob patterns to exclude
     * @default ["node_modules", "dist"]
     */
    exclude: string[];
}
type funcCall = (name: RPC) => string;
type GenerationType = 'service' | 'function';
interface OutputConfig {
    /**
     * Output directory
     * @default "api"
     */
    dir: string;
    /**
     * Additional import statements to include in generated files
     * @default []
     */
    imports?: string[];
    /**
     * Custom function calls for specific RPC methods
     * Allows overriding the default template for individual methods
     * @default {}
     */
    funcCalls?: {
        [key: string]: funcCall;
    };
    /**
     * Generation type: whether to generate service classes or pure functions
     * @default "service"
     */
    generationType?: GenerationType;
    /**
     * Template for service class generation
     */
    serviceTemplate?: {
        /**
         * Wrapper function for the entire service class
         * Takes the service name and generated methods code as parameters
         */
        classWrapper?: (serviceName: string, methodsCode: string) => string;
        /**
         * Wrapper function for individual service methods
         * Defines how each RPC method is generated within the service class
         */
        methodWrapper?: funcCall;
        /**
         * Template for the extension file that users can customize
         * This file won't be overwritten on regeneration
         */
        extensionWrapper?: (serviceName: string) => string;
    };
    /**
     * Template for function generation
     */
    functionTemplate?: {
        /**
         * Wrapper function for individual functions when using function generation mode
         * Defines how each RPC method is generated as a standalone function
         */
        functionWrapper?: funcCall;
    };
}
interface Pb2tsConfig {
    proto: ProtoConfig;
    output: OutputConfig;
}

declare function defineConfig(config: Pb2tsConfig): Pb2tsConfig;

declare function generate(config: Pb2tsConfig): Promise<void>;

declare function runParser(config: Pb2tsConfig): Promise<ParseResult>;

export { type Enum, type EnumItem, type Field, type GenerationType, type Message, type OutputConfig, type ParseResult, type Pb2tsConfig, type ProtoConfig, type RPC, type Service, defineConfig, generate, runParser };
