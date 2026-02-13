#!/usr/bin/env node

/**
 * WordLog 版本同步脚本
 *
 * 用途：将 version.js 中的版本号同步到 package.json
 * 使用：node scripts/sync-version.js
 * 或：npm run sync-version
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取 version.js
function readVersionFromConfig() {
  const versionPath = path.join(projectRoot, 'src/config/version.js');
  const content = fs.readFileSync(versionPath, 'utf-8');

  // 解析版本号
  const majorMatch = content.match(/major:\s*(\d+)/);
  const minorMatch = content.match(/minor:\s*(\d+)/);
  const patchMatch = content.match(/patch:\s*(\d+)/);
  const buildMatch = content.match(/build:\s*['"](\d+)['"]/);
  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);

  if (!majorMatch || !minorMatch || !patchMatch) {
    log('❌ 无法解析 version.js 中的版本号', 'red');
    process.exit(1);
  }

  return {
    major: parseInt(majorMatch[1]),
    minor: parseInt(minorMatch[1]),
    patch: parseInt(patchMatch[1]),
    build: buildMatch ? buildMatch[1] : '',
    name: nameMatch ? nameMatch[1] : '',
    fullVersion: `v${majorMatch[1]}.${minorMatch[1]}.${patchMatch[1]}`,
  };
}

// 更新 package.json
function updatePackageJson(version) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const oldVersion = packageJson.version;
  packageJson.version = version.fullVersion.replace('v', '');

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  return oldVersion;
}

// 验证版本格式
function validateVersion(version) {
  const { major, minor, patch } = version;

  if (major < 0 || minor < 0 || patch < 0) {
    log('❌ 版本号不能为负数', 'red');
    return false;
  }

  if (major > 99 || minor > 99 || patch > 99) {
    log('⚠️  版本号过大，请确认是否正确', 'yellow');
  }

  return true;
}

// 主函数
function main() {
  log('\n📦 WordLog 版本同步工具\n', 'blue');

  // 读取版本配置
  log('📖 读取 src/config/version.js...', 'reset');
  const version = readVersionFromConfig();

  // 验证版本
  if (!validateVersion(version)) {
    process.exit(1);
  }

  // 显示当前版本
  log(`\n当前版本信息:`, 'blue');
  log(`  版本号: ${version.fullVersion}`, 'green');
  log(`  版本名: ${version.name}`, 'green');
  log(`  构建号: ${version.build}`, 'green');

  // 更新 package.json
  log(`\n📝 更新 package.json...`, 'reset');
  const oldVersion = updatePackageJson(version);

  log(`  ${oldVersion} → ${version.fullVersion.replace('v', '')}`, 'green');

  // 完成
  log(`\n✅ 版本同步完成！\n`, 'green');

  // 提示
  log('💡 记得同时更新以下文件:', 'yellow');
  log('  - CHANGELOG.md (添加更新记录)');
  log('  - src/components/ChangelogModal.jsx (添加更新条目)\n');
}

// 运行
main();
