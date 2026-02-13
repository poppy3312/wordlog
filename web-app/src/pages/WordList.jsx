import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, Calendar, BookOpen, Volume2, X, RefreshCw, Copy, ChevronLeft, ChevronRight, Info, Zap, Wand2, Sparkles } from 'lucide-react';
import { useWordStore } from '../store/useWordStore';
import WordCard from '../components/WordCard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import FlashcardMode from '../components/FlashcardMode';
import { fetchWordDefinition } from '../utils/dictionaryAPI';
import { batchGenerateImages } from '../utils/imageAPI';
import { analyzeWordForm, getWordForms } from '../utils/wordForms';

// 词性中文转英文缩写
function posToAbbr(pos) {
  const mapping = {
    '名词': 'n.',
    '动词': 'v.',
    '形容词': 'adj.',
    '副词': 'adv.',
    '其他': 'other',
    '未知': 'unknown'
  };
  return mapping[pos] || pos;
}

function WordList({ searchQuery, showToast }) {
  const { words, theme, deleteWord, setWords } = useWordStore();
  const [selectedWord, setSelectedWord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0, currentWord: '' });
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [masteryFilter, setMasteryFilter] = useState('all'); // all | unlearned | unknown | known

  // 掌握度统计
  const masteryStats = useMemo(() => {
    return {
      all: words.length,
      unlearned: words.filter(w => !w.masteryLevel || w.masteryLevel === 'unlearned').length,
      unknown: words.filter(w => w.masteryLevel === 'unknown').length,
      known: words.filter(w => w.masteryLevel === 'known').length,
    };
  }, [words]);

  // 批量生成配图
  const handleBatchGenerate = async () => {
    const wordsNeedingImage = words.filter(w => !w.imageUrl || w.imageUrl.length === 0);

    if (wordsNeedingImage.length === 0) {
      showToast('info', '✅ 所有单词都已经有配图了！');
      return;
    }

    setIsGenerating(true);
    setGenerateProgress({ current: 0, total: wordsNeedingImage.length, currentWord: '' });

    try {
      // 自定义进度回调
      const onProgress = (current, total, currentWord) => {
        setGenerateProgress({ current, total, currentWord });
      };

      const updatedWords = await batchGenerateImages(words, onProgress);
      setWords(updatedWords);
      const { debouncedSaveWords } = await import('../utils/chromeStorage');
      debouncedSaveWords(updatedWords);
      showToast('success', `✅ 配图生成完成！`);
    } catch (error) {
      console.error('批量生成失败:', error);
      showToast('error', '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
      setGenerateProgress({ current: 0, total: 0, currentWord: '' });
    }
  };

  // 根据搜索词和掌握度过滤单词
  const filteredWords = useMemo(() => {
    let result = words;

    // 先按掌握度筛选
    if (masteryFilter !== 'all') {
      result = result.filter(word => {
        if (masteryFilter === 'unlearned') {
          return !word.masteryLevel || word.masteryLevel === 'unlearned';
        }
        return word.masteryLevel === masteryFilter;
      });
    }

    // 再按搜索词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(word =>
        word.word.toLowerCase().includes(query) ||
        word.definitions.some(def =>
          def.definition.toLowerCase().includes(query)
        )
      );
    }

    return result;
  }, [words, searchQuery, masteryFilter]);

  // 按日期分组
  const groupedWords = useMemo(() => {
    const groups = {};

    for (const word of filteredWords) {
      const date = new Date(word.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(word);
    }

    // 按日期降序排序
    return Object.entries(groups).sort((a, b) =>
      new Date(b[0]) - new Date(a[0])
    );
  }, [filteredWords]);

  // 删除单词
  const handleDelete = async (wordId) => {
    if (!confirm('确定要删除这个单词吗？')) {
      return;
    }

    try {
      setIsLoading(true);
      deleteWord(wordId);
      const { debouncedSaveWords } = await import('../utils/chromeStorage');
      debouncedSaveWords(useWordStore.getState().words);
      showToast('success', '单词已删除');
      setSelectedWord(null);
    } catch (error) {
      console.error('删除失败:', error);
      showToast('error', '删除失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取最佳英语语音
  const getBestEnglishVoice = () => {
    const voices = speechSynthesis.getVoices();
    // 优先选择高质量/Neural语音
    const preferredVoices = [
      'Google US English',
      'Microsoft David',
      'Microsoft Zira',
      'Samantha',
      'Daniel',
      'Google UK English Male',
      'Microsoft Aria',
      'Microsoft Guy',
      'Microsoft Jenny',
      'Natural',
      'Neural',
      'Premium',
      'Enhanced',
      'English (United States)',
      'en-US',
      'American'
    ];

    // 查找首选语音
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred) || v.voiceURI.includes(preferred));
      if (voice) return voice;
    }

    // 回退到第一个英语语音
    return voices.find(v => v.lang.startsWith('en')) || null;
  };

  // 播放发音（优先使用真实音频，否则使用 Web Speech API）
  const playPronunciation = (wordText, audioUrl) => {
    // 优先使用真实音频（自然度更高）
    if (audioUrl && audioUrl.length > 0) {
      // 取消当前正在播放的音频
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }

      const audio = new Audio(audioUrl);
      window.currentAudio = audio;

      audio.play().catch(error => {
        console.warn('真实音频播放失败，回退到 TTS:', error);
        // 回退到 TTS
        playWithTTS(wordText);
      });

      return;
    }

    // 没有真实音频，使用 TTS
    playWithTTS(wordText);
  };

  // 使用 Web Speech API 播放（备用方案）
  const playWithTTS = (wordText) => {
    if ('speechSynthesis' in window) {
      // 取消当前正在播放的
      speechSynthesis.cancel();

      // 确保语音已加载
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // 等待语音加载
        speechSynthesis.onvoiceschanged = () => {
          setTimeout(() => playWithTTS(wordText), 100);
        };
        // 手动触发一次语音加载
        speechSynthesis.getVoices();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(wordText);
      const bestVoice = getBestEnglishVoice();

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.lang = 'en-US';
      utterance.rate = 1.0;      // 正常语速，更自然流畅
      utterance.pitch = 0.98;    // 稍微降低音调，更沉稳
      utterance.volume = 1.0;    // 最大音量

      speechSynthesis.speak(utterance);
    } else {
      console.warn('浏览器不支持语音合成');
    }
  };

  // 页面加载时预加载语音
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        console.log('语音已加载，共', speechSynthesis.getVoices().length, '个语音');
      };
    }
  }, []);

  // 空状态
  if (words.length === 0) {
    return <EmptyState theme={theme} />;
  }

  // 计算需要生成配图的数量
  const wordsNeedingImage = words.filter(w => !w.imageUrl || w.imageUrl.length === 0).length;

  // 无搜索结果
  if (searchQuery && filteredWords.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className={`mx-auto w-16 h-16 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
        <p className={`mt-4 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          没有找到 "{searchQuery}" 的相关单词
        </p>
        <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          按 <kbd className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>Enter</kbd> 自动添加到单词本
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 掌握度筛选 + 闪卡模式 - 合并到一行 */}
      {!searchQuery && words.length > 0 && (
        <div className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-4">
            {/* 筛选按钮 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMasteryFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  masteryFilter === 'all'
                    ? 'bg-primary text-white'
                    : theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部 {masteryStats.all}
              </button>
              <button
                onClick={() => setMasteryFilter('unlearned')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  masteryFilter === 'unlearned'
                    ? 'bg-gray-600 text-white'
                    : theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                未学 {masteryStats.unlearned}
              </button>
              <button
                onClick={() => setMasteryFilter('unknown')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  masteryFilter === 'unknown'
                    ? 'bg-red-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                不认识 {masteryStats.unknown}
              </button>
              <button
                onClick={() => setMasteryFilter('known')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  masteryFilter === 'known'
                    ? 'bg-green-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                认识 {masteryStats.known}
              </button>
            </div>
          </div>

          {/* 闪卡按钮 */}
          <button
            onClick={() => setShowFlashcard(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-primary text-white hover:bg-primary-hover whitespace-nowrap`}
          >
            <Zap className="w-4 h-4" />
            闪卡复习 ({masteryFilter === 'all' ? words.length : filteredWords.length})
          </button>
        </div>
      )}

      {/* 一键生图：仅无图单词时显示 */}
      {wordsNeedingImage > 0 && (
        <div className={`flex items-center justify-between p-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <Wand2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {wordsNeedingImage} 个单词等待配图
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                使用AI智能风格系统生成精美配图
              </div>
            </div>
          </div>
          <button
            onClick={handleBatchGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                生成中 ({generateProgress.current}/{generateProgress.total})
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                开始生成
              </>
            )}
          </button>
        </div>
      )}

      {isGenerating && generateProgress.currentWord && (
        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            正在生成: <span className="font-medium">{generateProgress.currentWord}</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${(generateProgress.current / generateProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {groupedWords.map(([date, dateWords]) => (
        <div key={date}>
          {/* 日期标题 */}
          <div className={`flex items-center gap-2 mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatDate(date)}
            </span>
            <span className="text-sm">
              ({dateWords.length} 个单词)
            </span>
          </div>

          {/* 单词卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dateWords.map(word => (
              <WordCard
                key={word.id}
                word={word}
                theme={theme}
                onClick={() => setSelectedWord(word)}
                onPlay={() => playPronunciation(word.word, word.audioUrl)}
                onCopy={() => showToast('success', '已复制~')}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 单词详情弹窗 */}
      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          theme={theme}
          onClose={() => setSelectedWord(null)}
          onDelete={() => handleDelete(selectedWord.id)}
          onPlay={() => playPronunciation(selectedWord.word, selectedWord.audioUrl)}
          onWordUpdate={(updatedWord) => setSelectedWord(updatedWord)}
          showToast={showToast}
        />
      )}

      {/* 加载状态 */}
      {isLoading && <LoadingOverlay theme={theme} />}

      {/* 闪卡模式 */}
      {showFlashcard && (
        <FlashcardMode
          words={searchQuery ? filteredWords : (masteryFilter === 'all' ? words : filteredWords)}
          theme={theme}
          onClose={() => setShowFlashcard(false)}
          onPlay={(word) => playPronunciation(word, null)}
        />
      )}
    </div>
  );
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// 单词详情弹窗
function WordDetailModal({ word, theme, onClose, onDelete, onPlay, onWordUpdate, showToast }) {
  const [currentWord, setCurrentWord] = useState(word);
  const [playingExample, setPlayingExample] = useState(null);
  const [playingForm, setPlayingForm] = useState(null); // 新增：正在播放的时态
  const [copied, setCopied] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [hoveredWord, setHoveredWord] = useState(null); // 悬停的单词
  const [wordDetail, setWordDetail] = useState(null); // 单词详情
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false); // 音频加载中状态

  // 使用 currentWord 而不是 word prop，确保删除图片后正确更新
  const imageCount = currentWord.imageUrl?.length || 0;

  // 滚动锁定：弹窗打开时禁止页面滚动
  useEffect(() => {
    // 保存当前滚动位置
    const scrollY = window.scrollY;

    // 锁定 body 滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // 恢复 body 滚动
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // 恢复滚动位置
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 切换图片
  const nextImage = () => setImageIndex((prev) => (prev + 1) % imageCount);
  const prevImage = () => setImageIndex((prev) => (prev - 1 + imageCount) % imageCount);

  // 删除当前图片
  const handleDeleteImage = async () => {
    if (!confirm(`确定要删除第 ${imageIndex + 1} 张配图吗？`)) {
      return;
    }

    try {
      const { setWords } = useWordStore.getState();
      const words = useWordStore.getState().words;

      // 创建新的图片数组（移除当前索引的图片）
      const newImageUrls = [...(currentWord.imageUrl || [])];
      newImageUrls.splice(imageIndex, 1);

      // 更新单词对象
      const updatedWord = {
        ...currentWord,
        imageUrl: newImageUrls
      };

      // 更新当前单词状态
      setCurrentWord(updatedWord);

      // 如果删除的是最后一张图片，调整索引
      if (imageIndex >= newImageUrls.length) {
        setImageIndex(Math.max(0, newImageUrls.length - 1));
      }

      // 更新 store 中的单词列表
      const updatedWords = words.map(w =>
        w.id === currentWord.id ? updatedWord : w
      );
      setWords(updatedWords);
      const { debouncedSaveWords } = await import('../utils/chromeStorage');
      debouncedSaveWords(updatedWords);
      if (onWordUpdate) onWordUpdate(updatedWord);
      showToast('success', '配图已删除');
    } catch (error) {
      console.error('删除配图失败:', error);
      showToast('error', '删除失败，请稍后重试');
    }
  };

  // 解析例句中的英文单词
  const parseSentenceWords = (sentence) => {
    // 匹配英文单词（包括连字符连接的单词）
    const words = [];
    const regex = /\b[a-zA-Z]+(-[a-zA-Z]+)*\b/g;
    let match;

    while ((match = regex.exec(sentence)) !== null) {
      words.push({
        word: match[0],
        index: match.index,
        length: match[0].length
      });
    }
    return words;
  };

  // 渲染带可点击单词的例句
  const renderClickableSentence = (sentence) => {
    const words = parseSentenceWords(sentence);
    if (words.length === 0) return sentence;

    const parts = [];
    let lastIndex = 0;

    words.forEach((item, index) => {
      // 添加前面的非单词部分
      if (item.index > lastIndex) {
        parts.push(sentence.substring(lastIndex, item.index));
      }

      // 添加可点击的单词
      const wordText = item.word;
      const isHovered = hoveredWord === wordText;
      const isCurrentWord = wordText.toLowerCase() === word.word.toLowerCase();

      parts.push(
        <span
          key={index}
          onClick={() => handleWordClick(wordText)}
          onMouseEnter={() => setHoveredWord(wordText)}
          onMouseLeave={() => setHoveredWord(null)}
          className={`cursor-pointer transition-all ${
            isCurrentWord
              ? 'text-primary font-bold'
              : isHovered
                ? 'text-primary underline'
                : 'text-blue-500 hover:text-primary hover:underline'
          }`}
        >
          {wordText}
        </span>
      );

      lastIndex = item.index + item.length;
    });

    // 添加最后的非单词部分
    if (lastIndex < sentence.length) {
      parts.push(sentence.substring(lastIndex));
    }

    return parts;
  };

  // 点击单词
  const handleWordClick = async (clickedWord) => {
    // 如果点击的是当前单词，不做处理
    if (clickedWord.toLowerCase() === word.word.toLowerCase()) {
      return;
    }

    setIsLoadingWord(true);
    try {
      const definition = await fetchWordDefinition(clickedWord);
      setWordDetail({
        word: clickedWord,
        ...definition
      });
    } catch (error) {
      console.error('获取单词释义失败:', error);
      showToast('error', '获取单词释义失败');
    } finally {
      setIsLoadingWord(false);
    }
  };

  // 添加单词到单词本
  const handleAddToWordbook = async (e) => {
    // 阻止事件冒泡
    if (e) {
      e.stopPropagation();
    }

    if (!wordDetail) return;

    const { addWord, setWords } = useWordStore.getState();
    const existingWords = useWordStore.getState().words;

    // 检查是否已存在
    const exists = existingWords?.find(w => w.word.toLowerCase() === wordDetail.word.toLowerCase());
    if (exists) {
      showToast('info', '该单词已存在于单词本中');
      setWordDetail(null);
      return;
    }

    try {
      // 创建完整的单词对象
      const newWord = {
        id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        word: wordDetail.word,
        wordLower: wordDetail.word.toLowerCase(),
        pronunciation: wordDetail.pronunciation || '',
        definitions: wordDetail.definitions || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 先关闭小弹窗，防止后续操作干扰
      setWordDetail(null);

      // 使用 addWord 添加单词
      addWord(newWord);
      const updatedWords = useWordStore.getState().words;
      const { debouncedSaveWords } = await import('../utils/chromeStorage');
      debouncedSaveWords(updatedWords);
      showToast('success', `已添加 "${wordDetail.word}" 到单词本`);
    } catch (error) {
      console.error('添加单词失败:', error);
      showToast('error', `添加失败: ${error.message}`);
      setWordDetail(null); // 出错时也关闭弹窗
    }
  };

  // 当word prop变化时更新currentWord
  useEffect(() => {
    setCurrentWord(word);
  }, [word]);

  // 复制单词
  const handleCopy = () => {
    navigator.clipboard.writeText(word.word);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ESC 键关闭（优先关闭小弹窗）
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (wordDetail) {
          setWordDetail(null);
        } else {
          onClose();
        }
        // 关闭时清除加载状态
        setLoadingAudio(false);
        setPlayingExample(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, wordDetail]);

  // 预加载语音（确保点击播放时语音已就绪）
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        console.log('WordDetailModal: 语音已加载，共', speechSynthesis.getVoices().length, '个语音');
      };
    }
  }, []);

  // 获取最佳英语语音（与上方相同）
  const getBestEnglishVoice = () => {
    const voices = speechSynthesis.getVoices();
    const preferredVoices = [
      // Neural/高质量语音优先
      'Google US English',
      'Microsoft David',
      'Microsoft Zira',
      'Samantha',
      'Daniel',
      'Google UK English Male',
      'Microsoft Aria',
      'Microsoft Guy',
      'Microsoft Jenny',
      'Natural',
      'Neural',
      'Premium',
      'Enhanced',
      // 备用
      'English (United States)',
      'en-US',
      'American'
    ];

    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred) || v.voiceURI.includes(preferred));
      if (voice) return voice;
    }

    return voices.find(v => v.lang.startsWith('en')) || null;
  };

  // 播放例句
  const playExample = (example) => {
    console.log('播放例句:', example);

    if ('speechSynthesis' in window) {
      // 取消当前正在播放的内容
      speechSynthesis.cancel();

      // 显示加载中提示
      setLoadingAudio(true);

      // 确保语音已加载
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // 语音未加载，等待加载后再播放
        console.log('等待语音加载...');
        speechSynthesis.onvoiceschanged = () => {
          setTimeout(() => playExample(example), 100);
        };
        // 手动触发语音加载
        speechSynthesis.getVoices();
        setLoadingAudio(false);
        return;
      }

      // 短暂延迟后开始播放，确保UI有时间显示加载状态
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(example);

        // 使用最佳语音
        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log('使用语音:', bestVoice.name);
        } else {
          console.warn('未找到合适的英语语音，使用默认语音');
        }

        utterance.lang = 'en-US';
        utterance.rate = 1.0;      // 正常语速，更自然
        utterance.pitch = 0.95;    // 稍微降低音调，更沉稳自然
        utterance.volume = 1.0;

        // 播放开始时设置状态
        setPlayingExample(example);
        setLoadingAudio(false);

        // 播放结束时清除状态
        utterance.onend = () => {
          console.log('播放完成');
          setPlayingExample(null);
        };

        utterance.onerror = (e) => {
          console.error('播放错误:', e);
          setPlayingExample(null);
          setLoadingAudio(false);
        };

        speechSynthesis.speak(utterance);
      }, 300); // 300ms延迟让UI显示加载状态
    } else {
      console.warn('浏览器不支持语音合成');
      setLoadingAudio(false);
    }
  };

  // 重新生成释义（后台异步生成）
  const handleRefreshDefinition = async () => {
    try {
      console.log(`🔄 正在重新获取 ${currentWord.word} 的释义...`);

      // 调用 API 获取新释义
      const newWordData = await fetchWordDefinition(currentWord.word);

      // 更新当前单词状态
      const updatedWord = {
        ...currentWord,
        ...newWordData,
        updatedAt: Date.now()
      };
      setCurrentWord(updatedWord);

      // 更新 store 中的单词
      const { setWords } = useWordStore.getState();
      const words = useWordStore.getState().words;
      const updatedWords = words.map(w =>
        w.id === currentWord.id ? updatedWord : w
      );
      setWords(updatedWords);
      const { debouncedSaveWords } = await import('../utils/chromeStorage');
      debouncedSaveWords(updatedWords);
      onWordUpdate(updatedWord);

      console.log(`✅ ${currentWord.word} 释义已更新`);
      if (showToast) {
        showToast('success', `已更新 "${currentWord.word}" 的释义`);
      }
    } catch (error) {
      console.error(`${currentWord.word} 释义更新失败:`, error);
      if (showToast) {
        showToast('error', `更新失败: ${error.message}`);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-lg shadow-xl custom-scrollbar overflow-y-auto max-h-[90vh] ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部：单词和操作按钮 */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onPlay}
            className={`text-4xl font-bold text-primary hover:underline transition-all text-left truncate flex-1`}
          >
            {word.word}
          </button>
          <div className="flex items-center gap-2 ml-3">
            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-500 hover:text-gray-300'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title={copied ? '已复制！' : '复制单词'}
            >
              <Copy className="w-4 h-4" />
            </button>
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 音标 */}
        {word.pronunciation && (
          <div className={`px-6 pt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
            <div className="flex items-center gap-2 text-sm">
              <Volume2 className="w-3.5 h-3.5 cursor-pointer hover:text-primary transition-colors" onClick={onPlay} />
              <span className="truncate">{word.pronunciation}</span>
            </div>
          </div>
        )}

        {/* 释义列表 - 按词性分组合并 */}
        <div className="p-6 space-y-3">
          {(() => {
            // 按词性分组
            const grouped = {};
            word.definitions?.forEach((def, index) => {
              const pos = def.partOfSpeech || '未知';
              if (!grouped[pos]) {
                grouped[pos] = [];
              }
              grouped[pos].push({ ...def, originalIndex: index });
            });

            return Object.entries(grouped).map(([pos, defs]) => (
              <div key={pos} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                {/* 词性和释义 - 在同一行 */}
                <div className="flex items-start gap-2 mb-3">
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-primary-light text-primary">
                    {posToAbbr(pos)}
                  </span>
                  <div className="flex items-start gap-2 flex-1 group">
                    {/* 释义文本 - 可选择，过长截断 */}
                    <p className={`text-sm select-text cursor-text flex-1 line-clamp-2 ${
                      playingExample === defs[0].definition
                        ? 'text-primary'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                    }`}>
                      {defs.map(d => d.definition).join('，')}
                      {loadingAudio && playingExample === defs[0].definition && (
                        <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          音频准备中...
                        </span>
                      )}
                    </p>
                    {/* 播放按钮 */}
                    <button
                      onClick={() => playExample(defs[0].definition)}
                      disabled={loadingAudio}
                      className={`flex-shrink-0 transition-opacity ${playingExample === defs[0].definition ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'} ${loadingAudio ? 'cursor-wait' : ''}`}
                    >
                      {loadingAudio && playingExample === defs[0].definition ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Volume2 className={`w-3.5 h-3.5 ${playingExample === defs[0].definition ? 'text-primary' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} />
                      )}
                    </button>
                  </div>
                </div>

                {/* 例句 - 显示第一个有例句的 */}
                {defs.some(d => d.example) && (
                  <div className="space-y-2">
                    {defs.filter(d => d.example).slice(0, 2).map((d, i) => (
                      <div key={i} className="group">
                        <div className="flex items-start gap-2">
                          {/* 播放按钮 - 只有点击喇叭才播放 */}
                          <button
                            onClick={() => playExample(d.example)}
                            disabled={loadingAudio}
                            className={`flex-shrink-0 mt-0.5 transition-opacity ${playingExample === d.example ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'} ${loadingAudio ? 'cursor-wait' : ''}`}
                          >
                            {loadingAudio && playingExample === d.example ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Volume2 className={`w-4 h-4 ${playingExample === d.example ? 'text-primary' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} />
                            )}
                          </button>
                          {/* 例句文本 - 单词可点击 */}
                          <p
                            className={`text-base select-text italic font-medium ${
                              playingExample === d.example
                                ? 'text-primary'
                                : theme === 'dark'
                                  ? 'text-gray-200'
                                  : 'text-gray-800'
                            }`}
                          >
                            "{renderClickableSentence(d.example)}"
                            {loadingAudio && playingExample === d.example && (
                              <span className={`ml-2 text-xs font-normal not-italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                例句音频准备中...
                              </span>
                            )}
                          </p>
                        </div>
                        {d.exampleTranslation && (
                          <p className={`text-xs pl-6 mt-1 select-text cursor-text ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {d.exampleTranslation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}

          {/* 配图显示 - 如果有导入的配图 */}
          {currentWord.imageUrl && currentWord.imageUrl[0] && (
            <div className="mt-4">
              <div className={`rounded-lg overflow-hidden border relative group ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <img src={currentWord.imageUrl[imageIndex]} alt={currentWord.word} className="w-full h-auto object-contain max-h-64" />

                {/* 删除按钮 - 右上角，悬停时显示 */}
                <button
                  onClick={handleDeleteImage}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100
                    ${theme === 'dark'
                      ? 'bg-red-500/80 hover:bg-red-600 text-white'
                      : 'bg-red-500/90 hover:bg-red-600 text-white'
                    }
                  `}
                  title={`删除第 ${imageIndex + 1} 张配图`}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 多张图片时显示切换按钮 */}
                {imageCount > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all
                        ${theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800 text-white' : 'bg-white/80 hover:bg-white text-gray-800'}
                      `}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all
                        ${theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800 text-white' : 'bg-white/80 hover:bg-white text-gray-800'}
                      `}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs
                      ${theme === 'dark' ? 'bg-gray-900/80 text-white' : 'bg-white/80 text-gray-800'}
                    `}>
                      {imageIndex + 1} / {imageCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 时态形式列表 - 移到释义后面 */}
          {(() => {
            const forms = getWordForms(word.word);
            if (!forms) return null;

            // 过滤掉原形本身
            const formList = [
              forms.past && forms.past !== word.word && { form: forms.past, label: '过去式' },
              forms.pastParticiple && forms.pastParticiple !== word.word && forms.pastParticiple !== forms.past && { form: forms.pastParticiple, label: '过去分词' },
              forms.presentParticiple && forms.presentParticiple !== word.word && { form: forms.presentParticiple, label: '现在分词' },
              forms.thirdPerson && forms.thirdPerson !== word.word && { form: forms.thirdPerson, label: '第三人称单数' },
            ].filter(Boolean);

            if (formList.length === 0) return null;

            return (
              <div className={`px-6 py-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1 mb-2 text-sm">
                  <Info className="w-3.5 h-3.5" />
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>时态形式:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formList.map(({ form, label }) => (
                    <button
                      key={label}
                      onClick={() => {
                        // 取消当前播放
                        speechSynthesis.cancel();

                        // 设置播放状态
                        setPlayingForm(form);

                        // 短暂延迟确保UI更新
                        setTimeout(() => {
                          const utterance = new SpeechSynthesisUtterance(form);

                          // 使用最佳语音（与主播放按钮相同的逻辑）
                          const bestVoice = getBestEnglishVoice();
                          if (bestVoice) {
                            utterance.voice = bestVoice;
                          }

                          utterance.lang = 'en-US';
                          utterance.rate = 1.0;      // 正常语速
                          utterance.pitch = 0.95;    // 稍微降低音调，更自然
                          utterance.volume = 1.0;

                          // 播放结束时清除状态
                          utterance.onend = () => {
                            setPlayingForm(null);
                          };

                          utterance.onerror = () => {
                            setPlayingForm(null);
                          };

                          // 播放
                          speechSynthesis.speak(utterance);
                        }, 50);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1
                        ${playingForm === form
                          ? 'bg-primary text-white border-primary'
                          : theme === 'dark'
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-primary border border-gray-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-primary border border-gray-200'
                        }`}
                      title="点击发音"
                    >
                      {playingForm === form ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>播放中...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-primary">{form}</span>
                          <span className="opacity-60">({label})</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 底部信息 */}
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                添加于 {new Date(word.createdAt).toLocaleString('zh-CN')}
              </div>
              <div className="flex items-center gap-2">
                {/* 重新生成释义按钮 */}
                <button
                  onClick={handleRefreshDefinition}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-500 hover:text-primary' : 'hover:bg-gray-100 text-gray-400 hover:text-primary'}`}
                  title="重新生成释义"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {/* 删除按钮 */}
                <button
                  onClick={onDelete}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-500 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}`}
                  title="删除此单词"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 单词小弹窗 - 点击例句中的单词后显示 */}
      {wordDetail && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/30"
          onClick={() => setWordDetail(null)}
        >
          <div
            className={`relative w-full max-w-sm rounded-lg shadow-xl
              ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold text-primary`}>
                {wordDetail.word}
              </h3>
              <button
                onClick={() => setWordDetail(null)}
                className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-4 max-h-60 overflow-y-auto">
              {isLoadingWord ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* 音标 */}
                  {wordDetail.pronunciation && (
                    <div className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {wordDetail.pronunciation}
                    </div>
                  )}

                  {/* 释义 */}
                  {wordDetail.definitions && wordDetail.definitions.length > 0 && (
                    <div className="space-y-2">
                      {wordDetail.definitions.slice(0, 3).map((def, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {def.partOfSpeech ? posToAbbr(def.partOfSpeech) : 'n.'}
                          </span>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {def.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 例句 */}
                  {wordDetail.definitions && wordDetail.definitions[0]?.example && (
                    <div className="mt-3 pt-3 border-t">
                      <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        "{wordDetail.definitions[0].example}"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 底部按钮 */}
            <div className={`p-3 border-t flex justify-end ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={handleAddToWordbook}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all bg-primary text-white hover:bg-primary-hover`}
              >
                添加到单词本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 加载遮罩
function LoadingOverlay({ theme }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full spinner"></div>
      </div>
    </div>
  );
}

export default WordList;
