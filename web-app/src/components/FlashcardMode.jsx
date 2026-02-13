import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, X, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWordStore } from '../store/useWordStore';

const updateWordMastery = useWordStore.getState().updateWord;

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

// localStorage 会话持久化 key
const FLASHCARD_SESSION_KEY = 'wordlog_flashcard_session';

function saveFlashcardSession(data) {
  try {
    localStorage.setItem(FLASHCARD_SESSION_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save flashcard session:', e);
  }
}

function loadFlashcardSession() {
  try {
    const raw = localStorage.getItem(FLASHCARD_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearFlashcardSession() {
  localStorage.removeItem(FLASHCARD_SESSION_KEY);
}

function FlashcardMode({ words, theme, onClose, onPlay }) {
  // 恢复或创建闪卡会话
  const [shuffledWords] = useState(() => {
    const saved = loadFlashcardSession();
    // 如果有保存的会话且单词数量相同，恢复顺序
    if (saved && saved.wordIds && saved.wordIds.length === words.length) {
      const wordMap = {};
      words.forEach(w => { wordMap[w.id] = w; });
      // 检查所有保存的 ID 是否都存在
      const allExist = saved.wordIds.every(id => wordMap[id]);
      if (allExist) {
        return saved.wordIds.map(id => wordMap[id]);
      }
    }
    // 否则重新打乱
    return [...words].sort(() => Math.random() - 0.5);
  });

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved && saved.wordIds && saved.wordIds.length === words.length) {
      return saved.currentIndex || 0;
    }
    return 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);

  const [progress, setProgress] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved && saved.wordIds && saved.wordIds.length === words.length) {
      return saved.progress || { known: 0, unknown: 0 };
    }
    return { known: 0, unknown: 0 };
  });

  const [isPlaying, setIsPlaying] = useState(false); // 播放状态
  const [playingExample, setPlayingExample] = useState(null); // 正在播放的例句

  const [masteryRecords, setMasteryRecords] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved && saved.wordIds && saved.wordIds.length === words.length) {
      return saved.masteryRecords || {};
    }
    return {};
  }); // 记录每个单词的掌握状态 {wordId: 'known' | 'unknown'}

  const currentWord = shuffledWords[currentIndex];
  const isLastCard = currentIndex === shuffledWords.length - 1;
  const playTimeoutRef = useRef(null);
  const playCountRef = useRef(0);

  // 自动保存会话到 localStorage
  useEffect(() => {
    saveFlashcardSession({
      wordIds: shuffledWords.map(w => w.id),
      currentIndex,
      progress,
      masteryRecords,
    });
  }, [currentIndex, progress, masteryRecords, shuffledWords]);

  // 播放单词发音
  const playWordAudio = useCallback((count = 1) => {
    if (!currentWord) return;

    // 取消之前的播放和定时器
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    // 播放指定次数
    const playMultipleTimes = (times) => {
      if (times <= 0) return;

      playCountRef.current = times;

      // 立即播放第一次
      setIsPlaying(true);
      if (onPlay) {
        onPlay(currentWord.word);
      }

      // 如果需要播放多次
      if (times > 1) {
        let playedCount = 1;
        const interval = setInterval(() => {
          if (playedCount < times) {
            setIsPlaying(true);
            if (onPlay) {
              onPlay(currentWord.word);
            }
            playedCount++;
          } else {
            clearInterval(interval);
            // 最后一次播放后延迟重置状态
            setTimeout(() => {
              setIsPlaying(false);
            }, 600);
          }
        }, 800); // 每800ms播放一次

        // 保存定时器以便清理
        playTimeoutRef.current = interval;
      } else {
        // 单次播放后重置状态
        setTimeout(() => {
          setIsPlaying(false);
        }, 600);
      }
    };

    playMultipleTimes(count);
  }, [currentWord, onPlay]);

  // 当前播放的 Audio 实例引用
  const currentAudioRef = useRef(null);

  // Web Speech API 回退播放
  const playExampleFallback = useCallback((example) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(example);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;
    utterance.onend = () => setPlayingExample(null);
    utterance.onerror = () => setPlayingExample(null);
    speechSynthesis.speak(utterance);
  }, []);

  // 播放例句 - 优先使用 Edge TTS，失败回退 Web Speech API
  const playExample = useCallback((example) => {
    if (!example) return;

    // 停止之前的播放
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    setPlayingExample(example);

    // 尝试 Edge TTS API
    const ttsUrl = `/api/tts?text=${encodeURIComponent(example)}&voice=en-US-AriaNeural`;
    const audio = new Audio(ttsUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      setPlayingExample(null);
      currentAudioRef.current = null;
    };

    audio.onerror = () => {
      // Edge TTS 失败，回退到 Web Speech API
      console.warn('Edge TTS failed, falling back to Web Speech API');
      currentAudioRef.current = null;
      playExampleFallback(example);
    };

    audio.play().catch(() => {
      // 播放失败也回退
      currentAudioRef.current = null;
      playExampleFallback(example);
    });
  }, [playExampleFallback]);

  // 翻转卡片时自动播放2遍
  useEffect(() => {
    if (isFlipped && currentWord) {
      // 翻转时自动播放2遍
      playWordAudio(2);
    }

    // 清理函数
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [isFlipped, currentWord, playWordAudio]);

  // 切换单词时自动播放1遍（正面）
  useEffect(() => {
    if (currentWord) {
      // 延迟播放，确保卡片动画流畅
      const timer = setTimeout(() => {
        playWordAudio(1);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, playWordAudio]);

  // 翻转卡片
  const flipCard = () => {
    setIsFlipped(prev => !prev);
  };

  // 保存掌握度到 store
  const saveMasteryData = useCallback(() => {
    const updateWord = useWordStore.getState().updateWord;

    Object.entries(masteryRecords).forEach(([wordId, masteryLevel]) => {
      updateWord(wordId, { masteryLevel });
    });
  }, [masteryRecords]);

  // 下一个卡片
  const nextCard = useCallback(() => {
    if (isLastCard) {
      // 完成所有卡片，先保存数据、清除会话再关闭
      saveMasteryData();
      clearFlashcardSession();
      onClose();
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setIsFlipped(false);
  }, [isLastCard, onClose, saveMasteryData]);

  // 上一个卡片
  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  // 标记认识/不认识 - 立即保存到 store 和 localStorage
  const markResult = (known) => {
    if (!currentWord) return;

    const masteryLevel = known ? 'known' : 'unknown';

    // 1. 更新 store 内存状态
    const updateWord = useWordStore.getState().updateWord;
    updateWord(currentWord.id, { masteryLevel });

    // 2. 立即持久化到 localStorage（store 不会自动保存）
    const updatedWords = useWordStore.getState().words;
    localStorage.setItem('wordlog_words', JSON.stringify(updatedWords));

    // 3. 更新本地会话状态
    setMasteryRecords(prev => ({
      ...prev,
      [currentWord.id]: masteryLevel
    }));

    if (known) {
      setProgress(prev => ({ ...prev, known: prev.known + 1 }));
    } else {
      setProgress(prev => ({ ...prev, unknown: prev.unknown + 1 }));
    }
    nextCard();
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          playWordAudio(); // 空格播放单词
          break;
        case 'Enter':
          e.preventDefault();
          flipCard(); // Enter 翻转卡片
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextCard();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevCard();
          break;
        case 'Escape':
          e.preventDefault();
          saveMasteryData();
          // 按 ESC 退出时保留会话（下次可继续），但保存掌握度
          onClose();
          break;
        case '1':
          markResult(false); // 不认识
          break;
        case '2':
          markResult(true); // 认识
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playWordAudio, flipCard, nextCard, prevCard, onClose]);

  // 空状态
  if (!currentWord) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部进度条 */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / shuffledWords.length) * 100}%` }}
        />
      </div>

      {/* 顶部导航 */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              saveMasteryData();
              onClose();
            }}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            title="退出闪卡模式 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              闪卡模式
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {currentIndex + 1} / {shuffledWords.length}
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-6 text-sm">
          <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>认识: {progress.known}</span>
          </div>
          <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>不认识: {progress.unknown}</span>
          </div>
        </div>
      </div>

      {/* 卡片区域 */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`relative w-full max-w-4xl aspect-[5/3] rounded-2xl shadow-2xl transition-all duration-500 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
          style={{ perspective: '1000px' }}
        >
          {/* 卡片内容 */}
          <div
            className={`relative w-full h-full transition-transform duration-500 ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 正面：单词 */}
            {!isFlipped && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden cursor-pointer"
                onClick={flipCard}
              >
                <div className={`text-5xl md:text-6xl font-bold text-primary mb-4 text-center max-w-full px-4 break-words`}>
                  {currentWord.word}
                </div>
                {currentWord.pronunciation && (
                  <div className={`flex items-center gap-2 text-xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Volume2 className="w-5 h-5" />
                    <span>{currentWord.pronunciation}</span>
                  </div>
                )}
                <div className={`mt-8 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  按空格播放 · 点击或按Enter查看答案
                </div>
              </div>
            )}

            {/* 背面：配图 + 释义 */}
            {isFlipped && (
              <div className="absolute inset-0 flex backface-hidden rotate-y-180">
                {/* 有配图：左侧配图，右侧释义 */}
                {currentWord.imageUrl && currentWord.imageUrl[0] ? (
                  <>
                    {/* 左侧：配图 */}
                    <div className="w-1/3 p-4 flex items-center justify-center border-r flex-shrink-0">
                      <img
                        src={currentWord.imageUrl[0]}
                        alt={currentWord.word}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>

                    {/* 右侧：单词和释义 */}
                    <div className="w-2/3 p-8 overflow-y-auto">
                      {/* 单词 - 超大突出 */}
                      <div className="mb-4">
                        <div className={`text-4xl xl:text-5xl font-bold text-primary break-words ${isPlaying ? 'animate-pulse' : ''}`}>
                          {currentWord.word}
                        </div>
                        {currentWord.pronunciation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(currentWord.word);
                            }}
                            className={`flex items-center gap-2 text-base mt-2 ${theme === 'dark' ? 'text-gray-400 hover:text-primary' : 'text-gray-500 hover:text-primary'} transition-colors`}
                          >
                            <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-bounce text-primary' : ''}`} />
                            <span>{currentWord.pronunciation}</span>
                            {isPlaying && (
                              <span className="text-sm text-primary ml-1">播放中...</span>
                            )}
                          </button>
                        )}
                      </div>

                      {/* 分隔线 */}
                      <div className={`h-px my-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                      {/* 释义 - 左对齐布局 */}
                      <div className="space-y-4">
                        {currentWord.definitions?.slice(0, 3).map((def, idx) => (
                          <div key={idx}>
                            {/* 词性（弱化）+ 释义 - 居中对齐 */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                {posToAbbr(def.partOfSpeech)}
                              </span>
                              <p className={`text-base leading-relaxed flex-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                {def.definition}
                              </p>
                            </div>
                            {/* 例句 - 可点击播放 */}
                            {def.example && (
                              <div
                                className={`pl-6 flex items-start gap-2 cursor-pointer group transition-colors ${playingExample === def.example ? (theme === 'dark' ? 'text-primary' : 'text-primary') : (theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600')}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playExample(def.example);
                                }}
                              >
                                <Volume2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${playingExample === def.example ? 'animate-pulse' : ''}`} />
                                <p className="text-sm italic leading-relaxed">
                                  "{def.example}"
                                </p>
                              </div>
                            )}
                            {/* 例句翻译 - 弱化显示 */}
                            {def.exampleTranslation && (
                              <p className={`text-xs pl-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                                {def.exampleTranslation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 提示 */}
                      <div className={`mt-6 pt-4 text-xs text-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                        空格=播放 · 1=不认识 · 2=认识 · 方向键=切换
                      </div>
                    </div>
                  </>
                ) : (
                  /* 无配图：居中显示，突出单词和释义 */
                  <div className="w-full p-10 flex flex-col items-center justify-center">
                    {/* 单词 - 超大突出 */}
                    <div className="mb-4 text-center">
                      <div className={`text-7xl font-bold text-primary mb-3 ${isPlaying ? 'animate-pulse' : ''}`}>
                        {currentWord.word}
                      </div>
                      {currentWord.pronunciation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(currentWord.word);
                          }}
                          className={`flex items-center justify-center gap-2 text-lg ${theme === 'dark' ? 'text-gray-400 hover:text-primary' : 'text-gray-500 hover:text-primary'} transition-colors`}
                        >
                          <Volume2 className={`w-6 h-6 ${isPlaying ? 'animate-bounce text-primary' : ''}`} />
                          <span>{currentWord.pronunciation}</span>
                          {isPlaying && (
                            <span className="text-base text-primary ml-2">播放中...</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* 分隔线 */}
                    <div className={`w-32 h-px my-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                    {/* 释义 - 清晰列表，居中显示 */}
                    <div className="w-full max-w-2xl space-y-4">
                      {currentWord.definitions?.slice(0, 4).map((def, idx) => (
                        <div key={idx} className="text-center">
                          {/* 词性 + 释义 - 同行显示 */}
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                              {posToAbbr(def.partOfSpeech)}
                            </span>
                            <p className={`text-2xl leading-relaxed ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {def.definition}
                            </p>
                          </div>
                          {/* 例句 - 可点击播放 */}
                          {def.example && (
                            <div
                              className={`flex items-center justify-center gap-2 cursor-pointer group transition-colors ${playingExample === def.example ? (theme === 'dark' ? 'text-primary' : 'text-primary') : (theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                playExample(def.example);
                              }}
                            >
                              <Volume2 className={`w-4 h-4 ${playingExample === def.example ? 'animate-pulse' : ''}`} />
                              <p className="text-lg italic leading-relaxed">
                                "{def.example}"
                              </p>
                            </div>
                          )}
                          {/* 例句翻译 - 弱化显示 */}
                          {def.exampleTranslation && (
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                              {def.exampleTranslation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 提示 */}
                    <div className={`mt-8 text-sm text-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                      空格=播放 · 1=不认识 · 2=认识 · 方向键=切换
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* 上一个按钮 */}
          <button
            onClick={prevCard}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            上一个
          </button>

          {/* 中间操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 播放按钮（始终显示） */}
            <button
              onClick={playWordAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isPlaying
                  ? 'bg-primary text-white animate-pulse'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title="播放单词 (空格)"
            >
              <Volume2 className="w-4 h-4" />
              播放
            </button>

            {!isFlipped ? (
              <button
                onClick={flipCard}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-all"
              >
                <RotateCw className="w-4 h-4" />
                查看答案
              </button>
            ) : (
              <>
                <button
                  onClick={() => markResult(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  不认识 (1)
                </button>
                <button
                  onClick={() => markResult(true)}
                  className="px-6 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
                >
                  认识 (2)
                </button>
              </>
            )}
          </div>

          {/* 下一个按钮 */}
          <button
            onClick={nextCard}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            {isLastCard ? '完成' : '下一个'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CSS for 3D flip effect */}
      <style jsx>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}

export default FlashcardMode;
