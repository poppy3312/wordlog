# WordLog 版本管理指南

## 自动化脚本

### 1. 版本同步脚本

将 `src/config/version.js` 中的版本号同步到 `package.json`。

```bash
npm run sync-version
```

**使用场景**：
- 修改了 `version.js` 中的版本号或版本名称后
- 需要确保所有文件的版本号一致

---

### 2. 版本升级脚本

自动增加版本号并同步到所有文件。

```bash
# 补丁版本：修复 bug (1.5.0 → 1.5.1)
npm run version:patch

# 次要版本：新功能 (1.5.0 → 1.6.0)
npm run version:minor

# 主要版本：重大变更 (1.5.0 → 2.0.0)
npm run version:major
```

**使用场景**：
- 发布新版本时自动升级版本号
- 自动更新构建日期为当天日期

---

## 版本发布流程

### 标准发布流程

1. **升级版本号**
   ```bash
   npm run version:patch   # 或 minor/major
   ```

2. **更新版本名称**
   ```javascript
   // 编辑 src/config/version.js
   name: '新版本名称',
   ```

3. **添加更新记录**
   - 更新 `CHANGELOG.md`
   - 更新 `src/components/ChangelogModal.jsx` 的 CHANGELOG 数组

4. **验证同步**
   ```bash
   npm run sync-version
   ```

5. **测试功能**
   - 参考 `CHECKLIST.md` 进行测试

6. **提交代码**
   ```bash
   git add .
   git commit -m "Release v1.5.1 - 版本名称"
   ```

---

## 版本号规则

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

| 版本类型 | 格式 | 含义 | 示例 |
|---------|------|------|------|
| Major | X.0.0 | 破坏性变更，API 不兼容 | 1.0.0 → 2.0.0 |
| Minor | x.X.0 | 新功能，向后兼容 | 1.5.0 → 1.6.0 |
| Patch | x.x.X | 修复 bug，向后兼容 | 1.5.0 → 1.5.1 |

---

## 文件说明

### version.js (主版本源)

版本号的**唯一真实来源**，所有其他文件都从这里读取：

```javascript
// web-app/src/config/version.js
export const VERSION = {
  major: 1,
  minor: 5,
  patch: 0,
  build: '20260206',    // 自动生成
  name: '交互优化更新',  // 手动编辑

  get fullVersion() {
    return `v${this.major}.${this.minor}.${this.patch}`;
  }
};
```

### package.json

npm 包版本号，由 `sync-version.js` 自动同步。

### CHANGELOG.md

对外发布的更新日志，需要手动编辑。

### ChangelogModal.jsx

应用内显示的更新记录，需要手动编辑 `CHANGELOG` 数组。

---

## 注意事项

1. **version.js 是版本源**
   - 始终在 `version.js` 中修改版本号
   - 然后运行 `npm run sync-version` 同步

2. **版本名称手动编辑**
   - 脚本只更新版本号
   - 版本名称需要手动填写

3. **更新记录手动添加**
   - CHANGELOG.md 和 ChangelogModal.jsx 需要手动编辑
   - 记录本次版本的具体改动

4. **发布前测试**
   - 参考 `CHECKLIST.md` 进行完整测试
