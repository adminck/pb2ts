#!/usr/bin/env node

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();
var __filename = /* @__PURE__ */ getFilename();

// src/cli/index.ts
import cac from "cac";
import pc from "picocolors";

// src/config/loadConfig.ts
import fs from "fs";
import path2 from "path";
import jiti from "jiti";

// src/config/defaults.ts
var defaultConfig = {
  proto: {
    root: "./",
    include: [],
    exclude: ["node_modules", "dist"]
  },
  output: {
    dir: "src/api",
    imports: ['import { fetch } from "fetch"'],
    defaultFuncTemplate
  }
};
function defaultFuncTemplate(r) {
  if (r.leadingComments == "") {
    r.leadingComments = r.name;
  }
  return `
    // ${r.leadingComments} ${r.name}
    `;
}

// src/config/validate.ts
function validateConfig(config) {
  if (!config.proto?.root) {
    throw new Error("config.proto.root is required");
  }
  if (!config.output?.dir) {
    throw new Error("config.output.dir is required");
  }
}

// src/config/loadConfig.ts
var CONFIG_FILES = [
  "pb2ts.config.ts"
];
function loadConfig(cwd = process.cwd(), options = {}) {
  const configPath = options.configFile ? path2.resolve(cwd, options.configFile) : findConfigFile(cwd);
  let userConfig = {};
  if (configPath) {
    const load = jiti(__filename, {
      interopDefault: true,
      esmResolve: true
    });
    try {
      userConfig = load(configPath);
    } catch (err) {
      throw new Error(
        `Failed to load config file: ${configPath}
` + (err instanceof Error ? err.message : String(err))
      );
    }
  }
  const merged = mergeConfig(
    defaultConfig,
    userConfig,
    options.overrides
  );
  validateConfig(merged);
  return freezeConfig(merged);
}
function findConfigFile(cwd) {
  for (const name of CONFIG_FILES) {
    const file = path2.join(cwd, name);
    if (fs.existsSync(file)) {
      return file;
    }
  }
  return void 0;
}
function mergeConfig(base, user, overrides) {
  const merged = {
    ...base,
    ...user,
    proto: {
      ...base.proto,
      ...user?.proto
    },
    output: {
      ...base.output,
      ...user?.output
    }
  };
  if (overrides) {
    if (overrides.proto) {
      merged.proto = { ...merged.proto, ...overrides.proto };
    }
    if (overrides.output) {
      merged.output = { ...merged.output, ...overrides.output };
    }
  }
  return merged;
}
function freezeConfig(config) {
  Object.freeze(config);
  for (const value of Object.values(config)) {
    if (value && typeof value === "object") {
      Object.freeze(value);
    }
  }
  return config;
}

// package.json
var version = "0.1.0";

