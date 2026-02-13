# 部署前检查清单

每次发布新版本到线上（推代码触发 Vercel 部署，或手动 Redeploy）前，请完成下面步骤，保证**产品更新说明**与版本号一致。

---

## 1. 更新产品更新说明（三处）

### ① `web-app/CHANGELOG.md`
- 打开文件，在 **「版本历史」** 下、**第一条** 前面新增一条。
- 格式示例：
  ```markdown
  ### v1.11.0 (2026-02-13) - 本版主题名
  **主题：一句话描述**

  #### ✨ 新功能
  - 功能一
  - 功能二

  #### 🔧 改进
  - 改进一

  #### 🐛 修复
  - 修复一

  ---
  ```
- 把文件顶部的 **「当前版本」** 改成新版本号（如 `v1.11.0`）。

### ② `web-app/src/config/version.js`
- 修改：
  - `major` / `minor` / `patch`（如 1, 11, 0）
  - `build`：日期 YYYYMMDD，如 `'20260213'`
  - `name`：本版主题名，如 `'查词/生图/导出与保存逻辑优化'`

### ③ `web-app/src/components/ChangelogModal.jsx`
- 在 **`CHANGELOG`** 数组的**最前面**（第一个元素）新增一条：
  ```js
  {
    date: '2026-02-13',
    version: 'v1.11.0',
    name: '本版主题名',
    items: [
      { type: 'feature', icon: Sparkles, text: '新功能描述' },
      { type: 'improvement', icon: Zap, text: '改进描述' },
      { type: 'fix', icon: Bug, text: '修复描述' },
    ]
  },
  ```
- `type` 可选：`'feature'` / `'improvement'` / `'fix'`  
- `icon` 可选：`Sparkles` / `Zap` / `Settings` / `Image` / `Bug` 等（文件顶部已 import）。

---

## 2. 部署

- **方式 A**：改完代码后 `git add` → `git commit` → `git push`，等 Vercel 自动部署。
- **方式 B**：在 Vercel 后台 Deployments 里对最新一次部署点 **Redeploy**（仅环境变量或未改代码时用）。

---

## 3. 验证

- 打开线上站点，点底部 **版本号**，应弹出更新记录弹窗，且**第一条**是本次更新内容。
- 版本号与 `version.js` 中一致。

---

以后每次要发版，先按清单更新上述三处，再部署即可。
