#!/usr/bin/env node

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();

// src/config/defineConfig.ts
function defineConfig(config) {
  return config;
}

// src/parser/runParser.ts
import { spawn } from "child_process";
import path2 from "path";
import fs from "fs";
async function runParser(protoPath, includePaths = []) {
  const packageRoot = path2.resolve(__dirname, "..", "..");
  const possiblePaths = [
    path2.resolve(packageRoot, "bin/pb2ts-parser.exe"),
    path2.resolve(packageRoot, "bin/pb2ts-parser"),
    path2.resolve(packageRoot, "../../bin/pb2ts-parser.exe"),
    path2.resolve(packageRoot, "../../bin/pb2ts-parser"),
    path2.resolve(process.cwd(), "bin/pb2ts-parser.exe"),
    path2.resolve(process.cwd(), "bin/pb2ts-parser"),
    "pb2ts-parser"
  ];
  let binPath = "";
  for (const p of possiblePaths) {
    if (p === "pb2ts-parser") {
      binPath = p;
      break;
    }
    if (fs.existsSync(p)) {
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
import path3 from "path";

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
  const protoRoot = path3.resolve(process.cwd(), config.proto.root);
  const services = await runParser(protoRoot);
  const builder = new CodeBuilder();
  for (const service of services) {
    generateService(service, builder, config);
  }
  const outFile = path3.join(config.output.dir, "index.ts");
  await emitFile(outFile, builder.toString());
}
async function emitFile(filePath, content) {
  console.log(filePath, content);
}
export {
  defineConfig,
  generate,
  runParser
};
//# sourceMappingURL=index.js.map