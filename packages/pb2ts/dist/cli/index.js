#!/usr/bin/env node

// ../../node_modules/.pnpm/tsup@8.5.1_jiti@1.21.7_typescript@5.9.3/node_modules/tsup/assets/esm_shims.js
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
    dir: "./api",
    imports: [],
    generationType: "service",
    // 默认使用服务类方式
    serviceTemplate: {
      classWrapper: defaultServiceClassWrapper,
      methodWrapper: defaultServiceMethodWrapper,
      extensionWrapper: defaultExtensionWrapper
    },
    functionTemplate: {
      functionWrapper: defaultFunctionWrapper
    }
  }
};
function defaultServiceClassWrapper(serviceName, methodsCode) {
  return `/**
 * Service class for ${serviceName}
 */
export class ${serviceName}Service {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

${methodsCode}
}`;
}
function defaultServiceMethodWrapper(rpc) {
  const methodName = rpc.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  const comments = rpc.leadingComments ? `  /**
   * ${rpc.leadingComments}
   */
` : "";
  return `${comments}  async ${methodName}(request: Types.${rpc.request}): Promise<Types.${rpc.resp}> {
    const response = await fetch(\`\${this.baseUrl}${rpc.path}\`, {
      method: '${rpc.method.toUpperCase()}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(\`${rpc.name} failed: \${response.statusText}\`);
    }

    return response.json();
  }`;
}
function defaultFunctionWrapper(rpc) {
  const functionName = rpc.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  const comments = rpc.leadingComments ? `/**
 * ${rpc.leadingComments}
 */
` : "";
  return `${comments}export async function ${functionName}(request: Types.${rpc.request}, baseUrl: string = ''): Promise<Types.${rpc.resp}> {
  const response = await fetch(\`\${baseUrl}${rpc.path}\`, {
    method: '${rpc.method.toUpperCase()}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(\`${rpc.name} failed: \${response.statusText}\`);
  }

  return response.json();
}`;
}
function defaultExtensionWrapper(serviceName) {
  return `/**
 * User custom extensions for ${serviceName}
 * 
 * This file is for your custom code and will NOT be overwritten.
 * Import generated types from: ./${serviceName}.types
 */

import { ${serviceName}Service, Types } from './${serviceName}.index';

// Example: Extend the generated service
export class ${serviceName}ServiceExtended extends ${serviceName}Service {
  // Add your custom methods here
  
  // Example:
  // async customMethod(data: Types.SomeMessage): Promise<void> {
  //   // Your custom logic
  // }
}

// Example: Helper functions
// export function validate${serviceName}(data: Types.SomeMessage): boolean {
//   // Your validation logic
//   return true;
// }
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
  ensureTemplateFunctions(merged);
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
function ensureTemplateFunctions(config) {
  if (config.output.generationType === "function") {
    if (!config.output.functionTemplate?.functionWrapper) {
      throw new Error("Function generation mode requires output.functionTemplate.functionWrapper to be defined");
    }
  } else {
    if (!config.output.serviceTemplate?.classWrapper) {
      throw new Error("Service generation mode requires output.serviceTemplate.classWrapper to be defined");
    }
    if (!config.output.serviceTemplate?.methodWrapper) {
      throw new Error("Service generation mode requires output.serviceTemplate.methodWrapper to be defined");
    }
    if (!config.output.serviceTemplate?.extensionWrapper) {
      throw new Error("Service generation mode requires output.serviceTemplate.extensionWrapper to be defined");
    }
  }
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
function formatComment(comment, indent = 0) {
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
function generateHeader() {
  return `/**
 * \u26A0\uFE0F AUTO-GENERATED CODE - DO NOT EDIT
 * 
 * This file is automatically generated from Protocol Buffer definitions.
 * Any manual changes will be overwritten on the next generation.
 * 
 * Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
 */`;
}
function writeFile(filePath, content) {
  fs3.writeFileSync(filePath, content, "utf-8");
  console.log(`\u2705 Generated: ${filePath}`);
}
function ensureDir(dir) {
  if (!fs3.existsSync(dir)) {
    fs3.mkdirSync(dir, { recursive: true });
  }
}
var ProtoToTsGenerator = class {
  constructor(config) {
    this.config = config;
    if (config.output.generationType === "function") {
      this.generateServiceContent = (service) => {
        const parts = [];
        for (const rpc of service.rpc) {
          let templateFn = this.config.output.functionTemplate.functionWrapper;
          if (this.config.output.funcCalls && this.config.output.funcCalls[rpc.name]) {
            templateFn = this.config.output.funcCalls[rpc.name];
          }
          parts.push(templateFn(rpc));
          parts.push("");
        }
        return parts.join("");
      };
    } else {
      this.generateServiceContent = (service) => {
        const methodsCode = service.rpc.map((rpc) => {
          const templateFn2 = this.config.output.serviceTemplate.methodWrapper;
          if (this.config.output.funcCalls && this.config.output.funcCalls[rpc.name]) {
            return this.config.output.funcCalls[rpc.name](rpc);
          }
          return templateFn2(rpc);
        }).join("\n\n");
        const templateFn = this.config.output.serviceTemplate.classWrapper;
        return templateFn(service.name, methodsCode);
      };
    }
  }
  /**
   * 生成所有服务的代码
   */
  generate(services) {
    for (const service of services) {
      console.log(`Generating ${service.name}...`);
      if (service.rpc.length === 0) {
        console.log(`${service.name} has no RPC methods, skipping...`);
        continue;
      }
      this.generateService(service);
    }
  }
  /**
   * 为单个服务生成代码
   */
  generateService(service) {
    const serviceDir = path4.join(this.config.output.dir, service.name);
    ensureDir(serviceDir);
    const typesContent = this.generateTypes(service);
    writeFile(
      path4.join(serviceDir, `${service.name}.types.ts`),
      typesContent
    );
    const indexContent = this.generateIndex(service);
    writeFile(
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
    parts.push(generateHeader());
    for (const enumDef of service.enums) {
      const enumParts = [];
      if (enumDef.leadingComments) {
        enumParts.push(formatComment(enumDef.leadingComments));
      }
      enumParts.push(`export enum ${enumDef.name} {`);
      for (const item of enumDef.enumItems) {
        if (item.leadingComments) {
          enumParts.push(`  ${formatComment(item.leadingComments, 2)}`);
        }
        enumParts.push(`  ${item.key} = ${item.value},`);
      }
      enumParts.push("}");
      parts.push(enumParts.join("\n"));
    }
    for (const message of service.message) {
      const messageParts = [];
      if (message.leadingComments) {
        messageParts.push(formatComment(message.leadingComments));
      }
      messageParts.push(`export interface ${message.name} {`);
      for (const field of message.fields) {
        if (field.leadingComments) {
          messageParts.push(`  ${formatComment(field.leadingComments, 2)}`);
        }
        const fieldType = this.getFieldType(field);
        messageParts.push(`  ${field.name}: ${fieldType};`);
      }
      messageParts.push("}");
      parts.push(messageParts.join("\n"));
    }
    return parts.join("\n\n");
  }
  /**
   * 生成 index.ts 内容
   */
  generateIndex(service) {
    const parts = [];
    parts.push(generateHeader());
    parts.push(`import * as Types from './${service.name}.types';`);
    parts.push("");
    this.config.output.imports?.forEach((importPath) => {
      parts.push(importPath);
    });
    parts.push(`export { Types };`);
    parts.push("");
    parts.push(this.generateServiceContent(service));
    return parts.join("\n");
  }
  /**
   * 获取字段类型
   */
  getFieldType(field) {
    let baseType;
    if (field.isMap) {
      const keyType = this.mapProtoTypeToTs(field.mapKey);
      const valueType = field.mapValue ? this.mapProtoTypeToTs(field.mapValue) : "any";
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
      "TYPE_DOUBLE": "number",
      "TYPE_FLOAT": "number",
      "TYPE_INT64": "string",
      "TYPE_UINT64": "string",
      "TYPE_INT32": "number",
      "TYPE_FIXED64": "string",
      "TYPE_FIXED32": "number",
      "TYPE_BOOL": "boolean",
      "TYPE_STRING": "string",
      "TYPE_BYTES": "Uint8Array",
      "TYPE_UINT32": "number",
      "TYPE_SFIXED32": "number",
      "TYPE_SFIXED64": "string",
      "TYPE_SINT32": "number",
      "TYPE_SINT64": "string"
    };
    return typeMap[protoType] || protoType;
  }
  /**
   * 初始化用户自定义文件（仅在不存在时创建）
   */
  initializeCustomFile(service, serviceDir) {
    const customFilePath = path4.join(serviceDir, `${service.name}.extensions.ts`);
    if (!fs3.existsSync(customFilePath) && this.config.output.serviceTemplate?.extensionWrapper) {
      const templateFn = this.config.output.serviceTemplate.extensionWrapper;
      const template = templateFn(service.name);
      writeFile(customFilePath, template);
    }
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