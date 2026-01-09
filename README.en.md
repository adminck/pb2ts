# pb2ts

English documentation for pb2ts — a Go-based tool that generates TypeScript interfaces and simple HTTP client functions from Protocol Buffers (.proto) files, with special handling for google.api HTTP annotations.

## Overview

pb2ts parses `.proto` files, reads HTTP mappings provided by `google.api.annotations` (GET/POST/PUT/DELETE/PATCH) and generates TypeScript artifacts:

- TypeScript `interface` definitions for protobuf messages
- TypeScript `enum` definitions for protobuf enums
- HTTP client wrapper functions for RPCs that have google.api HTTP annotations, produced from a configurable template

This tool focuses on generating TypeScript types and HTTP client code (REST wrappers). It does not generate binary protobuf encode/decode code for gRPC; for binary gRPC client code consider using tools like `ts-proto` or `protobufjs`.

## Highlights

- Implemented in Go; uses `jhump/protoreflect` (protoparse) for robust proto parsing.
- Template-driven generation: configurable via `config.yaml`.
- Supports custom JS-based generation snippets executed using the `goja` JavaScript VM (configurable).
- Reads source comments from `.proto` and emits them as comments in generated TypeScript.

## Repository layout (high level)

- `cmd/main.go` — main program that parses protos and writes `.ts` outputs.
- `config.yaml` — configuration and template example for generation.
- `third_party/` — place for third-party protos (e.g., google well-known types).
- `README.md` / `README.en.md` — documentation.
- `LICENSE` — project license.

## Quick start

Prerequisites: Go toolchain installed.

1. Clone the repo:
   ```bash
   git clone https://github.com/adminck/pb2ts.git
   cd pb2ts
   ```

2. Build the CLI:
   ```bash
   go build -o pb2ts ./cmd
   ```

3. Prepare `config.yaml` in repo root (see the `config.yaml` example in this repo). Minimal example:
   ```yaml
   importProtoFilePath:
     - "./third_party"
   protoFilePath: "./protos"   # folder with your .proto files
   importFrom:
     - "import http from '@/api'"
   ApiTemplate: "
     // {{.LeadingComments}}
     export const {{.Name}} = (params:{{.Request}}):Promise<{{.Resp}}> => {\n
       return http.{{.Method}}('{{.Path}}',params)\n
     }\n"
   FuncCall: {}
   ```

4. Place your `.proto` files under the configured `protoFilePath`. If you use google API annotations, ensure the `importProtoFilePath` includes the folder holding the required third-party protos (e.g., google protos).

5. Run generation:
   ```bash
   ./pb2ts
   ```
   The tool will parse the `.proto` files and generate `{ServiceName}.ts` files in the current working directory.

## Configuration (`config.yaml`) explained

- `importProtoFilePath`: array of additional paths used when resolving `import` statements inside proto files (e.g., `third_party`).
- `protoFilePath`: directory to scan for `.proto` files.
- `importFrom`: array of lines to prepend to each generated TypeScript file (commonly imports).
- `ApiTemplate`: a Go `text/template` used to generate client functions for RPCs. Template fields available:
  - `{{.Name}}` — RPC/method name
  - `{{.LeadingComments}}` — RPC comments from proto
  - `{{.Request}}` — input message type name
  - `{{.Resp}}` — output message type name
  - `{{.Method}}` — HTTP method (GET/POST/...)
  - `{{.Path}}` — HTTP path
- `FuncCall`: optional map of RPC name -> JavaScript string. If an RPC name maps to a JS string, the string is executed in the `goja` VM. The JS should define a function `funcCall(...)` that returns the generated code string for that RPC.

Important: `FuncCall` executes arbitrary JavaScript — do not accept untrusted configuration in CI without review.

## What the generator produces

- Interfaces for messages:
  - Basic protobuf scalar types are mapped to TypeScript primitives: number, string, boolean.
  - `repeated` fields become arrays (`type[]`).
  - `map` fields are emitted as index signatures (implementation may need adjustment per your desired TypeScript key/value types).
  - `google.protobuf.Timestamp` is currently emitted as `string`.
- Enums:
  - Exported as `export enum NAME { ... }`.
- RPC functions:
  - Only RPCs that include `google.api` HTTP annotations are generated. RPCs without HTTP annotations are skipped.
  - Streaming RPCs (server or client streaming) are skipped.

## Known limitations

- No binary protobuf encode/decode generation — pb2ts is not a drop-in replacement for `ts-proto` / `protobufjs` when you need gRPC binary payloads.
- Streaming RPCs are not supported and are skipped.
- Map key/value typing in generated TypeScript may need refinement (current generator uses a simple conversion).
- Some well-known types (e.g., `Any`, `Struct`, `Duration`, `Bytes`) may not be handled the way your project expects — extend `TypeConversion` in `cmd/main.go` as needed.
- `FuncCall` uses a JS VM to run user strings. This can execute arbitrary code — treat configs as trusted.
- Output directory and file permissions are currently simple defaults. Consider generating to a dedicated `src/generated` folder and ensure appropriate file mode (the code currently uses a literal mode; change to standard `0644` if needed).

## Recommended integration patterns

1. Generate-and-commit (monorepo style)
   - Developers run pb2ts and commit generated files to VCS.
   - CI runs pb2ts and verifies generated files are up-to-date (fail if they differ).
   - Pros: no build-time generation dependency; easy review of generated artifacts.
   - Cons: needs discipline to keep generated files synced.

2. Build-time generation (do not commit generated files)
   - CI / build pipeline runs pb2ts before building the application and includes generated output in the build.
   - Pros: avoids committing generated code.
   - Cons: builds depend on generator availability and reproducibility of generator version.

Example GitHub Actions job (verify generated artifacts):
```yaml
name: Check proto generated artifacts

on:
  pull_request:
    paths:
      - 'protos/**'

jobs:
  check-generated:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'
      - name: Build pb2ts
        run: go build -o pb2ts ./cmd
      - name: Generate TypeScript
        run: ./pb2ts
      - name: Verify nothing changed
        run: |
          if ! git diff --exit-code; then
            echo "Generated artifacts are out of date. Please run pb2ts and commit changes."
            git --no-pager diff
            exit 1
          fi
```

## Security notes

- Executing configuration-provided JavaScript is powerful but risky. In CI, avoid executing `FuncCall` snippets from untrusted PRs.
- Add generation tool version and generator commit metadata to the top of generated files to aid auditing and reproducibility.
- Consider pinning Go module versions used to build pb2ts in CI.

## Contribution

Contributions welcome. Suggested improvements include:

- Add CLI flags (output directory, proto dir, `--check`, `--only-dts`, `--watch`).
- Improve TypeScript map key/value generation and support more well-known types.
- Add unit/integration tests: small proto fixtures and expected generated outputs.
- Harden and document `FuncCall`/JS execution safety.

To contribute:
1. Fork the repository.
2. Create a feature branch (`feat/...`).
3. Open a Pull Request describing the change.

## License

See the [LICENSE](https://github.com/adminck/pb2ts/blob/master/LICENSE) file in this repository.

## See also / references

- Configuration example: [`config.yaml`](https://github.com/adminck/pb2ts/blob/master/config.yaml)
- Main generator code: [`cmd/main.go`](https://github.com/adminck/pb2ts/blob/master/cmd/main.go)
- Chinese readme (this file): [`README.en.md`](https://github.com/adminck/pb2ts/blob/master/README.md)
```
