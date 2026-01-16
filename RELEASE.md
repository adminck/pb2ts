# 发布流程说明

本文档详细说明了项目的发布流程和 CI/CD 工作机制。

## 目录

- [CI/CD 流程概览](#cicd-流程概览)
- [自动发版流程](#自动发版流程)
- [CI/CD 工作流详解](#cicd-工作流详解)
- [前置配置](#前置配置)
- [发布检查清单](#发布检查清单)
- [常见问题与故障排除](#常见问题与故障排除)

## CI/CD 流程概览

本项目使用 GitHub Actions 实现全自动化的发布流程，核心特点：

- **自动化触发**：通过 Git Tag 触发发布流程
- **版本同步**：自动从 Tag 提取版本号并同步到 package.json
- **多文件上传**：同时发布到 npm 和 GitHub Release
- **跨平台支持**：包含 Windows、Linux、macOS 等多平台二进制文件

### 工作流触发条件

CI/CD 流程由以下条件触发：

- **触发方式**：推送符合 `v*.*.*` 格式的 Git Tag
- **示例 Tag**：`v1.0.0`、`v1.2.3`、`v2.0.0-beta.1`
- **自动操作**：
  - 更新 `package.json` 中的版本号
  - 构建并发布 npm 包
  - 创建 GitHub Release 并上传二进制文件

## 自动发版流程

### 1. 本地准备

在本地完成以下步骤：

#### 1.1 编译所有平台的 Go 二进制文件

```bash
node scripts/build-all-platforms.cjs
```

该脚本会编译以下平台的二进制文件：

| 平台 | 架构 | 文件名 |
|------|------|--------|
| Windows | AMD64 | `pb2ts-parser-windows-amd64.exe` |
| Windows | ARM64 | `pb2ts-parser-windows-arm64.exe` |
| Linux | AMD64 | `pb2ts-parser-linux-amd64` |
| Linux | ARM64 | `pb2ts-parser-linux-arm64` |
| macOS | AMD64 | `pb2ts-parser-darwin-amd64` |
| macOS | ARM64 | `pb2ts-parser-darwin-arm64` |

#### 1.2 提交代码到仓库

```bash
git add .
git commit -m "chore: build all platform binaries"
git push origin master
```

### 2. 创建并推送 Tag

在 GitHub 上或本地创建一个新的 tag：

#### 方式一：通过 GitHub 网页界面

1. 进入 GitHub 仓库页面
2. 点击 **Releases** → **Create a new release**
3. 选择或输入新的 tag（例如：`v1.0.0`）
4. 填写 Release title 和 Release notes（可选）
5. 点击 **Publish release**

#### 方式二：通过 Git 命令行

```bash
# 创建本地 tag
git tag v1.0.0

# 推送 tag 到远程仓库
git push origin v1.0.0
```

> **注意**：GitHub Actions 会自动根据 tag 版本号（如 `v1.0.0`）更新 package.json 中的版本号，无需手动修改。

### 3. 自动发布流程

GitHub Actions 检测到 Tag 推送后会自动触发发布工作流，执行以下步骤：

#### 3.1 代码检出与环境准备

```yaml
- Checkout code                    # 检出代码仓库
- Extract version from tag         # 从 Tag 提取版本号
- Setup Node.js 18                 # 设置 Node.js 运行环境
- Setup pnpm 9                     # 设置 pnpm 包管理器
- Install dependencies             # 安装项目依赖
```

#### 3.2 版本号更新

```yaml
- Update package.json version      # 自动更新 package.json 中的版本号
```

此步骤会读取 Tag 中的版本号（如 `1.0.0`），并将其写入 `packages/pb2ts/package.json`。

#### 3.3 包发布准备

执行 `scripts/prepare-publish.cjs` 脚本，完成以下操作：

1. **复制二进制文件**：将 `bin/` 目录下的所有平台二进制文件复制到 `packages/pb2ts/bin/`
2. **复制安装脚本**：将 `scripts/postinstall.cjs` 复制到 `packages/pb2ts/scripts/`
3. **复制并处理文档**：
   - 复制 `README.md` 到 `packages/pb2ts/`
   - 复制 `README_EN.md` 到 `packages/pb2ts/`
   - 在两个文档开头添加中英文切换链接

#### 3.4 构建 TypeScript 包

```yaml
- Build package                    # 运行 pnpm run build
```

使用 `tsup` 工具构建 TypeScript 代码，生成：
- `dist/index.js` - 主要导出文件
- `dist/cli/index.js` - CLI 入口文件
- `dist/**/*.d.ts` - TypeScript 类型定义文件

#### 3.5 发布到 npm

```yaml
- Publish to npm                   # 运行 npm publish --access public
```

发布的 npm 包包含以下文件：

```
@adminck/pb2ts/
├── dist/                    # 编译后的 TypeScript 代码
├── bin/                     # 所有平台的二进制文件
├── scripts/
│   └── postinstall.cjs      # 安装后处理脚本
├── README.md                # 中文文档（含切换链接）
├── README_EN.md             # 英文文档（含切换链接）
└── package.json             # 包配置文件
```

#### 3.6 创建 GitHub Release

```yaml
- Create Release             # 使用 softprops/action-gh-release@v1
```

自动执行以下操作：
- 创建 GitHub Release
- 上传 `bin/` 目录下所有二进制文件
- 自动生成 Release Notes（基于 git 提交历史）
- 发布状态设置为正式发布（非草稿、非预发布）

### 4. 查看发布结果

#### npm 包发布结果

访问地址：https://www.npmjs.com/package/@adminck/pb2ts

验证事项：
- ✅ 版本号正确
- ✅ 包文件完整（dist、bin、scripts、README）
- ✅ 文档中包含语言切换链接

#### GitHub Release 发布结果

访问地址：https://github.com/adminck/pb2ts/releases

验证事项：
- ✅ Release 标题和 Tag 版本一致
- ✅ 所有平台二进制文件已上传
- ✅ Release Notes 自动生成或手动填写的内容

## CI/CD 工作流详解

### 工作流配置文件

位置：`.github/workflows/release.yml`

#### 触发条件

```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # 匹配 v1.0.0、v2.3.4 等格式
```

#### 权限设置

```yaml
permissions:
  contents: write  # 允许创建 GitHub Release
```

#### 工作流步骤

| 步骤名称 | 说明 | 使用的 Action |
|---------|------|--------------|
| Checkout code | 检出代码仓库 | actions/checkout@v4 |
| Extract version from tag | 从 Tag 提取版本号 | 原生 shell 命令 |
| Update package.json version | 更新 package.json | 原生 Node.js 命令 |
| Setup Node.js | 设置 Node.js 环境 | actions/setup-node@v4 |
| Setup pnpm | 设置 pnpm 包管理器 | pnpm/action-setup@v2 |
| Install dependencies | 安装项目依赖 | pnpm install |
| Prepare package for publish | 准备发布包 | 自定义脚本 |
| Build package | 构建 TypeScript 包 | pnpm run build |
| Publish to npm | 发布到 npm | npm publish |
| Create Release | 创建 GitHub Release | softprops/action-gh-release@v1 |

### 关键脚本说明

#### prepare-publish.cjs

**作用**：准备 npm 发布包

**执行内容**：
1. 创建必要的目录结构（`bin/`、`scripts/`）
2. 复制所有平台二进制文件到包目录
3. 复制 postinstall 脚本
4. 复制中英文 README 并添加语言切换链接

#### postinstall.cjs

**作用**：npm 安装后的验证脚本

**执行时机**：用户执行 `npm install @adminck/pb2ts` 时自动运行

**执行内容**：
- 检查 `bin/` 目录下是否存在预编译的二进制文件
- 输出验证结果或提示信息

#### build-all-platforms.cjs

**作用**：编译所有平台的 Go 二进制文件

**支持的平台**：
- Windows AMD64/ARM64
- Linux AMD64/ARM64
- macOS AMD64/ARM64

## 前置配置

### 1. GitHub Secrets 配置

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中配置：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `NPM_TOKEN` | npm 发布令牌 | 在 npm 官网创建 Automation Token |

#### 如何获取 NPM_TOKEN

1. 登录 [npmjs.com](https://www.npmjs.com)
2. 点击头像 → **Access Tokens** → **Generate New Token**
3. 选择 **Automation** 类型
4. 复制生成的 token
5. 在 GitHub 仓库设置中添加 Secret：`NPM_TOKEN`

### 2. pnpm workspace 配置

项目使用 pnpm workspace 管理多包，配置文件为 `pnpm-workspace.yaml`：

```yaml
packages:
  - 'packages/*'
```

### 3. package.json 关键配置

```json
{
  "files": [
    "dist",           // 编译后的 TypeScript 代码
    "bin",            // 二进制文件
    "scripts",        // 安装脚本
    "README.md",      // 中文文档
    "README_EN.md"    // 英文文档
  ],
  "bin": {
    "pb2ts": "./dist/cli/index.js"  // CLI 命令入口
  }
}
```

## 发布检查清单

在创建发布 Tag 前，请确认以下事项：

### 代码质量

- [ ] 所有代码已提交到 `master` 分支
- [ ] 代码通过 ESLint 检查（如果有）
- [ ] TypeScript 编译无错误
- [ ] 所有测试用例通过（如果有）

### 二进制文件

- [ ] 已执行 `node scripts/build-all-platforms.cjs` 编译所有平台
- [ ] `bin/` 目录包含以下文件：
  - [ ] `pb2ts-parser-windows-amd64.exe`
  - [ ] `pb2ts-parser-windows-arm64.exe`
  - [ ] `pb2ts-parser-linux-amd64`
  - [ ] `pb2ts-parser-linux-arm64`
  - [ ] `pb2ts-parser-darwin-amd64`
  - [ ] `pb2ts-parser-darwin-arm64`

### 文档

- [ ] `README.md` 内容完整准确
- [ ] `README_EN.md` 与中文版同步更新
- [ ] 示例代码可正常运行

### 配置

- [ ] GitHub Secret `NPM_TOKEN` 已配置
- [ ] `package.json` 版本号将自动更新，无需手动修改
- [ ] `.github/workflows/release.yml` 配置正确

### 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号（MAJOR）**：不兼容的 API 修改
- **次版本号（MINOR）**：向下兼容的功能性新增
- **修订号（PATCH）**：向下兼容的问题修正

示例：
- `v1.0.0` - 首次正式发布
- `v1.1.0` - 新增功能
- `v1.1.1` - 修复 Bug
- `v2.0.0` - 重大版本更新，可能包含破坏性变更

## 常见问题与故障排除

### Q1: CI/CD 流程失败怎么办？

**排查步骤**：

1. 访问 GitHub 仓库的 **Actions** 标签页
2. 查看失败的工作流运行记录
3. 点击失败的步骤查看详细日志
4. 根据错误信息定位问题

**常见失败原因**：

- **NPM_TOKEN 未配置**：检查 GitHub Secret 是否正确设置
- **二进制文件缺失**：确认已执行编译脚本并提交
- **网络问题**：重新运行工作流
- **版本号冲突**：确认 npm 上该版本不存在

### Q2: npm 发布失败，提示 "403 Forbidden"

**原因**：NPM_TOKEN 权限不足或已过期

**解决方法**：
1. 登录 npmjs.com
2. 重新生成 Automation Token
3. 更新 GitHub Secret `NPM_TOKEN`
4. 重新运行工作流

### Q3: 如何回滚已发布的版本？

**npm 包回滚**：

```bash
# 取消发布该版本（慎用！）
npm unpublish @adminck/pb2ts@1.0.0
```

> **注意**：npm 建议使用新版本修复问题，而不是 unpublish。unpublish 只能在发布 72 小时内执行。

**推荐做法**：
- 发布修复版本（如 `v1.0.1`）
- 在 Release Notes 中说明修复内容
- 引导用户升级到新版本

### Q4: 二进制文件未正确包含在 npm 包中

**原因**：`package.json` 的 `files` 字段配置错误

**解决方法**：
1. 检查 `packages/pb2ts/package.json` 中是否包含 `"bin"`
2. 确认 `scripts/prepare-publish.cjs` 正确执行
3. 查看构建日志确认文件复制成功

### Q5: GitHub Release 未自动创建

**原因**：工作流权限不足或发布 npm 失败

**解决方法**：
1. 检查 `.github/workflows/release.yml` 中的 `permissions` 设置
2. 确认 `GITHUB_TOKEN` 有足够权限（默认配置已满足）
3. 确保 npm 发布成功后再创建 Release

### Q6: 如何在发布前测试 CI/CD 流程？

**方法一：使用测试 Tag**

```bash
# 创建测试 Tag（会触发发布流程）
git tag v1.0.0-test
git push origin v1.0.0-test

# 测试完成后删除本地 Tag
git tag -d v1.0.0-test
```

**方法二：在本地执行准备脚本**

```bash
# 执行发布准备
node scripts/prepare-publish.cjs

# 构建包
cd packages/pb2ts
pnpm run build

# 检查生成的文件
ls -la
ls -la bin/
ls -la scripts/
```

### Q7: 如何添加新的支持平台？

**步骤**：

1. 修改 `scripts/build-all-platforms.cjs`，添加新平台的编译配置
2. 本地测试编译新平台二进制文件
3. 提交代码并推送到远程
4. 创建 Tag 触发发布流程
5. 验证新平台二进制文件已包含在 npm 包中

### Q8: 文档中的语言切换链接不生效

**原因**：文件名或路径错误

**解决方法**：
1. 检查 `scripts/prepare-publish.cjs` 中的文件名配置
2. 确认 `README.md` 和 `README_EN.md` 存在于根目录
3. 查看生成的文件内容确认链接格式正确

## 二进制文件列表

发布的 npm 包包含以下平台的二进制文件：

| 文件名 | 平台 | 架构 | 大小（约） |
|--------|------|------|-----------|
| `pb2ts-parser-windows-amd64.exe` | Windows | AMD64 (x64) | ~8 MB |
| `pb2ts-parser-windows-arm64.exe` | Windows | ARM64 | ~7.5 MB |
| `pb2ts-parser-linux-amd64` | Linux | AMD64 (x64) | ~7.8 MB |
| `pb2ts-parser-linux-arm64` | Linux | ARM64 | ~7.5 MB |
| `pb2ts-parser-darwin-amd64` | macOS | Intel (x64) | ~8 MB |
| `pb2ts-parser-darwin-arm64` | macOS | Apple Silicon (M1/M2/M3) | ~7.6 MB |

这些文件在 npm 安装时会自动复制到 `node_modules/@adminck/pb2ts/bin/` 目录下。

## 相关链接

- **项目仓库**：https://github.com/adminck/pb2ts
- **npm 包地址**：https://www.npmjs.com/package/@adminck/pb2ts
- **GitHub Actions 文档**：https://docs.github.com/en/actions
- **语义化版本规范**：https://semver.org/lang/zh-CN/
- **pnpm 文档**：https://pnpm.io
