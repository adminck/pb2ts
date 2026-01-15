# 发布流程说明

## 自动发版流程

本项目使用 GitHub Actions 自动发布版本，流程如下：

### 1. 本地准备

在本地完成以下步骤：

1. **编译所有平台的 Go 二进制文件**：
   ```bash
   node scripts/build-all-platforms.js
   ```

2. **提交代码到仓库**：
   ```bash
   git add .
   git commit -m "chore: build all platform binaries"
   git push origin master
   ```

### 2. 创建 Tag

在 GitHub 上手动创建一个新的 tag：

1. 进入 GitHub 仓库页面
2. 点击 **Releases** → **Create a new release**
3. 选择或输入新的 tag（例如：`v1.0.0`）
4. 填写 Release title 和 Release notes（可选）
5. 点击 **Publish release**

> **注意**：GitHub Actions 会自动根据 tag 版本号（如 `v1.0.0`）更新 package.json 中的版本号，无需手动修改。

### 3. 自动发布

GitHub Actions 会自动触发并执行以下操作：

- 检出代码
- 从 tag 提取版本号并更新 package.json
- 准备 npm 包（复制二进制文件、README.md 和 README_EN.md）
- 在两个文档开头添加中英文切换链接
- 构建 TypeScript 包
- 发布到 npm（包含完整的中英文文档）
- 创建 GitHub Release 并上传所有二进制文件

### 4. 查看发布结果

- npm 包：https://www.npmjs.com/package/@adminck/pb2ts
- GitHub Release：https://github.com/adminck/pb2ts/releases

## 注意事项

1. **版本号**：GitHub Actions 会自动根据 tag 版本号（如 `v1.0.0`）更新 package.json 中的版本号，无需手动同步
2. **NPM Token**：需要在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置 `NPM_TOKEN`
3. **二进制文件**：确保 `bin/` 目录下包含所有平台的二进制文件，这些文件会被包含在 npm 包中

## 二进制文件列表

发布的 npm 包包含以下平台的二进制文件：

- `pb2ts-parser-windows-amd64.exe`
- `pb2ts-parser-windows-arm64.exe`
- `pb2ts-parser-linux-amd64`
- `pb2ts-parser-linux-arm64`
- `pb2ts-parser-darwin-amd64`
- `pb2ts-parser-darwin-arm64`

这些文件在 npm 安装时会自动复制到 `node_modules/@adminck/pb2ts/bin/` 目录下。
