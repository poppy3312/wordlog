# Vercel 配置指南（查词 API Key）

你的项目已经通过 Git 和 Vercel 连好了：**推代码 → 自动部署**。  
要启用「服务端查词」，只需要在 Vercel 网页里加两个环境变量，不用改 Git。

---

## ⚠️ 每次部署前：更新产品更新说明

每次要部署新版本时，请先更新以下三处，再推代码或 Redeploy，这样用户点底部版本号看到的更新说明才是最新的：

1. **`web-app/CHANGELOG.md`**  
   - 在「版本历史」最上方增加一条新版本（如 v1.11.0），写上日期、主题、新功能/改进/修复。

2. **`web-app/src/config/version.js`**  
   - 修改 `major` / `minor` / `patch`、`build`（如 20260213）、`name`（本版主题名）。

3. **`web-app/src/components/ChangelogModal.jsx`**  
   - 在 `CHANGELOG` 数组最前面加一条对象：`date`、`version`、`name`、`items`（若干条 `{ type, icon, text }`）。

详细步骤可参考项目里的 **`DEPLOY_CHECKLIST.md`**。

---

## 第一步：打开 Vercel 并进入项目

1. 浏览器打开：**https://vercel.com**
2. 登录你的账号（用 GitHub / 邮箱 等）
3. 在 **Dashboard** 里找到并点进 **thewordlog** 这个项目（就是你现在线上在用的那个）

---

## 第二步：打开环境变量设置

1. 进入项目后，点顶部的 **「Settings」**（设置）
2. 左侧菜单里找到 **「Environment Variables」**（环境变量），点进去

![位置：Settings → Environment Variables]

---

## 第三步：添加 GLM API Key

1. 在 **Key** 输入框里填：`GLM_API_KEY`
2. 在 **Value** 输入框里填：你的**智谱 GLM-4 的 API Key**（从智谱开放平台复制）
3. **Environment** 勾选：**Production**（必选）。如果希望预览环境也能查词，可以再勾选 Preview。
4. 点 **「Save」** 保存

（可选）如果要备用 MiniMax：
- 再点一次 **「Add New」**
- Key 填：`MINIMAX_API_KEY`
- Value 填：你的 MiniMax API Key
- 同样勾选 Production，保存

---

## 第四步：重新部署一次

环境变量只在**新部署**时生效，所以要触发一次部署：

**方式 A（推荐）**  
- 点顶部 **「Deployments」**
- 找到**最新一条**部署记录，右侧点 **「⋯」** 三个点
- 选 **「Redeploy」**，再点 **「Redeploy」** 确认  
→ 会用当前代码 + 刚填的环境变量重新部署

**方式 B**  
- 在本地随便做一个小改动（比如在 README 里加个空格），然后：
  - `git add .`
  - `git commit -m "trigger deploy"`
  - `git push`
→ 会像平时一样触发一次自动部署

---

## 第五步：验证是否生效

1. 等部署状态变成 **Ready**（约 1～2 分钟）
2. 打开你的线上站点（如 **thewordlog.vercel.app**）
3. 随便**添加一个不在内置词库里的英文单词**（例如 `serendipity`）
4. 若能看到中文释义，说明服务端查词已生效，Key 配置正确

---

## 常见问题

**Q：找不到 thewordlog 项目？**  
A：确认是用当时「用 Git 发布」时登录的同一个 Vercel 账号；若项目在某个 Team 下，要在该 Team 里找。

**Q：没有 Vercel 账号 / 忘了当时怎么连的？**  
A：若你是通过 GitHub 连的，用同一 GitHub 登录 https://vercel.com ，在 Dashboard 里会看到从该账号导入的项目。

**Q：智谱 API Key 在哪拿？**  
A：打开 https://open.bigmodel.cn/ → 登录 → 控制台 → 创建 API Key，复制即可。

**Q：配置完还是查不到释义？**  
A：先确认已经 **Redeploy** 或重新 push 过；再在 Vercel 的 **Deployments → 最新一次 → 点进去 → Logs** 里看有没有报错（例如 Key 无效、限流等）。

---

配置好一次之后，以后只要在 Vercel 里改环境变量并 Redeploy，不用再动 Git。用户端无需任何配置。
