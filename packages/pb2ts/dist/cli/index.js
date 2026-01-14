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
async function runParser(protoPath, includePaths = []) {
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
  const args = ["--proto", protoPath];
  if (includePaths.length > 0) {
    args.push("--imports", includePaths.join(","));
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
function generateService(service, builder, config) {
}

// src/generator/index.ts
import path4 from "path";

// src/generator/context.ts
var CodeBuilder = class {
  constructor() {
    this.lines = [];
    this.indentLevel = 0;
  }
  indent() {
    this.indentLevel++;
  }
  unindent() {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }
  push(line = "") {
    if (line === "") {
      this.lines.push("");
      return;
    }
    const spaces = "    ".repeat(this.indentLevel);
    this.lines.push(spaces + line);
  }
  block(start, callback, end = "}") {
    this.push(start);
    this.indent();
    callback();
    this.unindent();
    this.push(end);
  }
  toString() {
    return this.lines.join("\n");
  }
};

// src/generator/index.ts
async function generate(config) {
  const protoRoot = path4.resolve(process.cwd(), config.proto.root);
  const services = await runParser(protoRoot);
  const builder = new CodeBuilder();
  for (const service of services) {
    generateService(service, builder, config);
  }
  const outFile = path4.join(config.output.dir, "index.ts");
  await emitFile(outFile, builder.toString());
}
async function emitFile(filePath, content) {
  console.log(filePath, content);
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
      proto: options.proto ? { root: options.proto } : void 0,
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