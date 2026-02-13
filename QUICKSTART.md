# WordLog 快速启动指南

## 🚀 快速开始

### Chrome 插件安装

1. **加载插件**
   ```bash
   # 在 Chrome 浏览器中
   1. 访问 chrome://extensions/
   2. 启用右上角 "开发者模式"
   3. 点击 "加载已解压的扩展程序"
   4. 选择 chrome-extension 文件夹
   ```

2. **刷新插件**
   - 修改代码后，在 chrome://extensions/ 点击刷新按钮

3. **使用插件**
   - 快速添加单词：输入框输入单词，点击添加按钮
   - 查看完整版：点击"打开完整版"按钮
   - 复制单词：点击单词卡片

### Web 应用运行

```bash
# 进入 Web 应用目录
cd web-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3001
```

## 📁 项目结构

```
WordLog-WebApp/
├── chrome-extension/          # Chrome 插件
│   ├── manifest.json         # ✅ 插件配置
│   ├── background.js         # ✅ 后台服务
│   ├── content.js            # ✅ 内容脚本
│   ├── popup.html/js         # ✅ 弹出窗口
│   ├── styles.css            # ✅ 样式
│   └── wordForms.js          # ✅ 单词时态识别
│
├── web-app/                   # React Web 应用
│   ├── index.html            # ✅ 入口 HTML
│   ├── package.json          # ✅ 依赖配置
│   ├── vite.config.js        # ✅ Vite 配置
│   ├── tailwind.config.js    # ✅ Tailwind 配置
│   └── src/
│       ├── App.jsx            # ✅ 主应用组件
│       ├── main.jsx           # ✅ React 入口
│       ├── config/
│       │   └── version.js     # ✅ 版本配置
│       ├── pages/
│       │   └── WordList.jsx    # ✅ 单词列表页
│       ├── components/
│       │   ├── WordCard.jsx            # ✅ 单词卡片
│       │   ├── WordDetailModal.jsx    # ✅ 单词详情弹窗
│       │   ├── AddWordModal.jsx       # ✅ 添加单词弹窗
│       │   ├── SettingsModal.jsx      # ✅ 设置弹窗
│       │   ├── ChangelogModal.jsx     # ✅ 更新记录弹窗
│       │   └── Toast.jsx              # ✅ Toast 提示
│       ├── store/
│       │   └── useWordStore.js        # ✅ Zustand 状态管理
│       └── utils/
│           ├── export.js              # ✅ 导出功能
│           ├── chromeStorage.js       # ✅ Chrome 存储
│           ├── dictionaryAPI.js       # ✅ 词典 API
│           └── wordForms.js           # ✅ 单词时态识别
│
├── CHANGELOG.md               # ✅ 更新日志
├── QUICKSTART.md               # ✅ 本文件
└── README.md                   # ✅ 项目文档
```

## ✅ 功能清单

### Chrome 插件
- [x] 快速添加单词
- [x] 单词列表展示（最近5个）
- [x] 单词详情查看（点击单词）
- [x] 单词删除（右键菜单）
- [x] 单词复制（点击复制）
- [x] 自动转换为原形（ran → run）
- [x] 打开完整版按钮
- [x] Toast 提示

### Web 应用
#### 核心功能
- [x] 添加单词（Command+E 快捷键）
- [x] 智能搜索（搜不到自动添加，已存在自动置顶）
- [x] 单词列表展示
- [x] 单词详情弹窗
- [x] 时态形式展示（过去式、分词等）
- [x] 时态发音（点击听发音）
- [x] 例句单词可点击查看
- [x] 删除单词
- [x] 复制单词（带反馈提示）

#### 数据管理
- [x] 统计数据（总单词、今日新增）
- [x] 导出功能（TXT、CSV、MD）
- [x] 批量刷新释义
- [x] 数据清空（二次确认）
- [x] 配图导入

#### 界面优化
- [x] 主题切换（浅色/深色）
- [x] 响应式设计
- [x] 搜索框居中显示
- [x] 版本号点击查看更新记录
- [x] 弹窗滚动锁定
- [x] 空状态页面
- [x] 加载骨架屏

#### 语音功能
- [x] 单词发音
- [x] 例句朗读
- [x] 时态形式发音
- [x] 音频加载状态反馈

#### 单词时态识别
- [x] 100+ 不规则动词识别（ran → run）
- [x] 规则变化识别（-ed, -ing, -s）
- [x] 自动保存原形
- [x] 详情页展示所有时态
- [x] 自动数据迁移

## 🎨 设计规范

- **主色调**: #D97757 (温暖橙色)
- **字体**: Inter
- **圆角**: 6px / 8px / 12px
- **间距**: 8px / 16px / 24px
- **阴影**: 多层次系统

## 🔧 技术栈

### Chrome 插件
- Vanilla JS + CSS3
- Chrome Storage API
- Manifest V3

### Web 应用
- React 18
- Vite
- Tailwind CSS
- Zustand
- Lucide React
- Web Speech API

## 🎯 快捷键

| 快捷键 | 功能 |
|--------|------|
| Command+E / Ctrl+E | 打开添加单词弹窗 |
| ESC | 关闭弹窗 |
| Enter | 搜索/添加单词 |

## 📝 待办事项

### 功能增强
- [ ] Anki 导出格式
- [ ] 单词测试/复习功能
- [ ] 云端同步
- [ ] 学习进度统计

### 技术优化
- [ ] 单词卡片配图生成
- [ ] 例句翻译
- [ ] 批量导入单词

## 🐛 常见问题

### 插件无法加载
1. 检查 manifest.json 路径是否正确
2. 查看 Chrome 扩展页面的错误信息
3. 尝试禁用后重新启用

### Web 应用无法启动
1. 确保已安装依赖 `npm install`
2. 检查 Node.js 版本（建议 18+）
3. 清除缓存 `rm -rf node_modules && npm install`

### 搜索功能不工作
- 确保按 Enter 键触发搜索
- 检查控制台是否有错误

### 弹窗打开时页面滚动
- 已通过滚动锁定机制修复
- 如仍有问题，检查浏览器控制台

## 📞 支持

- 查看 CHANGELOG.md 了解最新更新
- 点击页面底部版本号查看完整更新记录

---

**Happy Coding! 🎉**
