---
English | **[中文](./README.md)**
---

# pb2ts

**Automatically convert Protocol Buffer definitions to TypeScript HTTP client code**

pb2ts is a powerful code generation tool that converts `.proto` files to type-safe TypeScript HTTP client code. It provides excellent support for `google.api.http` annotations and can automatically generate RESTful API client code, helping you eliminate the tedious work of manually writing API call code.

## Core Features

- **Zero Configuration**: Ready to use out of the box, no complex configuration needed to quickly generate code
- **Type Safety**: Generated code includes complete TypeScript type definitions, catching errors at compile time
- **Dual Generation Modes**: Supports both Service classes and pure Functions code styles
- **Highly Customizable**: Completely control generated code structure through templates, compatible with fetch, axios, and various HTTP libraries
- **Full Feature Support**: Supports all common Proto features including message nesting, enums, Maps, Repeated fields, etc.
- **Comment Preservation**: Automatically preserves comment information from proto files
- **Cross-Platform Support**: Built-in support for Windows, macOS, Linux, and other platforms

## Quick Start

### Installation

```bash
npm install pb2ts
```

### Step 1: Write Proto File

Create a `.proto` file, for example `user.proto`:

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

### Step 2: Generate TypeScript Code

Run in project root directory:

```bash
npx pb2ts gen --proto ./proto --out ./src/api
```

This will automatically generate the following files:

```
src/api/
├── UserService/
│   ├── UserService.types.ts      # Type definitions (overwritten on each generation)
│   ├── UserService.index.ts      # Client implementation (overwritten on each generation)
│   └── UserService.extensions.ts # Extension file (created only on first generation, customizable)
```

### Step 3: Use Generated Code

```typescript
import { UserServiceService, Types } from './src/api/UserService/UserService.index'

// Create service instance
const userService = new UserServiceService('https://api.example.com')

// Call API
async function main() {
  // Get user
  const user = await userService.GetUser({ user_id: '123' })
  console.log(user.name)

  // Create user
  const newUser = await userService.CreateUser({
    name: 'John Doe',
    email: 'john@example.com'
  })
  console.log(newUser.id)
}

main()
```

## Configuration File

Creating a `pb2ts.config.ts` configuration file allows more flexible control over generation behavior:

```typescript
import { defineConfig } from 'pb2ts'

export default defineConfig({
  proto: {
    root: './proto',           // Proto file root directory
    include: ['**/*.proto'],   // File patterns to include
    exclude: ['node_modules']  // File patterns to exclude
  },
  output: {
    dir: './src/api',          // Output directory
    generationType: 'service' // Generation mode: 'service' or 'function'
  }
})
```

## Using Different HTTP Libraries

### Default using fetch (Ready to use)

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

Generated code uses native `fetch` API, no additional dependencies required.

### Using axios

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

### Using Function Mode

If you prefer a functional programming style:

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

Generated code:

```typescript
// Using function mode
import { GetUser, CreateUser, Types } from './src/api/UserService/UserService.index'

const user = await GetUser('https://api.example.com', { user_id: '123' })
```

## Customizing Specific Methods

If you need to customize implementation for a specific API method (for example, file upload):

```typescript
export default defineConfig({
  proto: {
    root: './proto',
  },
  output: {
    dir: './src/api',
    funcCalls: {
      // Custom implementation for UploadFile method
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

## Supported Proto Features

pb2ts fully supports the following Proto features:

| Feature | Support | TypeScript Mapping |
|---------|---------|-------------------|
| Basic Types | ✅ | int32 → number, int64 → string, bool → boolean, string → string, bytes → Uint8Array |
| Timestamp | ✅ | `string` (ISO 8601 format) |
| Enums | ✅ | TypeScript enum |
| Nested Messages | ✅ | Interface or type alias |
| Map Types | ✅ | `Record<KeyType, ValueType>` |
| Repeated Fields | ✅ | `Type[]` |
| HTTP Annotations | ✅ | GET, POST, PUT, DELETE, PATCH |
| Comment Preservation | ✅ | JSDoc format comments |

### Complex Type Example

```protobuf
import "google/protobuf/timestamp.proto";

message ComplexMessage {
  int32 id = 1;
  string name = 2;
  Priority priority = 3;           // Enum
  repeated string tags = 4;          // Array
  map<string, int32> metadata = 5;  // Map
  SubMessage sub = 6;                // Nested message
  google.protobuf.Timestamp created_at = 7;  // Timestamp
  google.protobuf.Timestamp updated_at = 8;  // Timestamp
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

Generated TypeScript code:

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
  created_at: string;  // ISO 8601 format timestamp, e.g., "2024-01-15T10:30:00Z"
  updated_at: string;  // ISO 8601 format timestamp, e.g., "2024-01-15T10:30:00Z"
}
```

> **Note**: The `google.protobuf.Timestamp` type is mapped to `string`, using ISO 8601 standard time format (e.g., `"2024-01-15T10:30:00.000Z"`). This is a common way to handle time in JavaScript, which can be easily parsed using `new Date()` or processed with libraries like dayjs/momentjs.

## Extending Generated Code

Each service generates an `extensions.ts` file for custom extensions:

```typescript
// UserService.extensions.ts
import { UserServiceService, Types } from './UserService.index'

