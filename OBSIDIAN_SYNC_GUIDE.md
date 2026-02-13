# Obsidian 同步设置指南

WordLog 支持自动同步单词到 Obsidian，让你在 Obsidian 中管理和复习单词。

## 前置要求

### 1. 安装 Obsidian
- 下载地址：https://obsidian.md/
- 支持Windows、macOS、Linux

### 2. 安装 Local REST API 插件

**步骤：**

1. 打开 Obsidian
2. 进入 **设置** → **第三方插件** → **浏览**
3. 搜索 "Local REST API"
4. 点击安装并启用

### 3. 配置 REST API

**步骤：**

1. 在 Obsidian 设置中找到 "Local REST API" 插件设置
2. 启用以下选项：
   - ✅ **Enable REST API**
   - API 端口：默认 `27124`（可自定义）
3. 重启 Obsidian 使设置生效

## WordLog 设置

### 1. 打开 WordLog 设置

点击右上角的 **设置** 图标

### 2. 配置 Obsidian 同步

在设置页面找到 "Obsidian 同步" 部分：

#### 启用自动同步
- 打开开关，添加单词时自动同步到 Obsidian

#### 配置选项

| 选项 | 说明 | 示例 |
|------|------|------|
| **Vault 路径** | Obsidian 库的文件路径 | `~/Documents/obsidian/sometime` |
| **子文件夹** | 单词笔记存放的子文件夹 | `WordLog` |
| **笔记格式** | 选择笔记模板格式 | `闪卡` / `简洁` / `完整` |

#### 保存配置
点击 **保存** 按钮保存配置

## 批量同步

如果你之前已经添加了很多单词，可以一次性同步到 Obsidian：

1. 在设置页面找到 **Obsidian 同步**
2. 点击 **立即同步所有单词** 按钮
3. 等待同步完成

## 笔记格式说明

### 闪卡格式（推荐）
```markdown
---
tags: [wordlog/英语, 单词本/名词]
cssclass: flashcard
created: 2026-02-05T08:00:00.000Z
source: webapp
---

# example

## 音标
/ɪɡˈzæmpl/

## 词性
名词

## 释义
例子；榜样

## 例句
> This is an example.
>
> 这是一个例子。

---
<!--SR:!2026-02-05,1,270-->
```

**兼容插件：**
- Obsidian Flashcards
- Spaced Repetition

### 简洁格式
```markdown
# example

**音标**: /ɪɡˈzæmpl/
**词性**: 名词
**释义**: 例子；榜样

## 例句
> This is an example.
>
> 这是一个例子。

---
**添加时间**: 2026/2/5 08:00:00
**来源**: webapp
```

### 完整格式
包含所有可用字段，适合需要详细信息的用户。

## 使用场景

### 1. 闪卡学习
使用 Obsidian Flashcards 插件，将单词笔记转换为闪卡：
- 正面：单词
- 背面：释义、例句

### 2. 间隔复习
配合 Spaced Repetition 插件：
- 基于遗忘曲线自动安排复习
- `<!--SR:...-->` 注释记录复习状态

### 3. 知识管理
- 使用标签系统分类单词
- 在 Obsidian 中建立词汇网络
- 链接相关概念和例句

## 常见问题

### Q: 同步失败怎么办？
**A:**
1. 检查 Obsidian 是否正在运行
2. 确认 REST API 插件已启用
3. 检查 API 端口是否正确（默认 27124）
4. 查看 WordLog 设置中的 API 连接状态

### Q: 能否修改笔记模板？
**A:** 可以！模板文件位于：
```
/web-app/src/utils/obsidianSync.js
```

修改 `FLASHCARD_TEMPLATE` 或 `SIMPLE_TEMPLATE` 函数即可自定义模板。

### Q: 同步时会覆盖已有笔记吗？
**A:** 当前版本会覆盖。建议先备份 Obsidian 中的重要数据。

### Q: 支持哪些 Obsidian 插件？
**A:**
- ✅ Local REST API（必需）
- ✅ Obsidian Flashcards
- ✅ Spaced Repetition
- ✅ Dataview

## 技术支持

遇到问题？
1. 查看 WordLog 设置中的 API 状态
2. 打开浏览器控制台查看错误信息
3. 检查 Obsidian REST API 插件日志

---

**版本**: v1.3.0
**更新日期**: 2026-02-05
