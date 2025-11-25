@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo           ChatPDF Pro - 一键启动脚本
echo ===================================================

:: 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Python，请先安装 Python 3.8+
    pause
    exit /b
)

echo [1/4] 检查并安装后端依赖...
pip install -r backend/requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] 后端依赖安装失败
    pause
    exit /b
)

echo [2/4] 启动后端服务...
start "ChatPDF Backend" cmd /k "python backend/app.py"

echo [3/4] 检查前端依赖...
cd frontend
if not exist "node_modules" (
    echo 首次运行，正在安装前端依赖...
    call npm install
)

echo [4/4] 启动前端界面...
echo.
echo 服务已启动！
echo - 后端运行在: http://127.0.0.1:8000
echo - 前端运行在: http://localhost:3000
echo.
echo 请勿关闭弹出的后端窗口。
echo 按任意键退出此窗口（服务将继续运行）...

npm run dev
