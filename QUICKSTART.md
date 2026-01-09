# 快速开始指南

## 5 分钟快速上手

### 步骤 1: 安装

```bash
npm install -g pb2ts
```

或者从源码安装：

```bash
git clone https://github.com/adminck/pb2ts.git
cd pb2ts
go build -o pb2ts ./cmd/main.go
```

### 步骤 2: 初始化配置

```bash
pb2ts -init
```

这会创建一个 `pb2ts.yaml` 配置文件。

### 步骤 3: 准备你的 Proto 文件

确保你的 `.proto` 文件包含 HTTP 注解：

```protobuf
syntax = "proto3";

import "google/api/annotations.proto";

service UserService {
  rpc GetUser(GetUserRequest) returns (User) {
    option (google.api.http) = {
      get: "/api/users/{id}"
    };
  }
  
  rpc CreateUser(CreateUserRequest) returns (User) {
    option (google.api.http) = {
      post: "/api/users"
      body: "*"
    };
  }
}

message GetUserRequest {
  string id = 1;
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

### 步骤 4: 配置

编辑 `pb2ts.yaml`：

```yaml
importFrom:
  - "import http from '@/api'"

importProtoFilePath:
  - "./third_party"  # 包含 google/api/annotations.proto 的目录

protoFilePath: "./proto"      # 你的 proto 文件目录
outputPath: "./src/api"       # 输出目录

apiTemplate: |
  // {{.LeadingComments}}
  export const {{.Name}} = (params: {{.Request}}): Promise<{{.Resp}}> => {
    return http.{{.Method}}('{{.Path}}', params)
  }
```

### 步骤 5: 运行

```bash
pb2ts
```

### 步骤 6: 查看生成的文件

生成的 TypeScript 文件将位于 `./src/api/UserService.ts`：

```typescript
import http from '@/api'

// GetUser
export const GetUser = (params: GetUserRequest): Promise<User> => {
  return http.GET('/api/users/:id', params)
}

// CreateUser
export const CreateUser = (params: CreateUserRequest): Promise<User> => {
  return http.POST('/api/users', params)
}

export interface GetUserRequest {
  id: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
```

## 常见问题

### Q: 如何自定义生成的代码格式？

A: 修改 `pb2ts.yaml` 中的 `apiTemplate` 字段，使用 Go template 语法。

### Q: 如何为特定方法生成自定义代码？

A: 在 `pb2ts.yaml` 的 `funcCall` 部分添加自定义 JavaScript 函数。

### Q: 支持哪些 HTTP 方法？

A: 支持 GET、POST、PUT、DELETE、PATCH。

### Q: 如何处理嵌套类型？

A: pb2ts 会自动处理嵌套的 Message 和 Enum，并自动重命名以避免冲突。

### Q: 如何更新依赖？

A: 运行 `go mod tidy` 更新 Go 依赖。

## 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 查看 [pb2ts.yaml.example](./pb2ts.yaml.example) 了解配置选项
- 查看 [PUBLISH.md](./PUBLISH.md) 了解如何发布