export class ExtendedUserService extends UserServiceService {
  // Add custom methods
  async getUserWithCache(userId: string): Promise<Types.User> {
    // Implement caching logic
    return this.GetUser({ user_id: userId })
  }

  // Override existing methods
  async CreateUser(request: Types.CreateUserRequest): Promise<Types.User> {
    // Add logging
    console.log('Creating user:', request.name)
    return super.CreateUser(request)
  }
}
```

**Note**: The `extensions.ts` file is only created on first generation and will not be overwritten afterwards, so you can safely add custom code.

## CLI Commands

### Generate Code

```bash
pb2ts gen --proto <proto-dir> --out <output-dir>
```

**Parameters**:
- `--proto <dir>`: Proto file root directory (default: `./`)
- `--out <dir>`: Output directory (default: `./api`)
- `-c, --config <file>`: Specify configuration file (default: `pb2ts.config.ts`)

**Examples**:

```bash
# Use default configuration
pb2ts gen

# Specify directories
pb2ts gen --proto ./proto --out ./src/api

# Use custom configuration file
pb2ts gen --config ./config/pb2ts.config.ts
```

### Configuration Priority

Configuration priority from high to low is:

1. **CLI command line arguments** (highest priority)
2. **Configuration file** (`pb2ts.config.ts`)
3. **Default configuration** (lowest priority)

For example:

```bash
# CLI parameters override settings in configuration file
pb2ts gen --proto ./custom-proto --out ./custom-output
```

## How It Works

```
┌─────────────────┐
│   .proto Files   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Go Parser      │  High-performance parsing of Proto files
│  (Binary Component) │  Extract services, messages, enums, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TypeScript     │  Based on configuration and templates
│  Code Generator │  Generate types and client code
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Generated Code │
│  .types.ts      │  Type definitions
│  .index.ts      │  Client implementation
│  .extensions.ts │  Extension file
└─────────────────┘
```

## FAQ

### Q: Will generated code overwrite my modifications?

A: `ServiceName.types.ts` and `ServiceName.index.ts` will be completely overwritten on each generation. If you need custom code, add it in the `ServiceName.extensions.ts` file, which is only created on first generation and won't be overwritten.

### Q: How to handle multiple Proto files?

A: Just place all `.proto` files in the same directory, pb2ts will automatically scan and process all files. If you need to exclude certain files, use the `exclude` option in configuration.

### Q: Does it support WebSocket or streaming RPC?

A: Current version does not support streaming RPC and WebSocket. We recommend using traditional HTTP requests.

### Q: Why is int64 type mapped to string in generated code?

A: The `number` type in JavaScript cannot safely represent 64-bit integers, so `int64` and `uint64` types are mapped to `string` to ensure precision.

### Q: How to use Timestamp type?

A: `google.protobuf.Timestamp` is mapped to `string` type with ISO 8601 standard time format (e.g., `"2024-01-15T10:30:00.000Z"`). You can use JavaScript's native `Date` object or third-party libraries (like dayjs, momentjs) to handle it:

```typescript
// Parse timestamp
const createdAt = new Date(user.created_at)
console.log(createdAt.toLocaleString())

// Using dayjs
import dayjs from 'dayjs'
const formattedTime = dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')
```

### Q: Can it be used in CI/CD?

A: Absolutely! It's recommended to integrate the `pb2ts gen` command into the build process to ensure API client code stays synchronized with backend proto definitions.

## Best Practices

### 1. Version Control

Include `pb2ts.config.ts` in version control to ensure team members use the same configuration.

### 2. Automate Generation

Add scripts in `package.json`:

```json
{
  "scripts": {
    "gen:api": "pb2ts gen",
    "dev": "npm run gen:api && vite dev",
    "build": "npm run gen:api && vite build"
  }
}
```

### 3. Directory Structure Recommendation

```
project/
├── proto/                 # Proto file directory
│   ├── user.proto
│   └── product.proto
├── src/
│   └── api/              # Generated code directory
│       ├── UserService/
│       └── ProductService/
├── pb2ts.config.ts       # Configuration file
└── package.json
```

### 4. Type Export

Create a unified entry file for easier imports:

```typescript
// src/api/index.ts
export * from './UserService/UserService.index'
export * from './ProductService/ProductService.index'
```

### 5. Error Handling

Add unified error handling on top of generated code:

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

// Usage
import { UserServiceService } from './api/UserService/UserService.index'
import { handleApiError } from './api/errorHandler'

const service = new UserServiceService('https://api.example.com')

try {
  const user = await service.GetUser({ user_id: '123' })
} catch (error) {
  handleApiError(error)
}
```

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/adminck/pb2ts.git
cd pb2ts

# Install dependencies
pnpm install

# Build
pnpm run build

# Development mode
pnpm run dev
```

### Build Go Parser

```bash
cd go_pb_parser
go build -o ../../bin/pb2ts-parser ./cmd/main.go
```

## License

MulanPSL2 (Mulan Permissive Software License v2)

## Contributing

We welcome community contributions! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## Related Links

- [GitHub Repository](https://github.com/adminck/pb2ts)
- [Issue Tracker](https://github.com/adminck/pb2ts/issues)
- [npm Package](https://www.npmjs.com/package/@adminck/pb2ts)