// src/parser/runParser.ts
import { spawn } from "child_process";
import path3 from "path";
import fs2 from "fs";
async function runParser(config) {
  const packageRoot = path3.resolve(__dirname, "..", "..");
  const possiblePaths = [
    path3.resolve(packageRoot, "bin/pb2ts-parser.exe"),
    path3.resolve(packageRoot, "bin/pb2ts-parser"),
    path3.resolve(packageRoot, "../../bin/pb2ts-parser.exe"),
    path3.resolve(packageRoot, "../../bin/pb2ts-parser"),
    path3.resolve(process.cwd(), "bin/pb2ts-parser.exe"),
    path3.resolve(process.cwd(), "bin/pb2ts-parser"),
    "pb2ts-parser"
  ];
  let binPath = "";
  for (const p of possiblePaths) {
    if (p === "pb2ts-parser") {
      binPath = p;
      break;
    }
    if (fs2.existsSync(p)) {
      binPath = p;
      break;
    }
  }
  if (!binPath) {
    throw new Error("Could not find pb2ts-parser binary");
  }
  const args = ["--proto", config.proto.root];
  if (config.proto.include.length > 0) {
    args.push("--imports", config.proto.include.join(","));
  }
  if (config.proto.exclude.length > 0) {
    args.push("--exclude", config.proto.exclude.join(","));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Parser exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse JSON output: ${err}
Output: ${stdout}`));
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

// src/generator/service.ts
import path4 from "path";
import fs3 from "fs";
var ProtoToTsGenerator = class {
  constructor(config) {
    this.config = config;
    this.generatorConfig = {
      outputDir: path4.join(config.output.dir, "generated")
    };
  }
  /**
   * 生成所有服务的代码
   */
  generate(services) {
    for (const service of services) {
      this.generateService(service);
    }
  }
  /**
   * 为单个服务生成代码
   */
  generateService(service) {
    const serviceDir = path4.join(this.generatorConfig.outputDir, service.name);
    this.ensureDir(serviceDir);
    const typesContent = this.generateTypes(service);
    this.writeFile(
      path4.join(serviceDir, `${service.name}.types.ts`),
      typesContent
    );
    const indexContent = this.generateIndex(service);
    this.writeFile(
      path4.join(serviceDir, `${service.name}.index.ts`),
      indexContent
    );
    this.initializeCustomFile(service, serviceDir);
  }
  /**
   * 生成 types.ts 内容
   */
  generateTypes(service) {
    const parts = [];
    parts.push(this.generateHeader());
    for (const enumDef of service.enums) {
      parts.push(this.generateEnum(enumDef));
    }
    for (const message of service.message) {
      parts.push(this.generateMessage(message));
    }
    return parts.join("\n\n");
  }
  /**
   * 生成 index.ts 内容
   */
  generateIndex(service) {
    const parts = [];
    parts.push(this.generateHeader());
    parts.push(`import * as Types from './${service.name}.types';`);
    parts.push("");
    parts.push(`export { Types };`);
    parts.push("");
    parts.push(this.generateServiceClass(service));
    return parts.join("\n");
  }
  /**
   * 生成文件头部注释
   */
  generateHeader() {
    return `/**
 * \u26A0\uFE0F AUTO-GENERATED CODE - DO NOT EDIT
 * 
 * This file is automatically generated from Protocol Buffer definitions.
 * Any manual changes will be overwritten on the next generation.
 * 
 * Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
 */`;
  }
  /**
   * 生成 Enum
   */
  generateEnum(enumDef) {
    const parts = [];
    if (enumDef.leadingComments) {
      parts.push(this.formatComment(enumDef.leadingComments));
    }
    parts.push(`export enum ${enumDef.name} {`);
    for (const item of enumDef.enumItems) {
      if (item.leadingComments) {
        parts.push(`  ${this.formatComment(item.leadingComments, 2)}`);
      }
      parts.push(`  ${item.key} = ${item.value},`);
    }
    parts.push("}");
    return parts.join("\n");
  }
  /**
   * 生成 Message (Interface)
   */
  generateMessage(message) {
    const parts = [];
    if (message.leadingComments) {
      parts.push(this.formatComment(message.leadingComments));
    }
    parts.push(`export interface ${message.name} {`);
    for (const field of message.fields) {
      if (field.leadingComments) {
        parts.push(`  ${this.formatComment(field.leadingComments, 2)}`);
      }
      const fieldType = this.getFieldType(field);
      parts.push(`  ${field.name}: ${fieldType};`);
    }
    parts.push("}");
    return parts.join("\n");
  }
  /**
   * 获取字段类型
   */
  getFieldType(field) {
    let baseType;
    if (field.isMap) {
      const keyType = this.mapProtoTypeToTs(field.mapKey);
      const valueType = this.mapProtoTypeToTs(field.mapValue);
      baseType = `Record<${keyType}, ${valueType}>`;
    } else if (field.typeName) {
      baseType = field.typeName;
    } else {
      baseType = this.mapProtoTypeToTs(field.type);
    }
    if (field.isRepeated) {
      return `${baseType}[]`;
    }
    return baseType;
  }
  /**
   * Proto 类型到 TS 类型映射
   */
  mapProtoTypeToTs(protoType) {
    const typeMap = {
      "int32": "number",
      "int64": "number",
      "uint32": "number",
      "uint64": "number",
      "sint32": "number",
      "sint64": "number",
      "fixed32": "number",
      "fixed64": "number",
      "sfixed32": "number",
      "sfixed64": "number",
      "float": "number",
      "double": "number",
      "bool": "boolean",
      "string": "string",
      "bytes": "Uint8Array"
    };
    return typeMap[protoType] || protoType;
  }
  /**
   * 生成服务类
   */
  generateServiceClass(service) {
    const parts = [];
    if (service.leadingComments) {
      parts.push(this.formatComment(service.leadingComments));
    }
    parts.push(`export class ${service.name}Service {`);
    parts.push("  private baseUrl: string;");
    parts.push("");
    parts.push("  constructor(baseUrl: string) {");
    parts.push("    this.baseUrl = baseUrl;");
    parts.push("  }");
    for (const rpc of service.rpc) {
      parts.push("");
      parts.push(this.generateRpcMethod(rpc));
    }
    parts.push("}");
    return parts.join("\n");
  }
  /**
   * 生成 RPC 方法
   */
  generateRpcMethod(rpc) {
    const parts = [];
    if (rpc.leadingComments) {
      parts.push(`  ${this.formatComment(rpc.leadingComments, 2)}`);
    }
    const methodName = this.toCamelCase(rpc.name);
    parts.push(`  async ${methodName}(request: Types.${rpc.request}): Promise<Types.${rpc.resp}> {`);
    parts.push(`    const response = await fetch(\`\${this.baseUrl}${rpc.path}\`, {`);
    parts.push(`      method: '${rpc.method.toUpperCase()}',`);
    parts.push(`      headers: { 'Content-Type': 'application/json' },`);
    parts.push(`      body: JSON.stringify(request),`);
    parts.push(`    });`);
    parts.push("");
    parts.push("    if (!response.ok) {");
    parts.push(`      throw new Error(\`${rpc.name} failed: \${response.statusText}\`);`);
    parts.push("    }");
    parts.push("");
    parts.push("    return response.json();");
    parts.push("  }");
    return parts.join("\n");
  }
  /**
   * 格式化注释
   */
  formatComment(comment, indent = 0) {
    const indentStr = " ".repeat(indent);
    const lines = comment.trim().split("\n");
    if (lines.length === 1) {
      return `${indentStr}/** ${lines[0]} */`;
    }
    return [
      `${indentStr}/**`,
      ...lines.map((line) => `${indentStr} * ${line}`),
      `${indentStr} */`
    ].join("\n");
  }
  /**
   * 转换为驼峰命名
   */
  toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  /**
   * 初始化用户自定义文件（仅在不存在时创建）
   */
  initializeCustomFile(service, serviceDir) {
    const customFilePath = path4.join(serviceDir, `${service.name}.extensions.ts`);
    if (!fs3.existsSync(customFilePath)) {
      const template = this.generateExtensionTemplate(service);
      this.writeFile(customFilePath, template);
    }
  }
  /**
   * 生成扩展文件模板
   */
  generateExtensionTemplate(service) {
    return `/**
 * User custom extensions for ${service.name}
 * 
 * This file is for your custom code and will NOT be overwritten.
 * Import generated types from: ../${service.name}/${service.name}.types
 */

import { ${service.name}Service, Types } from '../generated/${service.name}/${service.name}.index';

// Example: Extend the generated service
export class ${service.name}ServiceExtended extends ${service.name}Service {
  // Add your custom methods here
  
  // Example:
  // async customMethod(data: Types.SomeMessage): Promise<void> {
  //   // Your custom logic
  // }
}

// Example: Helper functions
// export function validate${service.name}(data: Types.SomeMessage): boolean {
//   // Your validation logic
//   return true;
// }
`;
  }
  /**
   * 确保目录存在
   */
  ensureDir(dir) {
    if (!fs3.existsSync(dir)) {
      fs3.mkdirSync(dir, { recursive: true });
    }
  }
  /**
   * 写入文件
   */
  writeFile(filePath, content) {
    fs3.writeFileSync(filePath, content, "utf-8");
    console.log(`\u2705 Generated: ${filePath}`);
  }
};

// src/generator/index.ts
async function generate(config) {
  const services = await runParser(config);
  console.log("Generating...");
  console.log(services);
  const generator = new ProtoToTsGenerator(config);
  generator.generate(services);
}

// src/cli/index.ts
var cli = cac("pb2ts");
cli.command(
  "gen",
  "Generate TypeScript clients from proto files"
).option("--proto <dir>", "Proto root directory").option("--out <dir>", "Output directory").option("-c, --config <file>", "Use specific config file").action(async (options) => {
  try {
    console.log(pc.cyan(`
  pb2ts v${version}
`));
    const overrides = {
      proto: options.proto ? {
        root: options.proto,
        include: [],
        exclude: []
      } : void 0,
      output: options.out ? { dir: options.out } : void 0
    };
    const config = loadConfig(process.cwd(), {
      configFile: options.config,
      overrides
    });
    console.log(pc.green("  Config loaded!"));
    console.log(pc.dim("  Parsing proto files..."));
    await generate(config);
    console.log(pc.green("\n  Done!\n"));
  } catch (error) {
    console.error(
      pc.red(
        `
  ${error instanceof Error ? error.message : String(error)}
`
      )
    );
    process.exit(1);
  }
});
cli.help();
cli.version(version);
cli.parse();
//# sourceMappingURL=index.js.map