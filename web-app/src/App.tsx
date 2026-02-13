import { useState, useEffect } from 'react';
import { Book, Plus, Moon, Search, Settings, Sun } from 'lucide-react';
import WordList from './pages/WordList';
import SettingsModal from './components/SettingsModal';
import AddWordModal from './components/AddWordModal';
import ChangelogModal from './components/ChangelogModal';
import Toast from './components/Toast';
import { useWordStore } from './store/useWordStore';
import type { Word, Theme } from './types';
import { loadFromChromeStorage, saveToChromeStorage, debouncedSaveWords } from './utils/chromeStorage';
import { fetchWordDefinition, batchFetchDefinitions } from './utils/dictionaryAPI';
import { analyzeWordForm } from './utils/wordForms';
import VERSION from './config/version';

/// <reference types="./types/chrome" />

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { words, stats, theme, setTheme, loadWords, setWords } = useWordStore();

  // 显示 Toast 提示
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 1500);
  };

  // 初始化数据和主题
  const initializeData = async () => {
    try {
      // 检测是否在 Chrome 扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await loadFromChromeStorage();
        if (data.words) {
          // 按创建时间降序排列
          const sortedWords = data.words.sort((a: Word, b: Word) => b.createdAt - a.createdAt);
          loadWords(sortedWords, data.stats);
        }
      } else {
        // 非扩展环境，使用 localStorage
        const savedWords = localStorage.getItem('wordlog_words');
        const savedStats = localStorage.getItem('wordlog_stats');
        const savedTheme = localStorage.getItem('wordlog_theme');

        if (savedWords) {
          let words: Word[] = JSON.parse(savedWords);

          // 第一阶段迁移：检查是否有大写单词需要转换
          const needsCaseMigration = words.some(w => w.word !== w.word.toLowerCase());
          if (needsCaseMigration) {
            console.log('🔄 检测到大写单词，自动迁移到小写格式...');
            const caseModifiedCount = words.filter(w => w.word !== w.word.toLowerCase()).length;

            words = words.map(word => ({
              ...word,
              word: word.word.toLowerCase(),
              wordLower: word.word.toLowerCase(),
              updatedAt: Date.now()
            }));

            localStorage.setItem('wordlog_words', JSON.stringify(words));
            console.log(`✅ 已自动迁移 ${caseModifiedCount} 个单词为小写格式`);
          }

          // 第三阶段迁移：检查是否有旧格式的 imageUrl（字符串）需要转换为数组格式
          const needsImageMigration = words.some(w => w.imageUrl && typeof w.imageUrl === 'string');

          if (needsImageMigration) {
            console.log('🔄 检测到旧格式配图，自动迁移到数组格式...');
            let imageModifiedCount = 0;

            words = words.map(word => {
              if (word.imageUrl && typeof word.imageUrl === 'string') {
                imageModifiedCount++;
                return {
                  ...word,
                  imageUrl: [word.imageUrl] // 转换为单元素数组
                };
              }
              return word;
            });

            localStorage.setItem('wordlog_words', JSON.stringify(words));
            console.log(`✅ 已自动迁移 ${imageModifiedCount} 个单词的配图为数组格式`);
          }

          // 第四阶段迁移：清理多图单词，只保留最新的一张配图
          const needsMultiImageCleanup = words.some(w => w.imageUrl && w.imageUrl.length > 1);

          if (needsMultiImageCleanup) {
            console.log('🔄 检测到多图单词，自动清理为只保留最新的一张...');
            let cleanedCount = 0;

            words = words.map(word => {
              const imgCount = word.imageUrl?.length || 0;
              if (imgCount > 1) {
                cleanedCount++;
                // 只保留第一张（最新的）
                return {
                  ...word,
                  imageUrl: [word.imageUrl[0]]
                };
              }
              return word;
            });

            localStorage.setItem('wordlog_words', JSON.stringify(words));
            console.log(`✅ 已自动清理 ${cleanedCount} 个单词的多余配图，每个单词只保留最新的一张`);
          }

          // 按创建时间降序排列
          const sortedWords = words.sort((a: Word, b: Word) => b.createdAt - a.createdAt);
          loadWords(sortedWords, savedStats ? JSON.parse(savedStats) : undefined);
        }

        if (savedTheme) {
          setTheme(savedTheme as Theme);
        }
      }
    } catch (error) {
      console.error('初始化数据失败:', error);
    }
  };

  // 自动刷新所有占位符释义
  async function handleRefreshDefinitions() {
    // 检查是否有需要刷新的单词
    const needsRefreshCount = words.filter(w =>
      !w.definitions ||
      !w.definitions[0] ||
      w.definitions[0].definition === '测试释义' ||
      w.definitions[0].definition === '释义暂不可用，可稍后手动补充' ||
      w.definitions[0].definition === '释义暂不可用，请稍后在设置中刷新释义' ||
      w.definitions[0].example === 'Test example' ||
      !w.pronunciation ||
      w.pronunciation === ''
    ).length;

    if (needsRefreshCount === 0) {
      showToast('info', '所有单词释义都已是完整的');
      return;
    }

    try {
      showToast('info', `正在刷新 ${needsRefreshCount} 个单词的释义，请稍候...`);

      // 批量获取释义
      const updatedWords = await batchFetchDefinitions(words);

      setWords(updatedWords);

      // 保存到存储
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await saveToChromeStorage(updatedWords);
      } else {
        localStorage.setItem('wordlog_words', JSON.stringify(updatedWords));
      }

      showToast('success', `✅ 已刷新 ${needsRefreshCount} 个单词的释义！`);
    } catch (error) {
      console.error('刷新释义失败:', error);
      const err = error as Error;
      showToast('error', `刷新失败: ${err.message}`);
    }
  }

  // 初始化：从 Chrome Storage 加载数据
  useEffect(() => {
    initializeData();
  }, []);

  // 全局快捷键：Command+E 打开添加单词弹窗
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      // Command+E (Mac) / Ctrl+E (Windows) - 打开添加单词弹窗
      if ((e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setShowAddWord(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  // 主题切换
  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('wordlog_theme', newTheme);
  };

  // 导出功能：scope 为 noImage 时只导出无图单词
  const handleExport = async (format: string, scope: 'all' | 'noImage' = 'all') => {
    try {
      const list = scope === 'noImage'
        ? words.filter(w => !w.imageUrl || w.imageUrl.length === 0)
        : words;
      if (scope === 'noImage' && list.length === 0) {
        showToast('info', '当前没有无图单词');
        return;
      }
      const { exportWords } = await import('./utils/export');
      const content = await exportWords(list, format as 'txt' | 'csv' | 'md');
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv;charset=utf-8;' :
              format === 'md' ? 'text/markdown;charset=utf-8;' :
              'text/plain;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = scope === 'noImage' ? '_无图' : '';
      link.download = `WordLog${suffix}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', scope === 'noImage' ? `已导出 ${list.length} 个无图单词` : `已导出 ${list.length} 个单词`);
    } catch (error) {
      console.error('导出失败:', error);
      showToast('error', '导出失败，请稍后重试');
    }
  };

  // 添加新单词：输入什么形式就存什么形式，不再自动转原形
  const handleAddWord = async (testWord: string) => {
    const wordAsTyped = testWord.toLowerCase().trim();

    // 按「输入形式」判重，不按原形
    const exists = words.find(w => w.wordLower === wordAsTyped);
    if (exists) {
      throw new Error(`该单词已存在于单词本中`);
    }

    try {
      // 先按输入形式查释义；若无结果再尝试用原形查（仅用于释义，仍存输入形式）
      let wordData = await fetchWordDefinition(wordAsTyped);
      const isPlaceholder =
        !wordData.definitions?.length ||
        wordData.definitions[0]?.definition?.includes('暂不可用') ||
        wordData.definitions[0]?.definition?.includes('查询中');
      if (isPlaceholder) {
        const { original } = analyzeWordForm(wordAsTyped);
        if (original && original !== wordAsTyped) {
          const lemmaData = await fetchWordDefinition(original);
          if (lemmaData?.definitions?.length && !lemmaData.definitions[0]?.definition?.includes('暂不可用')) {
            wordData = { ...lemmaData, word: wordAsTyped, wordLower: wordAsTyped };
          }
        }
      }

      const newWord: Word = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        ...wordData,
        word: wordAsTyped,
        wordLower: wordAsTyped,
        createdAt: Date.now(),
        source: 'webapp'
      };

      const updatedWords = [newWord, ...words].sort((a: Word, b: Word) => b.createdAt - a.createdAt);
      setWords(updatedWords);
      debouncedSaveWords(updatedWords);
      showToast('success', `已添加 "${wordAsTyped}" 到单词本`);
      setSearchQuery('');
    } catch (error) {
      console.error('添加单词失败:', error);
      throw error;
    }
  };

  // 搜索处理：如果单词存在则移到最前面，不存在则添加
  const handleSearchOrAdd = async (query: string) => {
    if (!query || !query.trim()) return;

    const lowercaseQuery = query.toLowerCase().trim();

    // 检查单词是否已存在
    const existingWord = words.find(w => w.wordLower === lowercaseQuery);

    if (existingWord) {
      // 单词存在，更新 createdAt 移到最前面
      const updatedWords = words.map(w =>
        w.id === existingWord.id
          ? { ...w, createdAt: Date.now(), updatedAt: Date.now() }
          : w
      ).sort((a: Word, b: Word) => b.createdAt - a.createdAt);

      setWords(updatedWords);

      debouncedSaveWords(updatedWords);
      showToast('success', `"${lowercaseQuery}" 已移到最前面`);
      setSearchQuery(''); // 清空搜索框
    } else {
      // 单词不存在，自动添加
      try {
        await handleAddWord(lowercaseQuery);
      } catch (error) {
        const err = error as Error;
        showToast('error', `添加失败: ${err.message}`);
      }
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* 顶部导航栏 */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-sm ${theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - 点击刷新 */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              title="点击刷新页面"
            >
              <Book className={`w-8 h-8 ${theme === 'dark' ? 'text-primary-light' : 'text-primary'}`} />
              <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                WordLog
              </h1>
            </button>

            {/* 中间：搜索框和添加按钮 */}
            <div className="hidden md:flex items-center gap-3">
              {/* 搜索框 */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索单词或按Enter添加..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearchOrAdd(searchQuery);
                      // 失去焦点，防止后续的键盘事件触发其他行为
                      e.currentTarget.blur();
                    }
                  }}
                  className={`w-40 text-sm outline-none bg-transparent ${theme === 'dark' ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              {/* 添加单词按钮 */}
              <button onClick={() => setShowAddWord(true)} className="p-2 rounded-lg transition-colors bg-primary text-white hover:bg-primary-hover" title="添加单词">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* 右侧：统计信息和操作按钮 */}
            <div className="flex items-center gap-3">
              {/* 统计信息 */}
              <div className="hidden lg:flex items-center gap-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-semibold text-primary">{stats.totalWords || 0}</span> 个单词
                </div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-semibold text-primary">{stats.todayAdded || 0}</span> 今日新增
                </div>
              </div>

              {/* 主题切换 */}
              <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* 设置 */}
              <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 移动端搜索框 */}
          <div className={`sm:hidden pb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索单词或按Enter添加..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchOrAdd(searchQuery);
                    // 失去焦点，防止后续的键盘事件触发其他行为
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 移动端统计 */}
        <div className="sm:hidden grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="text-2xl font-bold text-primary">{stats.totalWords || 0}</div>
            <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>总单词</div>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="text-2xl font-bold text-primary">{stats.todayAdded || 0}</div>
            <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>今日新增</div>
          </div>
        </div>

        {/* 单词列表 */}
        <WordList searchQuery={searchQuery} showToast={showToast} />
      </main>

      {/* 页脚版本信息 */}
      <footer className={`border-t ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-600'}`}>
              <span className="font-medium">WordLog</span>
              <span className="mx-2">•</span>
              <button
                onClick={() => setShowChangelog(true)}
                className="text-primary font-semibold hover:underline transition-all cursor-pointer"
              >
                {VERSION.fullVersion}
              </button>
              <span className="mx-2">•</span>
              <span>{VERSION.name}</span>
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-700' : 'text-gray-500'}`}>
              由 ❤️ 和 AI 共同打造
            </div>
          </div>
        </div>
      </footer>

      {/* Toast 提示 */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          showToast={showToast}
          onRefreshDefinitions={handleRefreshDefinitions}
          onExport={handleExport}
        />
      )}

      {/* 添加单词弹窗 */}
      {showAddWord && (
        <AddWordModal
          onClose={() => setShowAddWord(false)}
          onAdd={handleAddWord}
          existingWords={words}
          theme={theme}
        />
      )}

      {/* 更新记录弹窗 */}
      {showChangelog && (
        <ChangelogModal
          onClose={() => setShowChangelog(false)}
          theme={theme}
        />
      )}
    </div>
  );
}

export default App;
