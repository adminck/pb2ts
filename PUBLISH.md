# 发布指南

## 发布到 npm

### 1. 准备发布

确保所有更改已提交并推送到 GitHub：

```bash
git add .
git commit -m "准备发布 v1.0.0"
git push origin main
```

### 2. 更新版本号

更新 `package.json` 中的版本号：

```bash
npm version patch  # 补丁版本 (1.0.0 -> 1.0.1)
npm version minor  # 次要版本 (1.0.0 -> 1.1.0)
npm version major  # 主要版本 (1.0.0 -> 2.0.0)
```

### 3. 构建二进制文件

为不同平台构建二进制文件：

```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o bin/pb2ts.exe ./cmd/main.go

# Linux
GOOS=linux GOARCH=amd64 go build -o bin/pb2ts ./cmd/main.go

# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o bin/pb2ts ./cmd/main.go

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o bin/pb2ts ./cmd/main.go
```

或者使用构建脚本：

```bash
npm run build
```

### 4. 测试

在发布前进行测试：

```bash
# 本地测试
npm link
pb2ts -version

# 测试生成
pb2ts -init
pb2ts -proto ./proto -output ./test-output
```

### 5. 发布到 npm

```bash
# 登录 npm（如果还没有）
npm login

# 发布
npm publish

# 或者发布到测试环境
npm publish --tag beta
```

### 6. 创建 GitHub Release

1. 在 GitHub 上创建新的 Release
2. 标签版本号（例如：v1.0.0）
3. 添加发布说明
4. 上传预编译的二进制文件（可选）

## 多平台构建脚本

创建一个 `scripts/build-all.js` 来构建所有平台：

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platforms = [
  { os: 'windows', arch: 'amd64', ext: '.exe' },
  { os: 'linux', arch: 'amd64', ext: '' },
  { os: 'darwin', arch: 'amd64', ext: '' },
  { os: 'darwin', arch: 'arm64', ext: '' },
];

const binDir = path.join(__dirname, '..', 'bin');
const version = require('../package.json').version;

platforms.forEach(({ os, arch, ext }) => {
  const outputName = `pb2ts${ext}`;
  const outputPath = path.join(binDir, `${os}-${arch}`, outputName);
  
  console.log(`构建 ${os}-${arch}...`);
  
  execSync(`GOOS=${os} GOARCH=${arch} go build -o ${outputPath} ./cmd/main.go`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  
  console.log(`✓ ${outputPath}`);
});
```

## 注意事项

1. **版本号**：遵循语义化版本控制（SemVer）
2. **CHANGELOG**：更新 CHANGELOG.md 记录更改
3. **文档**：确保 README.md 是最新的
4. **测试**：确保所有测试通过
5. **许可证**：确保 LICENSE 文件正确

## 发布检查清单

- [ ] 代码已测试
- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] README 已更新
- [ ] 二进制文件已构建
- [ ] npm 登录状态正常
- [ ] 已创建 Git 标签
- [ ] 已推送到 GitHub

