import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWordStore } from '../store/useWordStore';
import { debouncedSaveWords, flushDebouncedSave } from '../utils/chromeStorage';

const REINSERT_AFTER = 4; // 选「生」时隔几张牌再出现

function posToAbbr(pos) {
  const mapping = {
    '名词': 'n.', '动词': 'v.', '形容词': 'adj.', '副词': 'adv.',
    '其他': 'other', '未知': 'unknown'
  };
  return mapping[pos] || pos;
}

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
  const wordMap = useRef(null);
  if (!wordMap.current) wordMap.current = Object.fromEntries(words.map(w => [w.id, w]));

  const [deck, setDeck] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved?.deckIds?.length === words.length) {
      const map = Object.fromEntries(words.map(w => [w.id, w]));
      const allExist = saved.deckIds.every(id => map[id]);
      if (allExist) return saved.deckIds.map(id => map[id]);
    }
    return [...words].sort(() => Math.random() - 0.5);
  });

  const [history, setHistory] = useState([]);

  const [isRevealed, setIsRevealed] = useState(false);

  const [progress, setProgress] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved?.deckIds?.length === words.length) return saved.progress || { known: 0, unknown: 0 };
    return { known: 0, unknown: 0 };
  });

  const [masteryRecords, setMasteryRecords] = useState(() => {
    const saved = loadFlashcardSession();
    if (saved?.deckIds?.length === words.length) return saved.masteryRecords || {};
    return {};
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingExample, setPlayingExample] = useState(null);
  const currentAudioRef = useRef(null);
  const playTimeoutRef = useRef(null);

  const currentWord = deck[0];
  const totalInSession = words.length;
  const doneCount = history.length + (deck.length === 0 ? 1 : 0);

  useEffect(() => {
    saveFlashcardSession({
      deckIds: deck.map(w => w.id),
      progress,
      masteryRecords,
    });
  }, [deck, progress, masteryRecords]);

  const playWordAudio = useCallback((count = 1) => {
    if (!currentWord) return;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    const play = (times) => {
      if (times <= 0) return;
      setIsPlaying(true);
      onPlay?.(currentWord.word);
      if (times > 1) {
        let n = 1;
        const id = setInterval(() => {
          if (n < times) {
            setIsPlaying(true);
            onPlay?.(currentWord.word);
            n++;
          } else {
            clearInterval(id);
            setTimeout(() => setIsPlaying(false), 600);
          }
        }, 800);
        playTimeoutRef.current = id;
      } else {
        setTimeout(() => setIsPlaying(false), 600);
      }
    };
    play(count);
  }, [currentWord, onPlay]);

  const playExampleFallback = useCallback((example) => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(example);
    u.lang = 'en-US';
    u.onend = () => setPlayingExample(null);
    u.onerror = () => setPlayingExample(null);
    speechSynthesis.speak(u);
  }, []);

  const playExample = useCallback((example) => {
    if (!example) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setPlayingExample(example);
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(example)}&voice=en-US-AriaNeural`);
    currentAudioRef.current = audio;
    audio.onended = () => { setPlayingExample(null); currentAudioRef.current = null; };
    audio.onerror = () => { currentAudioRef.current = null; playExampleFallback(example); };
    audio.play().catch(() => { currentAudioRef.current = null; playExampleFallback(example); });
  }, [playExampleFallback]);

  useEffect(() => {
    if (isRevealed && currentWord) playWordAudio(2);
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, [isRevealed, currentWord?.id]);

  const saveMasteryData = useCallback(() => {
    const updateWord = useWordStore.getState().updateWord;
    Object.entries(masteryRecords).forEach(([wordId, masteryLevel]) => {
      updateWord(wordId, { masteryLevel });
    });
    const wordsState = useWordStore.getState().words;
    debouncedSaveWords(wordsState);
    flushDebouncedSave();
  }, [masteryRecords]);

  const markResult = useCallback((known) => {
    if (!currentWord) return;
    const masteryLevel = known ? 'known' : 'unknown';
    const updateWord = useWordStore.getState().updateWord;
    updateWord(currentWord.id, { masteryLevel });
    const updatedWords = useWordStore.getState().words;
    debouncedSaveWords(updatedWords);
    flushDebouncedSave();

    setMasteryRecords(prev => ({ ...prev, [currentWord.id]: masteryLevel }));
    if (known) setProgress(prev => ({ ...prev, known: prev.known + 1 }));
    else setProgress(prev => ({ ...prev, unknown: prev.unknown + 1 }));

    setHistory(prev => [...prev, currentWord]);

    if (deck.length === 1) {
      saveMasteryData();
      clearFlashcardSession();
      onClose();
      return;
    }

    if (known) {
      setDeck(prev => prev.slice(1));
    } else {
      const insertAt = Math.min(REINSERT_AFTER, prev.length - 1);
      setDeck(prev => [...prev.slice(1, insertAt + 1), prev[0], ...prev.slice(insertAt + 1)]);
    }
    setIsRevealed(false);
  }, [currentWord, deck.length, saveMasteryData, onClose]);

  const goNext = useCallback(() => {
    if (deck.length <= 1) {
      saveMasteryData();
      clearFlashcardSession();
      onClose();
      return;
    }
    setHistory(prev => [...prev, currentWord]);
    setDeck(prev => prev.slice(1));
    setIsRevealed(false);
  }, [currentWord, deck.length, saveMasteryData, onClose]);

  const goPrev = useCallback(() => {
    if (history.length === 0) return;
    const prevWord = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setDeck(prev => [prevWord, ...prev]);
    setIsRevealed(false);
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isRevealed) playWordAudio(1);
          break;
        case 'Enter':
          e.preventDefault();
          if (!isRevealed) setIsRevealed(true);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (isRevealed) goNext();
          else setIsRevealed(true);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          e.preventDefault();
          saveMasteryData();
          onClose();
          break;
        case '1':
          if (isRevealed) markResult(false);
          break;
        case '2':
          if (isRevealed) markResult(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, playWordAudio, goNext, goPrev, markResult, saveMasteryData, onClose]);

  if (!currentWord) return null;

  const hasImage = currentWord.imageUrl?.[0];

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
          style={{ width: `${(doneCount / totalInSession) * 100}%` }}
        />
      </div>

      <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { saveMasteryData(); onClose(); }}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            title="退出 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>闪卡模式</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              剩余 {deck.length} / 共 {totalInSession}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-green-500" /> 熟悉: {progress.known}
          </div>
          <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 生: {progress.unknown}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
          style={{ aspectRatio: '5/3' }}
        >
          {!isRevealed ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => setIsRevealed(true)}
            >
              {hasImage ? (
                <img
                  src={currentWord.imageUrl[0]}
                  alt={currentWord.word}
                  className="max-w-full max-h-full object-contain p-6"
                />
              ) : (
                <div className={`text-4xl font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {currentWord.word}
                </div>
              )}
              <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                点击或按 Enter 显示单词与释义
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col p-6 overflow-hidden">
              <div className="flex flex-1 min-h-0">
                {hasImage && (
                  <div className="w-1/3 flex-shrink-0 flex items-center justify-center pr-4">
                    <img
                      src={currentWord.imageUrl[0]}
                      alt={currentWord.word}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                )}
                <div className={`flex-1 overflow-y-auto ${hasImage ? 'pl-4 border-l border-gray-200 dark:border-gray-700' : ''}`}>
                  <div className={`text-3xl xl:text-4xl font-bold text-primary mb-2 ${isPlaying ? 'animate-pulse' : ''}`}>
                    {currentWord.word}
                  </div>
                  {currentWord.pronunciation && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onPlay?.(currentWord.word); }}
                      className={`flex items-center gap-2 text-lg mb-4 ${theme === 'dark' ? 'text-gray-400 hover:text-primary' : 'text-gray-500 hover:text-primary'}`}
                    >
                      <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-bounce text-primary' : ''}`} />
                      <span>{currentWord.pronunciation}</span>
                    </button>
                  )}
                  {currentWord.definitions?.slice(0, 3).map((def, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                          {posToAbbr(def.partOfSpeech)}
                        </span>
                        <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{def.definition}</span>
                      </div>
                      {def.example && (
                        <div
                          className={`flex items-start gap-2 cursor-pointer pl-4 ${playingExample === def.example ? 'text-primary' : theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'}`}
                          onClick={(e) => { e.stopPropagation(); playExample(def.example); }}
                        >
                          <Volume2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${playingExample === def.example ? 'animate-pulse' : ''}`} />
                          <span className="text-lg italic">"{def.example}"</span>
                        </div>
                      )}
                      {def.exampleTranslation && (
                        <p className={`text-sm pl-8 mt-0.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                          {def.exampleTranslation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-center gap-4 pt-4 mt-auto border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => markResult(false)}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    theme === 'dark' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  生 (1)
                </button>
                <button
                  type="button"
                  onClick={() => markResult(true)}
                  className="px-6 py-2.5 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
                >
                  熟悉 (2)
                </button>
              </div>
              <p className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                空格=播放 · 1=生 · 2=熟悉 · 方向键=切换
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={history.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              history.length === 0 ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft className="w-5 h-5" /> 上一个
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => playWordAudio(1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                isPlaying ? 'bg-primary text-white animate-pulse' : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Volume2 className="w-4 h-4" /> 播放
            </button>
            {!isRevealed && (
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="px-6 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover"
              >
                显示单词
              </button>
            )}
            {isRevealed && deck.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                跳过
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={goNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            {deck.length <= 1 ? '完成' : '下一个'} <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlashcardMode;
