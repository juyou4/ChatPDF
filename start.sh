#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 正在启动 ChatPDF Pro...${NC}"

# ==================== 后端检查与启动 ====================
echo -e "${BLUE}📦 检查后端依赖...${NC}"

# 检查是否安装了 python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3"
    exit 1
fi

# 安装后端依赖
echo "正在安装/更新后端依赖..."
pip3 install -r backend/requirements.txt

# 启动后端 (后台运行)
echo -e "${GREEN}🔥 启动后端服务...${NC}"
python3 backend/app.py &
BACKEND_PID=$!

# ==================== 前端检查与启动 ====================
echo -e "${BLUE}📦 检查前端依赖...${NC}"

cd frontend

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装前端依赖 (这可能需要几分钟)..."
    npm install
fi

# 启动前端
echo -e "${GREEN}✨ 启动前端界面...${NC}"
echo "按 Ctrl+C 停止所有服务"
npm run dev

# ==================== 清理工作 ====================
# 当脚本退出时，杀掉后端进程
kill $BACKEND_PID
