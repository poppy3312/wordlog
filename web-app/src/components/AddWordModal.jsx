import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
function AddWordModal({ onClose, onAdd, existingWords, theme }) {
  const [word, setWord] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const inputRef = useRef(null);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 滚动锁定：弹窗打开时禁止页面滚动
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 提交单词
  const handleSubmit = async () => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      onClose();
      return;
    }

    // 验证单词格式
    const isValid = /^[a-zA-Z]+(-[a-zA-Z]+)*$/.test(trimmedWord);
    if (!isValid || trimmedWord.length < 2) {
      alert('请输入有效的英文单词（只允许字母和连字符）');
      return;
    }

    const lowercaseWord = trimmedWord.toLowerCase();

    // 按输入形式判重（输入 ran 与 run 视为不同）
    const exists = existingWords?.find(w => w.wordLower === lowercaseWord);
    if (exists) {
      alert('该单词已存在于单词本中');
      return;
    }

    setIsFetching(true);
    try {
      await onAdd(trimmedWord);
      onClose();
    } catch (error) {
      console.error('添加单词失败:', error);
      alert(`添加失败: ${error.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  // 回车提交
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isFetching) {
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 - 只保留关闭按钮 */}
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            disabled={isFetching}
            className={`p-2 rounded-lg transition-colors
              ${theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 disabled:opacity-50'
                : 'hover:bg-gray-100 text-gray-600 disabled:opacity-50'
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 输入区域 */}
        <div className="px-5 pb-5">
          {/* 超大输入框 + 右侧按钮 */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isFetching}
                placeholder="输入英文单词..."
                className={`w-full px-5 py-4 text-2xl font-bold rounded-xl border-2 outline-none transition-all
                  ${theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-primary'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary'
                  }
                  ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                autoFocus
              />
            </div>

            {/* 确定按钮 */}
            <button
              onClick={handleSubmit}
              disabled={!word.trim() || isFetching}
              className={`px-5 py-4 rounded-xl transition-all flex items-center justify-center
                ${word.trim() && !isFetching
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-gray-400 text-white cursor-not-allowed'
                }
                ${isFetching ? 'opacity-75' : ''}
              `}
              title="添加单词 (Enter)"
            >
              {isFetching ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* 简单提示 */}
          <div className={`mt-4 text-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
            <span className="text-sm">按 </span>
            <span className={`font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Enter</span>
            <span className="text-sm"> 提交 · </span>
            <span className={`font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>ESC</span>
            <span className="text-sm"> 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddWordModal;
