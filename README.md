# pb2ts

[![npm version](https://img.shields.io/npm/v/pb2ts.svg)](https://www.npmjs.com/package/pb2ts)
[![License: Mulan PSL v2](https://img.shields.io/badge/License-Mulan%20PSL%20v2-blue.svg)](https://license.coscl.org.cn/MulanPSL2/)

**pb2ts** 是一个强大的工具，用于从 Protocol Buffers (`.proto`) 文件自动生成 TypeScript 代码。它支持 gRPC 服务的 HTTP 注解，可以自动生成类型安全的 API 调用函数、接口定义和枚举类型。

## ✨ 特性

- 🚀 **自动生成 TypeScript 代码**：从 `.proto` 文件生成完整的 TypeScript 类型定义和 API 函数
- 📝 **支持 HTTP 注解**：自动识别 gRPC HTTP 注解（GET、POST、PUT、DELETE、PATCH）
- 🔧 **高度可配置**：支持自定义模板、导入语句和函数生成逻辑
- 🎯 **类型安全**：生成的代码完全类型安全，支持 TypeScript 严格模式
- 🔄 **嵌套类型支持**：自动处理嵌套的 Message 和 Enum 类型
- ⚡ **易于使用**：简单的命令行接口，支持配置文件或命令行参数
- 📦 **npm 包支持**：可通过 npm 安装，支持跨平台

## 📦 安装

### 通过 npm 安装

```bash
npm install -g pb2ts
```

### 通过源码安装

```bash
git clone https://github.com/adminck/pb2ts.git
cd pb2ts
go build -o pb2ts ./cmd/main.go
```

## 🚀 快速开始

### 1. 初始化配置文件

```bash
pb2ts -init
```

这将创建一个 `pb2ts.yaml` 配置文件。

### 2. 配置你的项目

编辑 `pb2ts.yaml`：

```yaml
importFrom:
  - "import http from '@/api'"

importProtoFilePath:
  - "./third_party"

protoFilePath: "./proto"
outputPath: "./src/api"

apiTemplate: |
  // {{.LeadingComments}}
  export const {{.Name}} = (params: {{.Request}}): Promise<{{.Resp}}> => {
    return http.{{.Method}}('{{.Path}}', params)
  }
```

### 3. 运行生成器

```bash
pb2ts
```

或者使用命令行参数：

```bash
pb2ts -proto ./proto -output ./src/api
```

## 📖 使用示例

### 基本用法

```bash
# 使用默认配置（pb2ts.yaml）
pb2ts

# 指定 proto 文件目录和输出目录
pb2ts -proto ./proto -output ./dist

# 使用自定义配置文件
pb2ts -config ./my-config.yaml
```

### 命令行选项

```
pb2ts [选项]

选项:
  -config string    配置文件路径 (默认: pb2ts.yaml)
  -proto string     Proto 文件目录路径 (覆盖配置文件)
  -output string    输出目录路径 (覆盖配置文件)
  -init             初始化配置文件
  -version          显示版本信息
  -help             显示帮助信息
```

### 配置文件示例

完整的配置文件示例请参考 [pb2ts.yaml.example](./pb2ts.yaml.example)

### 自定义函数生成

你可以在配置文件中为特定的 RPC 方法定义自定义生成逻辑：

```yaml
funcCall:
  CreateDataSet: |
    function funcCall(leadingComments, name, Request, resp, method, path) {
      return `
      // ${leadingComments}
      export const ${name} = (params: ${Request}): Promise<${resp}> => {
        return http.${method}('${path}', params, { noLoading: false })
      }
      `
    }
```

## 📝 生成的代码示例

### 输入 (proto 文件)

```protobuf
syntax = "proto3";

import "google/api/annotations.proto";

service UserService {
  rpc GetUser(GetUserRequest) returns (User) {
    option (google.api.http) = {
      get: "/api/users/{id}"
    };
  }
}

message GetUserRequest {
  string id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}
```

### 输出 (TypeScript)

```typescript
import http from '@/api'

// GetUser
export const GetUser = (params: GetUserRequest): Promise<User> => {
  return http.GET('/api/users/:id', params)
}

export interface GetUserRequest {
  id: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
```

## 🏗️ 项目结构

```
pb2ts/
├── cmd/
│   └── main.go          # 主程序入口
├── internal/
│   ├── config/         # 配置管理
│   ├── generator/      # 代码生成器
│   ├── parser/         # Proto 文件解析器
│   └── types/          # 类型定义
├── scripts/            # 构建脚本
├── bin/                # 二进制文件目录
├── package.json        # npm 包配置
└── README.md           # 文档
```

## 🔧 高级配置

### 模板变量

在 `apiTemplate` 中可以使用以下变量：

- `.Name` - RPC 方法名称
- `.LeadingComments` - 注释
- `.Method` - HTTP 方法（GET、POST 等）
- `.Path` - HTTP 路径
- `.Request` - 请求类型名称
- `.Resp` - 响应类型名称

### 类型映射

Protocol Buffer 类型到 TypeScript 类型的自动映射：

| Protocol Buffer | TypeScript |
|----------------|------------|
| int32, int64, uint32, uint64, etc. | number |
| string | string |
| bool | boolean |
| bytes | Uint8Array |
| message | interface |
| enum | enum |

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 [木兰宽松许可证，第2版](LICENSE) (Mulan PSL v2) 许可证。

## 🙏 致谢

- [protoreflect](https://github.com/jhump/protoreflect) - Protocol Buffer 反射库
- [goja](https://github.com/dop251/goja) - JavaScript 引擎

## 📞 支持

如果你遇到任何问题或有建议，请：

- 提交 [Issue](https://github.com/adminck/pb2ts/issues)
- 查看 [文档](https://github.com/adminck/pb2ts/wiki)

---

**Made with ❤️ by the pb2ts team**
