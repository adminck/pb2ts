---
**[English](./README_EN.md)** | 中文
---

# pb2ts

**将 Protocol Buffer 定义文件自动转换为 TypeScript HTTP 客户端代码**

pb2ts 是一个强大的代码生成工具，专门用于将 `.proto` 文件转换为类型安全的 TypeScript HTTP 客户端代码。它完美支持 `google.api.http` 注解，可以自动生成 RESTful API 的客户端代码，让你告别手写 API 调用代码的繁琐工作。

## 核心特性

- **零配置起步**：开箱即用，无需复杂配置即可快速生成代码
- **类型安全**：生成的代码包含完整的 TypeScript 类型定义，编译时即可发现错误
- **双模式生成**：支持服务类（Service）和纯函数（Function）两种代码风格
- **高度可定制**：通过模板系统完全控制生成的代码结构，适配 fetch、axios 等各种 HTTP 库
- **完整功能支持**：支持消息嵌套、枚举、Map、Repeated 字段等所有常见 Proto 特性
- **注释保留**：自动保留 proto 文件中的注释信息
- **跨平台支持**：内置 Windows、macOS、Linux 等多平台支持

## 快速开始

### 安装

```bash
npm install pb2ts
```

### 第一步：编写 Proto 文件

创建一个 `.proto` 文件，例如 `user.proto`：

```protobuf
syntax = "proto3";

import "google/api/annotations.proto";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User) {
    option (google.api.http) = {
      get: "/v1/users/{user_id}"
    };
  }

  rpc CreateUser(CreateUserRequest) returns (User) {
    option (google.api.http) = {
      post: "/v1/users"
    };
  }
}

message GetUserRequest {
  string user_id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}
```

### 第二步：生成 TypeScript 代码

在项目根目录执行：

```bash
npx pb2ts gen --proto ./proto --out ./src/api
```

这会自动生成以下文件：

```
src/api/
├── UserService/
│   ├── UserService.types.ts      # 类型定义（每次生成会覆盖）
│   ├── UserService.index.ts      # 客户端实现（每次生成会覆盖）
│   └── UserService.extensions.ts # 扩展文件（仅首次生成，可自定义）
```

### 第三步：使用生成的代码

```typescript
import { UserServiceService, Types } from './src/api/UserService/UserService.index'

// 创建服务实例
const userService = new UserServiceService('https://api.example.com')

// 调用 API
async function main() {
  // 获取用户
  const user = await userService.GetUser({ user_id: '123' })
  console.log(user.name)

  // 创建用户
  const newUser = await userService.CreateUser({
    name: 'John Doe',
    email: 'john@example.com'
  })
  console.log(newUser.id)
}

main()
```

## 配置文件

创建 `pb2ts.config.ts` 配置文件可以更灵活地控制生成行为：

```typescript
import { defineConfig } from 'pb2ts'

export default defineConfig({
  proto: {
    root: './proto',           // Proto 文件根目录
    include: ['**/*.proto'],   // 包含的文件模式
    exclude: ['node_modules']  // 排除的文件模式
  },
  output: {
    dir: './src/api',          // 输出目录
    generationType: 'service' // 生成模式：'service' 或 'function'
  }
})
```

## 使用不同的 HTTP 库

### 默认使用 fetch（开箱即用）

```typescript
export default defineConfig({
  proto: {
    root: './proto',
  },
  output: {
    dir: './src/api',
  }
})
```

生成的代码使用原生的 `fetch` API，无需额外依赖。

### 使用 axios

```typescript
import { defineConfig } from 'pb2ts'

export default defineConfig({
  proto: {
    root: './proto',
  },
  output: {
    dir: './src/api',
    imports: [
      "import axios from 'axios'",
      "import type { AxiosInstance } from 'axios'"
    ],
    serviceTemplate: {
      classWrapper: (serviceName, methodsCode) => `
class ${serviceName}Service {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = '') {
    this.axiosInstance = axios.create({ baseURL });
  }

${methodsCode}
}`,
      methodWrapper: (rpc) => `
async ${rpc.name}(request: Types.${rpc.request}): Promise<Types.${rpc.resp}> {
  const { data } = await this.axiosInstance['${rpc.method.toLowerCase()}'](
    '${rpc.path}',
    request
  );
  return data;
}`
    }
  }
})
```

### 使用函数模式

如果你更喜欢函数式编程风格：

```typescript
export default defineConfig({
  proto: {
    root: './proto',
  },
  output: {
    dir: './src/api',
    generationType: 'function',
    functionTemplate: {
      functionWrapper: (rpc) => `
