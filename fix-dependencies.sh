#!/bin/bash

echo "🔧 修复 ChatPDF 依赖问题"
echo "================================"

# 进入前端目录
cd "$(dirname "$0")/frontend" || exit 1

echo ""
echo "📦 步骤1: 清理现有依赖..."
rm -rf node_modules
rm -f package-lock.json

echo ""
echo "📥 步骤2: 重新安装依赖..."
npm install

echo ""
echo "📥 步骤3: 安装 html2canvas (截图功能)..."
npm install html2canvas

echo ""
echo "✅ 前端依赖修复完成!"
echo ""
echo "📝 步骤4: 检查后端依赖..."
cd ../backend || exit 1

if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "✅ 所有依赖修复完成!"
echo ""
echo "🚀 现在可以运行应用:"
echo "   cd .."
echo "   ./start.sh"
