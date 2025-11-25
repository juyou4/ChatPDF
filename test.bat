@echo off
echo ========================================
echo ChatPDF 系统测试和修复
echo ========================================
echo.

REM 测试后端
echo [1/5] 测试后端连接...
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 后端运行正常
) else (
    echo ❌ 后端未运行，正在启动...
    cd backend
    start "ChatPDF Backend" cmd /k "venv\Scripts\activate.bat && python app.py"
    cd ..
    timeout /t 5 >nul
)

echo.
echo [2/5] 测试模型API...
curl -s http://localhost:8000/models > models_test.json
if %ERRORLEVEL% EQU 0 (
    echo ✅ 模型API正常
    type models_test.json
) else (
    echo ❌ 模型API失败
)

echo.
echo [3/5] 检查前端依赖...
cd frontend
if not exist "node_modules\html2canvas" (
    echo ❌ 缺少html2canvas，正在安装...
    npm install html2canvas
) else (
    echo ✅ 前端依赖完整
)

echo.
echo [4/5] 检查后端依赖...
cd ..\backend
call venv\Scripts\activate.bat
python -c "import PyPDF2; import fastapi; import httpx; print('✅ Python依赖完整')" 2>nul || (
    echo ❌ Python依赖缺失，正在安装...
    pip install -r requirements.txt
)

cd ..

echo.
echo [5/5] 测试完成
echo.
echo ========================================
echo 诊断结果
echo ========================================
echo.
echo 如果看到所有✅，系统正常
echo 如果有❌，请查看上面的错误信息
echo.
echo 现在请：
echo 1. 打开浏览器访问 http://localhost:3000
echo 2. 按F12打开开发者工具
echo 3. 查看Console是否有错误
echo.
pause
