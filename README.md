# pb2ts

pb2ts 是一个用 Go 实现的工具，用于从 Protocol Buffers (.proto) 生成 TypeScript 接口与基于 HTTP 注解的客户端函数（适用于将 gRPC 方法通过 google.api.annotations 映射为 REST/HTTP 的场景）。

本仓库实现了：
- 解析 .proto 文件（使用 [protoreflect/protoparse](https://github.com/jhump/protoreflect)）。
- 读取 google.api.annotations 的 HTTP 映射（GET/POST/PUT/DELETE/PATCH）。
- 根据配置模板（config.yaml）生成 TypeScript 文件，包括：
  - RPC 对应的 HTTP 请求函数（可用自定义模板或 JS 片段动态生成）
  - Message -> `export interface ...`
  - Enum -> `export enum ...`

## 目录结构（概要）
- `cmd/main.go`：主程序（CLI）实现，解析 proto 并生成 TypeScript。
- `config.yaml`：生成器配置示例（模板、proto 搜索路径等）。
- `third_party/`：放置需要导入的第三方 proto（例如 google/well-known types）。
- `README.en.md`：英文说明。

## 快速开始

1. 获取源码并构建（需要 Go 环境）：
   - 克隆仓库：
     ```bash
     git clone https://github.com/adminck/pb2ts.git
     cd pb2ts
     ```
   - 构建可执行文件：
     ```bash
     go build -o pb2ts ./cmd
     ```
   - 或者直接运行（开发时）：
     ```bash
     go run ./cmd/main.go
     ```

2. 准备配置文件（参考 `config.yaml`）并放在仓库根目录。最小示例：
   ```yaml
   importProtoFilePath:
     - "./third_party"
   protoFilePath: "./protos"   # 你的 proto 文件目录
   importFrom:
     - "import http from '@/api'"
   ApiTemplate: "
     // {{.LeadingComments}}
     export const {{.Name}} = (params:{{.Request}}):Promise<{{.Resp}}> => {\n
       return http.{{.Method}}('{{.Path}}',params)\n
     }\n"
   FuncCall: {}
   ```

3. 将你的 .proto 文件放到 `protoFilePath` 指定目录（例如 `protos/`），并确保如果使用 google api 注解（HTTP），需要将包含相应 proto 的第三方路径加入到 `importProtoFilePath`（例如 `third_party/` 中放置 google 的 proto）。

4. 运行生成：
   ```bash
   ./pb2ts
   ```
   程序会遍历 `protoFilePath` 下的 `.proto` 文件，解析 Service 并为每个 service 生成一个 `{ServiceName}.ts` 文件在当前工作目录下。

## 配置说明（config.yaml）

主要配置项：
- `importProtoFilePath`: 可选的 proto 引入路径数组（用于解析 import）。
- `protoFilePath`: 要扫描的 proto 文件目录（默认 `./`）。
- `importFrom`: 生成文件的前导 import 语句（数组，每项一行）。
- `ApiTemplate`: 使用 Go `text/template` 语法的模板，用于生成 RPC 对应的函数字符串。模板字段示例：`{{.Name}}`、`{{.LeadingComments}}`、`{{.Request}}`、`{{.Resp}}`、`{{.Method}}`、`{{.Path}}`。
- `FuncCall`: 支持通过 JS 字符串在配置中定义生成函数（配置中的 JS 会在 [goja](https://github.com/dop251/goja) 中执行，函数名为 `funcCall`，返回字符串写入输出）。示例在仓库 `config.yaml` 中有演示。

注意：`FuncCall` 允许运行 JS 代码，这在 CI 或不受信环境中存在安全风险，请仅使用受信配置并在必要时限制运行权限。

## 生成内容说明

- Message -> TypeScript interface：
  - 基本类型（number/string/boolean）会被映射。
  - repeated -> 生成数组类型（例如 `field: type[]`）。
  - map -> 生成索引签名（注意库当前实现可能需要改进以保证键类型正确）。
  - google.protobuf.Timestamp 被处理为 `string`（可根据需要改造）。
- Enum -> `export enum NAME { ... }`
- RPC -> 根据 `google.api.annotations` 的 HTTP 映射生成 HTTP 请求函数（若注解缺失，则该 RPC 会被跳过）。

## 已知限制与注意事项

- 目前不生成 protobuf 二进制的 encode/decode 代码（即不替代像 ts-proto、protobufjs 这类用于二进制序列化的库）。本工具侧重从 proto 生成 TypeScript 类型定义与基于 HTTP 注解的客户端函数。
- Streaming RPC（server 或 client streaming）会被跳过。
- map 的 TypeScript 生成与部分 well-known types（如 Any、Struct、Duration 等）的映射尚不完善，可能需要根据项目需求扩展 `TypeConversion`。
- 配置里的 JS（`FuncCall`）会在本地采用 goja 执行，存在执行任意 JS 的风险；请慎用并在 CI 中做好审查策略。
- 文件写入模式目前建议调整为安全模式（工具中建议使用 `0644` 权限），并建议生成到明确的输出目录（例如 `src/generated`）以避免污染源代码目录。

## 集成建议（CI / 开发流程）

- 推荐做法 A（提交生成产物）：
  - 在开发者本地修改 proto 后运行生成并提交生成的 ts 文件（适用于 monorepo 或希望避免构建时再依赖生成步骤的场景）。
  - 在 CI 中运行生成并使用 `git diff --exit-code` 检查：若 CI 发现生成产物与仓库不一致则拒绝合并，确保提交者同步生成结果。

- 推荐做法 B（构建时动态生成）：
  - 在 CI / 构建流程中运行 pb2ts 并把生成目录加入构建路径（不需要将生成产物提交到仓库）。
  - 优点：避免合并生成文件冲突；缺点：构建依赖生成工具的可用性。

示例 GitHub Actions 检查（示意，需根据实际项目调整）：
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
        run: |
          ./pb2ts
      - name: Verify nothing changed
        run: |
          if ! git diff --exit-code; then
            echo "Generated artifacts are out of date. Please run pb2ts and commit changes."
            git --no-pager diff
            exit 1
          fi
```

## 安全与审计建议
- 禁止在未审查的 PR 里执行来自配置的 JS（`FuncCall`）。推荐仅在受信分支或受信作者的提交中运行该功能，或移除对 `FuncCall` 的依赖并使用静态模板。
- 在生成文件顶部加入生成器版本/commit 信息，方便追溯与调试。
- 将生成器版本固定到 CI，使不同环境生成的输出一致。

## 贡献
1. Fork 本仓库
2. 新建 feature 分支（例如 `feat/xxx`）
3. 提交代码并创建 Pull Request

欢迎修复已知问题（例如 map 索引签名、TypeConversion 覆盖更多 well-known types、添加 CLI 参数支持、添加测试用例与 CI 校验等）。

## 许可证
详见仓库中的 [LICENSE](https://github.com/adminck/pb2ts/blob/master/LICENSE)。

---

更多信息与源码：
- 配置示例：[config.yaml](https://github.com/adminck/pb2ts/blob/master/config.yaml)
- 英文说明：[README.en.md](https://github.com/adminck/pb2ts/blob/master/README.en.md)
- 主程序入口：[cmd/main.go](https://github.com/adminck/pb2ts/blob/master/cmd/main.go)
```