export async function ${rpc.name}(baseUrl: string = '', request: Types.${rpc.request}): Promise<Types.${rpc.resp}> {
  const response = await fetch(\`\${baseUrl}${rpc.path}\`, {
    method: '${rpc.method.toUpperCase()}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(\`${rpc.name} failed: \${response.statusText}\`);
  }

  return response.json();
}`
    }
  }
})
```

生成的代码：

```typescript
// 使用函数模式
import { GetUser, CreateUser, Types } from './src/api/UserService/UserService.index'

const user = await GetUser('https://api.example.com', { user_id: '123' })
```

## 自定义特定方法

如果你需要为某个特定的 API 方法自定义实现（例如上传文件）：

```typescript
export default defineConfig({
  proto: {
    root: './proto',
  },
  output: {
    dir: './src/api',
    funcCalls: {
      // 为 UploadFile 方法自定义实现
      'UploadFile': (rpc) => `
async UploadFile(file: File): Promise<Types.UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(\`\${this.baseUrl}${rpc.path}\`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}`
    }
  }
})
```

## 支持的 Proto 特性

pb2ts 完整支持以下 Proto 特性：

| 特性 | 支持情况 | TypeScript 映射 |
|------|----------|----------------|
| 基础类型 | ✅ | int32 → number, int64 → string, bool → boolean, string → string, bytes → Uint8Array |
| Timestamp | ✅ | `string` (ISO 8601 格式) |
| 枚举 | ✅ | TypeScript enum |
| 嵌套消息 | ✅ | 接口或类型别名 |
| Map 类型 | ✅ | `Record<KeyType, ValueType>` |
| Repeated 字段 | ✅ | `Type[]` |
| HTTP 注解 | ✅ | GET, POST, PUT, DELETE, PATCH |
| 注释保留 | ✅ | JSDoc 格式注释 |

### 复杂类型示例

```protobuf
import "google/protobuf/timestamp.proto";

message ComplexMessage {
  int32 id = 1;
  string name = 2;
  Priority priority = 3;           // 枚举
  repeated string tags = 4;          // 数组
  map<string, int32> metadata = 5;  // Map
  SubMessage sub = 6;                // 嵌套消息
  google.protobuf.Timestamp created_at = 7;  // 时间戳
  google.protobuf.Timestamp updated_at = 8;  // 时间戳
}

enum Priority {
  LOW = 0;
  MEDIUM = 1;
  HIGH = 2;
}

message SubMessage {
  string description = 1;
  bool completed = 2;
}
```

生成的 TypeScript 代码：

```typescript
export enum Priority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

export interface SubMessage {
  description: string;
  completed: boolean;
}

export interface ComplexMessage {
  id: number;
  name: string;
  priority: Priority;
  tags: string[];
  metadata: Record<string, number>;
  sub: SubMessage;
  created_at: string;  // ISO 8601 格式的时间戳，例如 "2024-01-15T10:30:00Z"
  updated_at: string;  // ISO 8601 格式的时间戳，例如 "2024-01-15T10:30:00Z"
}
```

> **注意**：`google.protobuf.Timestamp` 类型会被映射为 `string`，格式为 ISO 8601 标准时间字符串（例如：`"2024-01-15T10:30:00.000Z"`）。这是 JavaScript 中处理时间的常用方式，可以方便地使用 `new Date()` 解析或使用 dayjs/momentjs 等库处理。

## 扩展生成的代码

每个服务都会生成一个 `extensions.ts` 文件，用于自定义扩展：

```typescript
// UserService.extensions.ts
import { UserServiceService, Types } from './UserService.index'

export class ExtendedUserService extends UserServiceService {
  // 添加自定义方法
  async getUserWithCache(userId: string): Promise<Types.User> {
    // 实现缓存逻辑
    return this.GetUser({ user_id: userId })
  }

  // 重写现有方法
  async CreateUser(request: Types.CreateUserRequest): Promise<Types.User> {
    // 添加日志
    console.log('Creating user:', request.name)
    return super.CreateUser(request)
  }
}
```

**注意**：`extensions.ts` 文件只会在首次生成时创建，后续不会覆盖，可以安全地添加自定义代码。

## CLI 命令

### 生成代码

```bash
pb2ts gen --proto <proto-dir> --out <output-dir>
```

**参数**：
- `--proto <dir>`：Proto 文件根目录（默认：`./`）
- `--out <dir>`：输出目录（默认：`./api`）
- `-c, --config <file>`：指定配置文件（默认：`pb2ts.config.ts`）

**示例**：

```bash
# 使用默认配置
pb2ts gen

# 指定目录
pb2ts gen --proto ./proto --out ./src/api

