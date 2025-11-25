import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, Sparkles, MessageCircle, Settings, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Copy, Bot, X, Camera, Crop, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

const ChatPDF = () => {
  const [docId, setDocId] = useState(null);
  const [docInfo, setDocInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [showSettings, setShowSettings] = useState(false);

  // 截图相关状态
  const [screenshot, setScreenshot] = useState(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [showScreenshotPreview, setShowScreenshotPreview] = useState(false);

  // AI配置
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [apiProvider, setApiProvider] = useState(localStorage.getItem('apiProvider') || 'openai');
  const [model, setModel] = useState(localStorage.getItem('model') || 'gpt-4o');
  const [availableModels, setAvailableModels] = useState({});

  // 功能开关
  const [enableVectorSearch, setEnableVectorSearch] = useState(
    localStorage.getItem('enableVectorSearch') === 'true'
  );
  const [enableStreaming, setEnableStreaming] = useState(
    localStorage.getItem('enableStreaming') === 'true'
  );
  const [enableScreenshot, setEnableScreenshot] = useState(
    localStorage.getItem('enableScreenshot') !== 'false' // 默认开启
  );

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const selectionStartRef = useRef(null);

  const API_BASE_URL = 'http://localhost:8000';

  // 支持视觉的模型列表
  const VISION_MODELS = {
    'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'],
    'anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-sonnet-4-5-20250929'],
    'gemini': ['gemini-pro-vision', 'gemini-2.5-pro', 'gemini-2.5-flash-preview-09-2025'],
    'grok': ['grok-4.1', 'grok-vision-beta']
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiProvider', apiProvider);
    localStorage.setItem('model', model);
  }, [apiKey, apiProvider, model]);

  useEffect(() => {
    localStorage.setItem('enableVectorSearch', enableVectorSearch);
    localStorage.setItem('enableStreaming', enableStreaming);
    localStorage.setItem('enableScreenshot', enableScreenshot);
  }, [enableVectorSearch, enableStreaming, enableScreenshot]);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      const data = await response.json();
      setAvailableModels(data);
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('上传失败');

      const data = await response.json();
      setDocId(data.doc_id);
      setDocInfo(data);

      await loadDocumentContent(data.doc_id);

      setMessages([{
        type: 'system',
        content: `✅ 文档《${data.filename}》上传成功！共 ${data.total_pages} 页。`
      }]);

      generateSummary(data.doc_id);
    } catch (error) {
      alert('上传失败: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const loadDocumentContent = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/document/${id}`);
      const data = await response.json();
      setDocInfo(data);
    } catch (error) {
      console.error('加载文档内容失败:', error);
    }
  };

  const generateSummary = async (id) => {
    if (!apiKey) {
      alert('请先在设置中配置API Key');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: id || docId,
          api_key: apiKey,
          model: model,
          api_provider: apiProvider
        }),
      });

      if (!response.ok) throw new Error('生成摘要失败');

      const data = await response.json();

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: `📝 **文档摘要**\n\n${data.summary}\n\n💡 **建议问题**\n${data.suggested_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      }]);
    } catch (error) {
      alert('生成摘要失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 截图功能 ====================

  // 整页截图
  const captureFullPage = async () => {
    if (!pdfContainerRef.current) return;

    try {
      setIsLoading(true);
      const canvas = await html2canvas(pdfContainerRef.current, {
        useCORS: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const screenshotData = canvas.toDataURL('image/png');
      setScreenshot(screenshotData);
      setShowScreenshotPreview(true);

      alert('✅ 整页截图成功！现在可以向AI提问了。');
    } catch (error) {
      console.error('截图失败:', error);
      alert('截图失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 开始区域选择
  const startAreaSelection = () => {
    setIsSelectingArea(true);
    setSelectionBox(null);
    alert('💡 拖动鼠标选择要截图的区域');
  };

  // 鼠标按下
  const handleMouseDown = (e) => {
    if (!isSelectingArea || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    selectionStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + pdfContainerRef.current.scrollTop
    };
  };

  // 鼠标移动
  const handleMouseMove = (e) => {
    if (!isSelectingArea || !selectionStartRef.current || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top + pdfContainerRef.current.scrollTop;

    const box = {
      left: Math.min(selectionStartRef.current.x, currentX),
      top: Math.min(selectionStartRef.current.y, currentY),
      width: Math.abs(currentX - selectionStartRef.current.x),
      height: Math.abs(currentY - selectionStartRef.current.y)
    };

    setSelectionBox(box);
  };

  // 鼠标释放 - 完成选择
  const handleMouseUp = async () => {
    if (!isSelectingArea || !selectionBox) return;

    setIsSelectingArea(false);
    await captureSelectedArea(selectionBox);
    selectionStartRef.current = null;
    setSelectionBox(null);
  };

  // 截取选中区域
  const captureSelectedArea = async (box) => {
    if (!pdfContainerRef.current) return;

    try {
      setIsLoading(true);

      // 先截取整个容器
      const canvas = await html2canvas(pdfContainerRef.current, {
        useCORS: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 创建新canvas，只包含选中区域
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');

      // 计算实际尺寸（考虑scale=2）
      const scale = 2;
      croppedCanvas.width = box.width * scale;
      croppedCanvas.height = box.height * scale;

      // 裁剪并绘制
      ctx.drawImage(
        canvas,
        box.left * scale,
        box.top * scale,
        box.width * scale,
        box.height * scale,
        0,
        0,
        box.width * scale,
        box.height * scale
      );

      const screenshotData = croppedCanvas.toDataURL('image/png');
      setScreenshot(screenshotData);
      setShowScreenshotPreview(true);

      alert('✅ 区域截图成功！现在可以向AI提问了。');
    } catch (error) {
      console.error('截图失败:', error);
      alert('截图失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除截图
  const clearScreenshot = () => {
    setScreenshot(null);
    setShowScreenshotPreview(false);
  };

  // 发送消息（支持截图）
  const sendMessage = async (customQuestion = null, useSelectedText = false) => {
    const question = customQuestion || inputMessage.trim();
    if (!question || !docId || !apiKey) return;

    // 检查是否有截图且模型支持视觉
    if (screenshot) {
      const supportsVision = VISION_MODELS[apiProvider]?.includes(model);
      if (!supportsVision) {
        alert(`⚠️ 当前模型 ${model} 不支持图片输入。\n\n请选择支持视觉的模型：\n${VISION_MODELS[apiProvider]?.join(', ') || '暂无可用模型'}`);
        return;
      }
    }

    const userMessage = question;
    setInputMessage('');

    const userMsg = {
      type: 'user',
      content: userMessage,
      hasImage: !!screenshot
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setShowTextMenu(false);

    try {
      const requestBody = {
        doc_id: docId,
        question: userMessage,
        api_key: apiKey,
        model: model,
        api_provider: apiProvider,
        selected_text: useSelectedText ? selectedText : null
      };

      // 如果有截图，添加到请求中
      if (screenshot) {
        requestBody.image_base64 = screenshot.split(',')[1]; // 移除 data:image/png;base64, 前缀
      }

      const response = await fetch(`${API_BASE_URL}/chat/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '对话失败');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.answer,
        model: `${availableModels[apiProvider]?.name || apiProvider} - ${model}`
      }]);

      // 发送后清除截图
      if (screenshot) {
        clearScreenshot();
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: '❌ 回答失败: ' + error.message
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && !isSelectingArea) {
      setSelectedText(text);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });

      setShowTextMenu(true);
    } else {
      setShowTextMenu(false);
    }
  };

  const copySelectedText = () => {
    navigator.clipboard.writeText(selectedText);
    setShowTextMenu(false);
    alert('已复制到剪贴板');
  };

  const askAboutSelection = () => {
    sendMessage(`请解释以下内容：\n\n${selectedText}`, true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-md z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-800">ChatPDF Pro</h1>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
              📸 截图版
            </span>
          </div>

          {docInfo && (
            <div className="text-sm text-gray-600">
              📄 {docInfo.filename} ({docInfo.total_pages} 页)
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">⚙️ 设置</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API提供商
                </label>
                <select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.keys(availableModels).map(provider => (
                    <option key={provider} value={provider}>
                      {availableModels[provider]?.name || provider}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型 {VISION_MODELS[apiProvider]?.includes(model) && '📸'}
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {availableModels[apiProvider]?.models &&
                    Object.entries(availableModels[apiProvider].models).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name} {VISION_MODELS[apiProvider]?.includes(key) && '📸'}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的 API Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 功能开关 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">🎛️ 功能开关</h3>
              <div className="space-y-3">
                {/* 向量检索开关 */}
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">🔍 向量检索</div>
                    <div className="text-sm text-gray-600">使用FAISS进行语义搜索，节省60-80% Token</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableVectorSearch}
                    onChange={(e) => setEnableVectorSearch(e.target.checked)}
                    className="w-12 h-6 rounded-full appearance-none bg-gray-300 checked:bg-green-500 relative cursor-pointer transition-colors
                      before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 
                      before:transition-transform checked:before:translate-x-6"
                  />
                </label>

                {/* 流式响应开关 */}
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">⚡ 流式响应</div>
                    <div className="text-sm text-gray-600">实时打字机效果，更流畅的体验</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableStreaming}
                    onChange={(e) => setEnableStreaming(e.target.checked)}
                    className="w-12 h-6 rounded-full appearance-none bg-gray-300 checked:bg-green-500 relative cursor-pointer transition-colors
                      before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 
                      before:transition-transform checked:before:translate-x-6"
                  />
                </label>

                {/* 截图功能开关 */}
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">📸 截图分析</div>
                    <div className="text-sm text-gray-600">启用PDF截图和AI视觉分析功能</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableScreenshot}
                    onChange={(e) => setEnableScreenshot(e.target.checked)}
                    className="w-12 h-6 rounded-full appearance-none bg-gray-300 checked:bg-green-500 relative cursor-pointer transition-colors
                      before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 
                      before:transition-transform checked:before:translate-x-6"
                  />
                </label>
              </div>
            </div>

            {/* 截图功能说明 */}
            {enableScreenshot && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                <p className="font-semibold text-purple-800 mb-1">📸 截图功能说明：</p>
                <p className="text-purple-700">
                  标有 📸 的模型支持图片分析。截图后可以让AI分析PDF中的图表、表格、公式等视觉内容。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {!docId ? (
          // 上传区域
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-4">
                  <Upload className="w-12 h-12 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  上传 PDF 文档
                </h2>
                <p className="text-gray-600">
                  支持截图分析，让AI理解图表、表格、公式
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium text-lg shadow-lg"
              >
                {isUploading ? '上传中...' : '选择 PDF 文件'}
              </button>

              <div className="mt-12 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Camera className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-semibold mb-2">整页截图</h3>
                  <p className="text-sm text-gray-600">截取当前PDF页面让AI分析</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Crop className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-semibold mb-2">区域截图</h3>
                  <p className="text-sm text-gray-600">框选特定区域深入分析</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <Bot className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-semibold mb-2">AI解析</h3>
                  <p className="text-sm text-gray-600">理解图表、表格、公式含义</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 左右分栏布局
          <>
            {/* 左侧：PDF预览 */}
            <div className="w-1/2 border-r border-gray-300 bg-gray-100 flex flex-col">
              {/* PDF工具栏 */}
              <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-700 min-w-[80px] text-center">
                    {currentPage} / {docInfo.total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(docInfo.total_pages, currentPage + 1))}
                    disabled={currentPage === docInfo.total_pages}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.1))}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-700 min-w-[50px] text-center">
                    {Math.round(pdfScale * 100)}%
                  </span>
                  <button
                    onClick={() => setPdfScale(Math.min(2, pdfScale + 0.1))}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>

                {/* 截图按钮 - 根据开关显示 */}
                {enableScreenshot && (
                  <div className="flex items-center gap-2 border-l border-gray-300 pl-2">
                    <button
                      onClick={captureFullPage}
                      disabled={isLoading}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 text-sm"
                      title="截取整页"
                    >
                      <Camera className="w-4 h-4" />
                      整页
                    </button>
                    <button
                      onClick={startAreaSelection}
                      disabled={isLoading || isSelectingArea}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 text-sm"
                      title="框选区域截图"
                    >
                      <Crop className="w-4 h-4" />
                      区域
                    </button>
                  </div>
                )}
              </div>

              {/* 选择区域提示 */}
              {isSelectingArea && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                  💡 拖动鼠标选择要截图的区域，释放鼠标完成截图
                  <button
                    onClick={() => {
                      setIsSelectingArea(false);
                      setSelectionBox(null);
                    }}
                    className="ml-4 text-yellow-700 underline"
                  >
                    取消
                  </button>
                </div>
              )}

              {/* PDF内容显示区 */}
              <div
                ref={pdfContainerRef}
                className="flex-1 overflow-auto p-6 relative"
                onMouseUp={isSelectingArea ? handleMouseUp : handleTextSelection}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                style={{ cursor: isSelectingArea ? 'crosshair' : 'text' }}
              >
                <div
                  className="bg-white shadow-lg mx-auto p-8 rounded-lg relative"
                  style={{
                    transform: `scale(${pdfScale})`,
                    transformOrigin: 'top center',
                    maxWidth: '800px'
                  }}
                >
                  {docInfo.pages && docInfo.pages[currentPage - 1] && (
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed select-text">
                      {docInfo.pages[currentPage - 1].content}
                    </div>
                  )}

                  {/* 选择框覆盖层 */}
                  {isSelectingArea && selectionBox && (
                    <div
                      className="absolute border-2 border-purple-500 bg-purple-200 bg-opacity-30"
                      style={{
                        left: `${selectionBox.left}px`,
                        top: `${selectionBox.top}px`,
                        width: `${selectionBox.width}px`,
                        height: `${selectionBox.height}px`,
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 文本选择菜单 */}
              {showTextMenu && !isSelectingArea && (
                <div
                  className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex gap-2 z-50"
                  style={{
                    left: `${menuPosition.x}px`,
                    top: `${menuPosition.y}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <button
                    onClick={copySelectedText}
                    className="px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                  <button
                    onClick={askAboutSelection}
                    className="px-4 py-2 hover:bg-indigo-50 text-indigo-600 rounded flex items-center gap-2 text-sm font-medium"
                  >
                    <Bot className="w-4 h-4" />
                    AI解释
                  </button>
                  <button
                    onClick={() => setShowTextMenu(false)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 右侧：聊天区 */}
            <div className="w-1/2 flex flex-col bg-white">
              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.type === 'user'
                        ? 'bg-indigo-600 text-white'
                        : msg.type === 'system'
                          ? 'bg-green-100 text-green-800'
                          : msg.type === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {msg.hasImage && (
                        <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                          <ImageIcon className="w-4 h-4" />
                          <span>包含截图</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.model && (
                        <div className="text-xs mt-2 opacity-70">
                          {msg.model}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 截图预览 */}
              {showScreenshotPreview && screenshot && (
                <div className="border-t border-gray-200 p-4 bg-purple-50">
                  <div className="flex items-start gap-3">
                    <img
                      src={screenshot}
                      alt="截图预览"
                      className="w-20 h-20 object-contain border border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800">📸 已添加截图</p>
                      <p className="text-xs text-purple-600 mt-1">提问时会一起发送给AI分析</p>
                    </div>
                    <button
                      onClick={clearScreenshot}
                      className="p-1 hover:bg-purple-100 rounded"
                    >
                      <X className="w-5 h-5 text-purple-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* 输入框 */}
              <div className="border-t border-gray-200 p-4">
                {selectedText && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-indigo-800 font-medium mb-1">已选择文本:</div>
                        <div className="text-indigo-600 line-clamp-2">{selectedText}</div>
                      </div>
                      <button
                        onClick={() => setSelectedText('')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={
                      screenshot
                        ? "询问关于截图的问题..."
                        : selectedText
                          ? "询问关于选中文本的问题..."
                          : "向 AI 提问..."
                    }
                    disabled={!apiKey}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isLoading || !apiKey}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {!apiKey && (
                  <div className="mt-2 text-sm text-red-600">
                    ⚠️ 请先配置 API Key
                  </div>
                )}

                {screenshot && !VISION_MODELS[apiProvider]?.includes(model) && (
                  <div className="mt-2 text-sm text-yellow-600">
                    ⚠️ 当前模型不支持图片，请选择支持视觉的模型（标有📸）
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPDF;
