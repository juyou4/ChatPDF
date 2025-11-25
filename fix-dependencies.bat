@echo off
chcp 65001 >nul
echo 🔧 修复 ChatPDF 依赖问题
echo ================================

cd /d "%~dp0"

echo.
echo 📦 步骤1: 清理现有依赖...
cd frontend
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)

echo.
echo 📥 步骤2: 重新安装依赖...
call npm install

echo.
echo 📥 步骤3: 安装 html2canvas (截图功能)...
call npm install html2canvas

echo.
echo ✅ 前端依赖修复完成!
echo.
echo 📝 步骤4: 检查后端依赖...
cd ..\backend

if not exist venv (
    echo 创建Python虚拟环境...
    python -m venv venv
)

echo 激活虚拟环境并安装依赖...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo ✅ 所有依赖修复完成!
echo.
echo 🚀 现在可以运行应用:
echo    cd ..
echo    start.bat

pause