# 使用自定义配置文件
pb2ts gen --config ./config/pb2ts.config.ts
```

### 配置优先级

配置的优先级从高到低为：

1. **CLI 命令行参数**（最高优先级）
2. **配置文件**（`pb2ts.config.ts`）
3. **默认配置**（最低优先级）

例如：

```bash
# CLI 参数会覆盖配置文件中的设置
pb2ts gen --proto ./custom-proto --out ./custom-output
```

## 工作原理

```
┌─────────────────┐
│   .proto 文件    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Go 解析器       │  高性能解析 Proto 文件
│  (二进制组件)    │  提取服务、消息、枚举等
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TypeScript     │  根据配置和模板
│  代码生成器     │  生成类型和客户端代码
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  生成的代码      │
│  .types.ts      │  类型定义
│  .index.ts      │  客户端实现
│  .extensions.ts │  扩展文件
└─────────────────┘
```

## 常见问题

### Q: 生成的代码会覆盖我的修改吗？

A: `ServiceName.types.ts` 和 `ServiceName.index.ts` 会在每次生成时完全覆盖。如果你需要自定义代码，请在 `ServiceName.extensions.ts` 文件中添加，该文件只在首次生成时创建，后续不会覆盖。

### Q: 如何处理多个 Proto 文件？

A: 只需将所有 `.proto` 文件放在同一个目录下，pb2ts 会自动扫描并处理所有文件。如果需要排除某些文件，可以在配置中使用 `exclude` 选项。

### Q: 支持 WebSocket 或流式 RPC 吗？

A: 当前版本不支持流式 RPC 和 WebSocket。我们建议使用传统的 HTTP 请求。

### Q: 生成的代码中 int64 类型为什么是 string？

A: JavaScript 中的 `number` 类型无法安全地表示 64 位整数，所以 `int64` 和 `uint64` 类型会被映射为 `string` 以保证精度。

### Q: Timestamp 类型如何使用？

A: `google.protobuf.Timestamp` 会被映射为 `string` 类型，格式为 ISO 8601 标准时间字符串（例如：`"2024-01-15T10:30:00.000Z"`）。你可以使用 JavaScript 原生的 `Date` 对象或第三方库（如 dayjs、momentjs）来处理：

```typescript
// 解析时间戳
const createdAt = new Date(user.created_at)
console.log(createdAt.toLocaleString())

// 使用 dayjs
import dayjs from 'dayjs'
const formattedTime = dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')
```

### Q: 可以在 CI/CD 中使用吗？

A: 当然可以！建议将 `pb2ts gen` 命令集成到构建流程中，确保 API 客户端代码始终与后端 proto 定义保持同步。

## 最佳实践

### 1. 版本控制

将 `pb2ts.config.ts` 纳入版本控制，确保团队成员使用相同的配置。

### 2. 自动化生成

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "gen:api": "pb2ts gen",
    "dev": "npm run gen:api && vite dev",
    "build": "npm run gen:api && vite build"
  }
}
```

### 3. 目录结构建议

```
project/
├── proto/                 # Proto 文件目录
│   ├── user.proto
│   └── product.proto
├── src/
│   └── api/              # 生成的代码目录
│       ├── UserService/
│       └── ProductService/
├── pb2ts.config.ts       # 配置文件
└── package.json
```

### 4. 类型导出

创建统一的入口文件，方便导入：

```typescript
// src/api/index.ts
export * from './UserService/UserService.index'
export * from './ProductService/ProductService.index'
```

### 5. 错误处理

在生成的代码基础上添加统一的错误处理：

```typescript
// api/errorHandler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any
  ) {
    super(message)
  }
}

export function handleApiError(error: any): never {
  if (error instanceof ApiError) {
    throw error
  }
  throw new ApiError('Network error or server error')
}

// 使用
import { UserServiceService } from './api/UserService/UserService.index'
import { handleApiError } from './api/errorHandler'

const service = new UserServiceService('https://api.example.com')

try {
  const user = await service.GetUser({ user_id: '123' })
} catch (error) {
  handleApiError(error)
}
```

## 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/adminck/pb2ts.git
cd pb2ts

# 安装依赖
pnpm install

# 构建
pnpm run build

# 开发模式
pnpm run dev
```

### 构建 Go 解析器

```bash
cd go_pb_parser
go build -o ../../bin/pb2ts-parser ./cmd/main.go
```

## 许可证

MulanPSL2 (木兰宽松许可证 v2)

## 贡献

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 相关链接

- [GitHub 仓库](https://github.com/adminck/pb2ts)
- [问题反馈](https://github.com/adminck/pb2ts/issues)
- [npm 包](https://www.npmjs.com/package/@adminck/pb2ts)
