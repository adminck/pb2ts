interface Field {
    name: string;
    type: string;
    typeName: string;
    leadingComments: string;
    isMap: boolean;
    isRepeated: boolean;
    mapKey: string;
    mapValue: string;
}
interface Message {
    name: string;
    leadingComments: string;
    fields: Field[];
}
interface EnumItem {
    key: string;
    value: number;
    leadingComments: string;
}
interface Enum {
    name: string;
    leadingComments: string;
    enumItems: EnumItem[];
}
interface RPC {
    name: string;
    leadingComments: string;
    method: string;
    path: string;
    request: string;
    resp: string;
}
interface Service {
    name: string;
    leadingComments: string;
    message: Message[];
    rpc: RPC[];
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
     * @default ["**\/*.proto"]
     */
    include?: string[];
    /**
     * Glob patterns to exclude
     * @default ["node_modules", "dist"]
     */
    exclude?: string[];
}
type funcCall = (name: RPC) => string;
interface OutputConfig {
    /**
     * Output directory
     * @default "src/api"
     */
    dir: string;
    /**
     * HTTP client to generate
     * @default "fetch"
     */
    imports?: string[];
    defaultFuncTemplate?: funcCall;
    funcCalls?: {
        [key: string]: funcCall;
    };
}
interface Pb2tsConfig {
    proto: ProtoConfig;
    output: OutputConfig;
}

declare function defineConfig(config: Pb2tsConfig): Pb2tsConfig;

declare function generate(config: Pb2tsConfig): Promise<void>;

declare function runParser(protoPath: string, includePaths?: string[]): Promise<ParseResult>;

export { type Enum, type EnumItem, type Field, type Message, type OutputConfig, type ParseResult, type Pb2tsConfig, type ProtoConfig, type RPC, type Service, defineConfig, generate, runParser };
