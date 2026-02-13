#!/bin/bash

# Obsidian Local REST API 插件安装助手
# 这个脚本会尝试打开 Obsidian 并导航到插件设置页面

echo "🔧 Obsidian 插件安装助手"
echo "=============================="
echo ""

# 检查 Obsidian 是否安装
if [ -d "/Applications/Obsidian.app" ]; then
    echo "✅ 检测到 Obsidian 已安装"
else
    echo "❌ 未检测到 Obsidian"
    echo "请先从 https://obsidian.md 下载并安装 Obsidian"
    echo ""
    echo "按回车键打开下载页面..."
    read
    open "https://obsidian.md/"
    exit 1
fi

# 检查 vault 路径
VAULT_PATH="$HOME/Documents/obsidian/sometime"

if [ -d "$VAULT_PATH" ]; then
    echo "✅ 检测到 Vault: $VAULT_PATH"
else
    echo "⚠️  未检测到 Vault: $VAULT_PATH"
    echo "请确认你的 Obsidian vault 路径"
    echo ""
    echo "当前检测到其他 Obsidian 目录："
    find "$HOME/Documents/obsidian" -maxdepth 1 -type d 2>/dev/null || echo "  未找到其他目录"
    echo ""
    read -p "请输入你的 vault 路径: " CUSTOM_PATH
    if [ -d "$CUSTOM_PATH" ]; then
        VAULT_PATH="$CUSTOM_PATH"
    else
        echo "❌ 路径不存在，退出"
        exit 1
    fi
fi

echo ""
echo "📋 安装步骤："
echo ""
echo "1️⃣  Obsidian 会自动打开"
echo "2️⃣  进入 设置 → 第三方插件"
echo "3️⃣  关闭「安全模式」"
echo "4️⃣  点击「浏览」"
echo "5️⃣  搜索「Local REST API」"
echo "6️⃣  点击安装并启用"
echo "7️⃣  勾选「Enable REST API」"
echo ""
read -p "按回车键继续..."
echo ""

# 打开 Obsidian
echo "🚀 正在打开 Obsidian..."
open -a "Obsidian" "$VAULT_PATH"

# 等待 Obsidian 启动
sleep 3

# 在 macOS 上尝试使用 AppleScript 自动化（如果可用）
if command -v osascript &> /dev/null; then
    echo "🤖 尝试自动化导航..."

    osascript <<EOF
tell application "Obsidian"
    activate
end tell

delay 2

tell application "System Events"
    keystroke "," using command down
    delay 1
end tell
EOF

    echo "✅ 已打开设置窗口"
    echo ""
    echo "接下来请："
    echo "1. 点击「第三方插件」"
    echo "2. 关闭「安全模式」"
    echo "3. 点击「浏览」"
    echo "4. 搜索「Local REST API」并安装"
else
    echo "⚠️  无法自动化，请手动操作"
fi

echo ""
echo "💡 安装完成后，访问以下地址测试连接："
echo "   http://localhost:3001/setup-obsidian.html"
echo ""
echo "✨ 完成！"
