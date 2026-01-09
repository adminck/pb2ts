const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'bin');
const platform = process.platform;
const arch = process.arch;

// 确保 bin 目录存在
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// 确定输出文件名
let outputName = 'pb2ts-parser';
if (platform === 'win32') {
  outputName = 'pb2ts-parser.exe';
}

const outputPath = path.join(binDir, outputName);

console.log(`正在为 ${platform}-${arch} 构建 pb2ts...`);

try {
  // 设置构建变量
  const version = require('../package.json').version;
  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  const date = new Date().toISOString().split('T')[0];

  // 构建命令
  const buildCmd = `go build -ldflags "-X main.version=${version} -X main.commit=${commit} -X main.date=${date}" -o ${outputPath} ./cmd/main.go`;

  execSync(buildCmd, { stdio: 'inherit', cwd: path.join(__dirname, '..', 'go_pb_parser') });
  console.log(`✓ 构建成功: ${outputPath}`);
} catch (error) {
  console.error('构建失败:', error.message);
  process.exit(1);
}

