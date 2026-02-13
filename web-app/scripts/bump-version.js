#!/usr/bin/env node

/**
 * WordLog 版本号升级脚本
 *
 * 用途：自动增加版本号并同步到所有文件
 * 使用：
 *   npm run version:patch   # 1.5.0 → 1.5.1
 *   npm run version:minor   # 1.5.0 → 1.6.0
 *   npm run version:major   # 1.5.0 → 2.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取今天的日期（YYYYMMDD 格式）
function getBuildDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 读取当前版本
function readCurrentVersion() {
  const versionPath = path.join(projectRoot, 'src/config/version.js');
  const content = fs.readFileSync(versionPath, 'utf-8');

  const majorMatch = content.match(/major:\s*(\d+)/);
  const minorMatch = content.match(/minor:\s*(\d+)/);
  const patchMatch = content.match(/patch:\s*(\d+)/);
  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);

  return {
    major: parseInt(majorMatch[1]),
    minor: parseInt(minorMatch[1]),
    patch: parseInt(patchMatch[1]),
    name: nameMatch ? nameMatch[1] : '',
  };
}

// 计算新版本号
function bumpVersion(current, type) {
  const newVersion = { ...current };

  switch (type) {
    case 'patch':
      newVersion.patch += 1;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    default:
      log('❌ 未知的版本类型: ' + type, 'red');
      log('   请使用: patch, minor, 或 major', 'yellow');
      process.exit(1);
  }

  return newVersion;
}

// 更新 version.js
function updateVersionConfig(version) {
  const versionPath = path.join(projectRoot, 'src/config/version.js');
  let content = fs.readFileSync(versionPath, 'utf-8');

  // 更新版本号
  content = content.replace(/major:\s*\d+/, `major: ${version.major}`);
  content = content.replace(/minor:\s*\d+/, `minor: ${version.minor}`);
  content = content.replace(/patch:\s*\d+/, `patch: ${version.patch}`);
  content = content.replace(/build:\s*['"]\d+['"]/, `build: '${getBuildDate()}'`);

  // 更新版本名称（可以手动编辑）
  if (version.name) {
    content = content.replace(/name:\s*['"][^'"]+['"]/, `name: '${version.name}'`);
  }

  fs.writeFileSync(versionPath, content);
}

// 更新 package.json
function updatePackageJson(version) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  packageJson.version = `${version.major}.${version.minor}.${version.patch}`;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

// 主函数
function main() {
  const type = process.argv[2];

  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    log('\n❌ 用法: npm run version:patch|minor|major\n', 'red');
    process.exit(1);
  }

  log('\n📦 WordLog 版本升级工具\n', 'blue');

  // 读取当前版本
  const current = readCurrentVersion();
  const currentStr = `v${current.major}.${current.minor}.${current.patch}`;

  log(`📖 当前版本: ${currentStr}`, 'cyan');

  // 计算新版本
  const newVersion = bumpVersion(current, type);
  const newStr = `v${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;

  // 更新文件
  updateVersionConfig(newVersion);
  updatePackageJson(newVersion);

  // 显示结果
  log(`\n✅ 版本已升级!`, 'green');
  log(`  ${currentStr} → ${newStr}`, 'cyan');
  log(`  构建日期: ${getBuildDate()}\n`, 'cyan');

  // 提示
  log('💡 接下来请:', 'yellow');
  log('  1. 编辑 src/config/version.js 更新版本名称');
  log('  2. 更新 CHANGELOG.md 添加更新记录');
  log('  3. 更新 src/components/ChangelogModal.jsx 添加更新条目');
  log('  4. 运行 npm run sync-version 验证\n');
}

// 运行
main();
