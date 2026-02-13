import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Info, RefreshCw, Upload, ChevronRight, Cloud, FileText } from 'lucide-react';
import { useWordStore } from '../store/useWordStore';
import { importWordsFromTxt, importWordsFromCsv } from '../utils/export';
import VERSION from '../config/version';
import ChangelogModal from './ChangelogModal';

function SettingsModal({ onClose, showToast, onRefreshDefinitions, onExport }) {
  const { words, theme, clearAll, setWords } = useWordStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, matched: 0, skipped: [] });
  const [isImportingTxt, setIsImportingTxt] = useState(false);
  const [txtImportProgress, setTxtImportProgress] = useState({ current: 0, total: 0, succeeded: 0, skipped: 0, failed: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false); // 二次确认状态
  const [showChangelog, setShowChangelog] = useState(false); // 显示更新记录
  const [exportScope, setExportScope] = useState('all'); // 导出范围：all | noImage

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        // 如果更新记录弹窗打开，先关闭它
        if (showChangelog) {
          setShowChangelog(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, showChangelog]);

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

  // 清空所有单词
  const handleClearAll = () => {
    if (confirm(`确定要清空所有单词吗？此操作不可恢复！\n当前共有 ${words.length} 个单词。`)) {
      clearAll();
      localStorage.removeItem('wordlog_words');
      localStorage.removeItem('wordlog_stats');
      setConfirmDelete(false);
      showToast('success', '已清空所有单词');
      onClose();
    }
  };

  // 刷新释义
  const handleRefreshDefinitions = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshDefinitions();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 导出单词（支持全部 / 仅无图）
  const handleExportClick = async (format) => {
    setIsExporting(true);
    try {
      await onExport(format, exportScope);
    } finally {
      setIsExporting(false);
    }
  };

  const wordsNoImage = words.filter(w => !w.imageUrl || w.imageUrl.length === 0).length;

  // 压缩图片
  const compressImage = (file, maxSize = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 计算缩放比例
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为压缩后的 data URL
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 配图导入
  const handleImageImport = async (files) => {
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: files.length, matched: 0, skipped: [] });

    try {
      const updatedWords = [...words];
      let matchedCount = 0;
      const skipped = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 从文件名提取英文单词（支持 pear.png 和 pear_1.png 格式）
        const fileName = file.name.toLowerCase();
        const wordMatch = fileName.match(/^([a-z]+)(?:_\d+)?\./);

        if (!wordMatch) {
          skipped.push(file.name);
          setImportProgress({ current: i + 1, total: files.length, matched: matchedCount, skipped });
          continue;
        }

        const wordName = wordMatch[1];

        // 查找匹配的单词
        const wordIndex = updatedWords.findIndex(w => w.wordLower === wordName);

        if (wordIndex === -1) {
          skipped.push(file.name + ` (无单词: ${wordName})`);
          setImportProgress({ current: i + 1, total: files.length, matched: matchedCount, skipped });
          continue;
        }

        // 压缩图片
        const compressedDataUrl = await compressImage(file, 600, 0.75);

        // 追加图片到数组（支持多张图片）
        const currentImages = updatedWords[wordIndex].imageUrl || [];
        updatedWords[wordIndex] = {
          ...updatedWords[wordIndex],
          imageUrl: [...currentImages, compressedDataUrl]
        };

        matchedCount++;
        setImportProgress({ current: i + 1, total: files.length, matched: matchedCount, skipped });
      }

      // 更新store
      setWords(updatedWords);

      // 保存到存储
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { saveToChromeStorage } = await import('../utils/chromeStorage');
        await saveToChromeStorage(updatedWords);
      } else {
        localStorage.setItem('wordlog_words', JSON.stringify(updatedWords));
      }

      showToast('success', `配图导入完成！匹配 ${matchedCount} 个单词` + (skipped.length > 0 ? `，跳过 ${skipped.length} 个文件` : ''));
    } catch (error) {
      console.error('配图导入失败:', error);
      showToast('error', '导入失败，请重试');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, matched: 0, skipped: [] });
    }
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    const input = document.getElementById('image-import-input');
    if (input) {
      input.click();
    }
  };

  // 单词文件导入（支持 TXT 和 CSV）
  const handleWordFileImport = async (file) => {
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith('.csv');

    setIsImportingTxt(true);
    setTxtImportProgress({ current: 0, total: 0, succeeded: 0, skipped: 0, failed: 0 });

    try {
      const fileContent = await file.text();

      // 快速预检：有多少行
      const lineCount = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).length;
      if (lineCount === 0) {
        showToast('error', '文件为空或没有有效内容');
        setIsImportingTxt(false);
        return;
      }

      let result;

      if (isCsv) {
        // CSV 导入：已含释义，无需调 API，瞬间完成
        showToast('info', `正在导入 CSV（${lineCount - 1} 个单词）...`);
        result = importWordsFromCsv(fileContent, words);
      } else {
        // TXT 导入：需要逐个查 API
        showToast('info', `正在导入 TXT，共检测到 ${lineCount} 行...`);
        result = await importWordsFromTxt(
          fileContent,
          words,
          (current, total, succeeded, skipped, failed) => {
            setTxtImportProgress({ current, total, succeeded, skipped, failed });
          }
        );
      }

      if (result.imported.length > 0) {
        // 合并到现有单词列表（新单词放到前面）
        const updatedWords = [...result.imported, ...words].sort((a, b) => b.createdAt - a.createdAt);
        setWords(updatedWords);

        // 保存到存储
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const { saveToChromeStorage } = await import('../utils/chromeStorage');
          await saveToChromeStorage(updatedWords);
        } else {
          localStorage.setItem('wordlog_words', JSON.stringify(updatedWords));
        }
      }

      // 结果提示
      const parts = [];
      if (result.imported.length > 0) parts.push(`成功导入 ${result.imported.length} 个单词`);
      if (result.skipped.length > 0) parts.push(`跳过 ${result.skipped.length} 个`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} 个失败`);

      showToast(
        result.imported.length > 0 ? 'success' : 'info',
        parts.join('，') || '没有新单词需要导入'
      );
    } catch (error) {
      console.error('文件导入失败:', error);
      showToast('error', '导入失败，请检查文件格式');
    } finally {
      setIsImportingTxt(false);
      setTxtImportProgress({ current: 0, total: 0, succeeded: 0, skipped: 0, failed: 0 });
    }
  };

  // 触发文件选择（TXT/CSV）
  const triggerTxtFileSelect = () => {
    const input = document.getElementById('txt-import-input');
    if (input) {
      input.click();
    }
  };

  // 同步到 Google Sheets
  const syncToGoogleSheets = () => {
    if (words.length === 0) {
      showToast('error', '没有数据可以同步');
      return;
    }

    // 生成 TSV 格式数据（一个单词一行）
    let tsv = '单词\t音标\t词性\t释义\t例句\t例句翻译\t掌握程度\t添加时间\t来源\t关键词\n';

    words.forEach(word => {
      const definitions = word.definitions || [];

      // 合并所有词性
      const allPartOfSpeech = definitions.map(d => d.partOfSpeech).filter(Boolean).join('; ');
      // 合并所有释义
      const allDefinitions = definitions.map(d => d.definition).filter(Boolean).join('; ');
      // 合并所有例句
      const allExamples = definitions.map(d => d.example).filter(Boolean).join(' | ');
      // 合并所有例句翻译
      const allExampleTranslations = definitions.map(d => d.exampleTranslation).filter(Boolean).join(' | ');

      tsv += [
        word.word,
        word.pronunciation || '',
        allPartOfSpeech,
        allDefinitions,
        allExamples,
        allExampleTranslations,
        word.masteryLevel || '',
        new Date(word.createdAt).toLocaleString('zh-CN'),
        word.source || '',
        word.keyword || ''
      ].join('\t') + '\n';
    });

    // 复制到剪贴板
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('success', '✅ 数据已复制！打开 Google Sheets 粘贴（Cmd+V）');

      // 延迟打开 Google Sheets，让用户先看到提示
      setTimeout(() => {
        window.open('https://docs.google.com/spreadsheets/d/1wKe_Nk45L7XrPmv9SGwtYB7PzILFINxhQTtWjTRfWDE/edit?usp=sharing', '_blank');
      }, 1000);
    }).catch(err => {
      console.error('复制失败:', err);
      showToast('error', '复制失败，请重试');
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-lg rounded-lg shadow-xl custom-scrollbar overflow-y-auto max-h-[90vh]
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
        {/* 头部 */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b
          ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}>
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            设置
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors
              ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 设置内容 */}
        <div className="p-6 space-y-8">
          {/* 1. 数据管理 */}
          <section>
            <h3 className={`text-sm font-medium mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
              数据管理
            </h3>
            <div className="space-y-3">
              {/* 配图导入 */}
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      📷 配图导入
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      文件名格式：英文单词.png (如: apple.png)
                    </div>
                  </div>
                  <button
                    onClick={triggerFileSelect}
                    disabled={isImporting}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${isImporting
                        ? 'opacity-50 cursor-not-allowed bg-gray-400'
                        : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    {isImporting ? '导入中...' : '选择图片'}
                  </button>
                </div>
                {/* 隐藏的文件输入 */}
                <input
                  id="image-import-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      handleImageImport(files);
                    }
                  }}
                />
                {/* 导入进度 */}
                {isImporting && importProgress.total > 0 && (
                  <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>处理中: {importProgress.current}/{importProgress.total} · 匹配: {importProgress.matched}</div>
                    {importProgress.skipped.length > 0 && (
                      <div className={`mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        跳过: {importProgress.skipped.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TXT 单词导入 */}
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      <FileText className="w-4 h-4 inline mr-1" />
                      单词导入
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      支持 CSV（带释义，推荐）或 TXT（一行一词）
                    </div>
                  </div>
                  <button
                    onClick={triggerTxtFileSelect}
                    disabled={isImportingTxt}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${isImportingTxt
                        ? 'opacity-50 cursor-not-allowed bg-gray-400'
                        : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    {isImportingTxt ? '导入中...' : '选择文件'}
                  </button>
                </div>
                {/* 隐藏的 TXT 文件输入 */}
                <input
                  id="txt-import-input"
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleWordFileImport(file);
                    }
                    // 重置 input 以允许重复选择同一文件
                    e.target.value = '';
                  }}
                />
                {/* TXT 导入进度 */}
                {isImportingTxt && txtImportProgress.total > 0 && (
                  <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${(txtImportProgress.current / txtImportProgress.total) * 100}%` }}
                        />
                      </div>
                      <span>{txtImportProgress.current}/{txtImportProgress.total}</span>
                    </div>
                    <div>
                      成功 {txtImportProgress.succeeded}
                      {txtImportProgress.skipped > 0 && ` · 跳过 ${txtImportProgress.skipped}`}
                      {txtImportProgress.failed > 0 && ` · 失败 ${txtImportProgress.failed}`}
                    </div>
                  </div>
                )}
              </div>

              {/* 刷新释义按钮 */}
              <button
                onClick={handleRefreshDefinitions}
                disabled={isRefreshing}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all
                  ${isRefreshing
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'border-gray-700 hover:border-primary hover:bg-primary-light bg-gray-900 text-gray-300'
                      : 'border-gray-200 hover:border-primary hover:bg-primary-light bg-white text-gray-700'
                  }
                `}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isRefreshing ? '刷新中...' : '刷新释义'}</span>
              </button>

              {/* 导出范围 */}
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>导出范围：</span>
                <div className="flex rounded-lg border overflow-hidden" role="group">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${exportScope === 'all'
                      ? 'bg-primary text-white'
                      : theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    全部 ({words.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('noImage')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${exportScope === 'noImage'
                      ? 'bg-primary text-white border-primary'
                      : theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    仅无图 ({wordsNoImage})
                  </button>
                </div>
              </div>
              {/* 导出选项 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={syncToGoogleSheets}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all
                    ${theme === 'dark'
                      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                      : 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                    }
                  `}
                >
                  <Cloud className="w-4 h-4" />
                  <span className="text-sm">同步到 Google Sheets</span>
                </button>
                {[
                  { format: 'txt', label: '导出 TXT' },
                  { format: 'csv', label: '导出 CSV' },
                  { format: 'md', label: '导出 MD' }
                ].map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={() => handleExportClick(format)}
                    disabled={isExporting}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all
                      ${isExporting
                        ? 'opacity-50 cursor-not-allowed'
                        : theme === 'dark'
                          ? 'border-gray-700 hover:border-primary hover:bg-primary-light bg-gray-900 text-gray-300'
                          : 'border-gray-200 hover:border-primary hover:bg-primary-light bg-white text-gray-700'
                      }
                    `}
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
              💡 同步到 Google Sheets：点击后数据自动复制，然后在表格中粘贴即可
            </p>
          </section>

          {/* 2. 数据统计 */}
          <section>
            <h3 className={`text-sm font-medium mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
              数据统计
            </h3>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{words.length}</div>
                  <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>总单词数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {new Set(words.map(w => w.wordLower)).size}
                  </div>
                  <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>唯一单词</div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 关于 WordLog */}
          <section>
            <h3 className={`text-sm font-medium mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
              关于 WordLog
            </h3>
            <div
              onClick={() => setShowChangelog(true)}
              className={`p-5 rounded-xl border cursor-pointer transition-all hover:border-primary
                ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}
              `}
            >
              {/* 版本号 */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}>
                  <Info className={`w-5 h-5 ${theme === 'dark' ? 'text-primary-light' : 'text-primary'}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                    {VERSION.fullVersion}
                  </div>
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-600'}`}>
                    {VERSION.name}
                  </div>
                </div>
              </div>

              {/* 版本特性 */}
              <div className={`space-y-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                <div className="text-sm font-medium">✨ 最新特性：</div>
                <ul className="text-sm space-y-1 pl-4">
                  <li>• 超大输入框，清晰易读</li>
                  <li>• 自动查询音标和释义</li>
                  <li>• 一键刷新占位符数据</li>
                  <li>• 高质量语音朗读</li>
                  <li>• 关键词显示助记</li>
                </ul>
              </div>

              {/* 构建信息 */}
              <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-600'}`}>
                    构建日期: {VERSION.build}
                  </div>
                  <div className={`flex items-center gap-1 text-xs text-primary`}>
                    <span>查看更新记录</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 危险操作 */}
          <section>
            <h3 className={`text-sm font-medium mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
              危险操作
            </h3>

            {!confirmDelete ? (
              // 第一步：显示弱化的按钮
              <button
                onClick={() => setConfirmDelete(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border transition-all
                  ${theme === 'dark'
                    ? 'border-gray-800 bg-gray-900 text-gray-500 hover:text-gray-400 hover:border-gray-700'
                    : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500 hover:border-gray-300'
                  }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-sm">清空所有单词</span>
              </button>
            ) : (
              // 第二步：确认操作（红色警告）
              <div className="space-y-2">
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">确认清空（不可恢复）</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-400 hover:bg-gray-800'
                      : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-sm">取消</span>
                </button>
              </div>
            )}

            <p className={`mt-2 text-xs text-center ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'}`}>
              {confirmDelete ? '⚠️ 即将删除所有单词，请确认' : '需要二次确认才能执行'}
            </p>
          </section>
        </div>
      </div>
    </div>

    {/* 更新记录弹窗 - 独立渲染，确保遮罩层覆盖整个页面 */}
    {showChangelog && (
      <ChangelogModal
        onClose={() => setShowChangelog(false)}
        theme={theme}
      />
    )}
  </>);
}

export default SettingsModal;
