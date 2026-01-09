const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'bin');
const binFile = path.join(binDir, process.platform === 'win32' ? 'pb2ts-parser.exe' : 'pb2ts-parser');

// 如果二进制文件不存在，尝试构建
if (!fs.existsSync(binFile)) {
  console.log('pb2ts-parser 二进制文件不存在，正在构建...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (error) {
    console.error('构建失败，请确保已安装 Go 1.18+ 并设置好环境变量');
    console.error('或者从 GitHub Releases 下载预编译的二进制文件');
    process.exit(1);
  }
}

// 设置执行权限（Unix 系统）
if (process.platform !== 'win32') {
  try {
    fs.chmodSync(binFile, '755');
  } catch (error) {
    // 忽略错误
  }
}

console.log('pb2ts 安装完成！');

