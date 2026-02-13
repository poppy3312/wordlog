# Chrome Extension Icons

此目录需要放置插件图标文件。

## 所需文件

- `icon16.png` - 16x16 像素（工具栏）
- `icon48.png` - 48x48 像素（扩展管理页）
- `icon128.png` - 128x128 像素（Chrome 网上应用店）

## 设计规格

### 主色调
- 温暖橙色: #D97757
- 悬浮状态: #C96747
- 激活状态: #B95737

### 设计元素
- 书本图标 📚
- 字母 "W"
- 简洁、现代、易识别

### 格式要求
- PNG 格式
- 透明背景
- 高分辨率导出

## 快速生成

可以使用以下 SVG 代码转换为 PNG：

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="128" height="128" rx="24" fill="#D97757"/>

  <!-- 书本图标 -->
  <path d="M32 36 L64 36 L64 96 L32 96 Z" fill="white" opacity="0.9"/>
  <path d="M64 36 L96 36 L96 96 L64 96 Z" fill="white" opacity="0.7"/>
  <path d="M64 36 L64 96" stroke="#D97757" stroke-width="2"/>

  <!-- 字母 W -->
  <text x="64" y="82" font-family="Arial, sans-serif" font-size="32"
        font-weight="bold" fill="white" text-anchor="middle">W</text>
</svg>
```

## 在线工具

- **Figma**: 在线设计工具
- **Canva**: 简单易用的设计平台
- **Photopea**: 免费在线 Photoshop
- **CloudConvert**: SVG 转 PNG

## 临时方案

开发阶段可以使用纯色占位图标：
```bash
# 使用 ImageMagick 生成纯色图标
convert -size 128x128 xc:#D97757 -gravity center -pointsize 64 -fill white -annotate 0 'W' icon128.png
```
