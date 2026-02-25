import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, CheckCircle, Star, Flame } from 'lucide-react';
import WordImage from './WordImage';

const ROUND_SIZE = 5;
const GAME_SIZE = 15;
const MODES = ['image-word', 'definition-word'];

// 多邻国风格：正确态绿色（Feather Green）
const CORRECT_GREEN = '#58CC02';

function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(523.25, 0, 0.12);
    playTone(659.25, 0.12, 0.14);
  } catch (_) {}
}

function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 180;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomWords(words, n) {
  if (words.length <= n) return shuffle(words);
  return shuffle(words).slice(0, n);
}

/** 一局最多 15 词（5 词起即可开一局）；图片模式仅当有图词 ≥5 时可用 */
function getNewGame(words) {
  const withImages = words.filter(w => w.imageUrl?.[0]);
  const canImage = withImages.length >= ROUND_SIZE;
  const mode = canImage ? MODES[Math.floor(Math.random() * MODES.length)] : 'definition-word';
  const pool = mode === 'image-word' ? withImages : words;
  const count = Math.min(GAME_SIZE, pool.length);
  return { mode, gameWords: pickRandomWords(pool, count) };
}

function getEncouragement(totalCorrect, maxStreak, totalInGame) {
  if (totalCorrect === totalInGame) {
    if (maxStreak >= totalInGame) return { title: '全对！记忆力超群！', sub: `${totalInGame} 个词一气呵成，太强了～` };
    return { title: '全部配对成功！', sub: `本局连对最多 ${maxStreak} 个，继续保持！` };
  }
  if (maxStreak >= 10) return { title: '很厉害！', sub: `连对 ${maxStreak} 个，手感火热～` };
  if (maxStreak >= 5) return { title: '做得不错！', sub: `连对 ${maxStreak} 个，下次争取更长连对～` };
  if (totalCorrect >= totalInGame * 0.6) return { title: '完成本局！', sub: '多玩几局，连对会越来越多的～' };
  return { title: '本局结束～', sub: '再试一次，你会越记越牢的！' };
}

function MatchMode({ words: wordsProp, theme, onClose, onPlay }) {
  const words = Array.isArray(wordsProp) ? wordsProp : [];

  const [game, setGame] = useState(() => getNewGame(words));
  const [roundIndex, setRoundIndex] = useState(0);
  const { mode, gameWords } = game;

  const totalRounds = Math.ceil(gameWords.length / ROUND_SIZE);
  const roundWords = useMemo(
    () => gameWords.slice(roundIndex * ROUND_SIZE, roundIndex * ROUND_SIZE + ROUND_SIZE),
    [gameWords, roundIndex]
  );

  const leftItems = useMemo(() => {
    return shuffle(roundWords.map(word => ({ word, displayType: mode })));
  }, [roundWords, mode]);

  const rightItems = useMemo(() => shuffle(roundWords), [roundWords]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedLeft, setMatchedLeft] = useState(new Set());
  const [matchedRight, setMatchedRight] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const roundComplete = matchedLeft.size === roundWords.length;
  const gameComplete = roundIndex === totalRounds - 1 && roundComplete;
  const totalDone = roundIndex * ROUND_SIZE + matchedLeft.size;

  // 本屏完成后自动切入下一组（1.2 秒后）
  useEffect(() => {
    if (!roundComplete || gameComplete) return;
    const timer = setTimeout(goNextRound, 1200);
    return () => clearTimeout(timer);
  }, [roundComplete, gameComplete, goNextRound]);

  const handleLeftClick = useCallback((index) => {
    if (matchedLeft.has(index)) return;
    onPlay?.(leftItems[index].word);
    setSelectedLeft(prev => (prev === index ? null : index));
    setSelectedRight(null);
  }, [matchedLeft, leftItems, onPlay]);

  const handleRightClick = useCallback((index) => {
    if (matchedRight.has(index)) return;
    onPlay?.(rightItems[index]);
    if (selectedLeft === null) return;

    const leftWord = leftItems[selectedLeft].word;
    const rightWord = rightItems[index];
    if (leftWord.id === rightWord.id) {
      playCorrectSound();
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));
      setTotalCorrect(prev => prev + 1);
      setMatchedLeft(prev => new Set([...prev, selectedLeft]));
      setMatchedRight(prev => new Set([...prev, index]));
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      playWrongSound();
      setCurrentStreak(0);
      setWrongFlash(index);
      setSelectedRight(index);
      setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 600);
    }
  }, [selectedLeft, leftItems, rightItems, matchedRight, currentStreak, onPlay]);

  const goNextRound = useCallback(() => {
    if (roundIndex < totalRounds - 1) {
      setRoundIndex(prev => prev + 1);
      setMatchedLeft(new Set());
      setMatchedRight(new Set());
      setSelectedLeft(null);
      setSelectedRight(null);
      setWrongFlash(null);
    }
  }, [roundIndex, totalRounds]);

  const startNewGame = useCallback(() => {
    setGame(getNewGame(words));
    setRoundIndex(0);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongFlash(null);
    setTotalCorrect(0);
    setCurrentStreak(0);
    setMaxStreak(0);
  }, [words]);

  const renderContent = () => {
    if (words.length < ROUND_SIZE) {
      return (
        <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-8 ${theme === 'dark' ? 'bg-[#1a1d21]' : 'bg-[#f7f7f5]'}`}>
          <div className={`rounded-2xl p-8 max-w-sm text-center shadow-lg ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white'}`}>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              至少需要 {ROUND_SIZE} 个单词才能玩消消乐哦
            </p>
            <button type="button" onClick={onClose} className="mt-6 px-6 py-3 rounded-2xl font-semibold bg-primary text-white hover:bg-primary-hover transition-all active:scale-[0.98]">
              返回
            </button>
          </div>
        </div>
      );
    }

    if (gameWords.length === 0) {
      return (
        <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-8 ${theme === 'dark' ? 'bg-[#1a1d21]' : 'bg-[#f7f7f5]'}`}>
          <div className={`rounded-2xl p-8 max-w-sm text-center shadow-lg ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white'}`}>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              本局无法开始，请返回后重试
            </p>
            <button type="button" onClick={onClose} className="mt-6 px-6 py-3 rounded-2xl font-semibold bg-primary text-white hover:bg-primary-hover transition-all active:scale-[0.98]">
              返回
            </button>
          </div>
        </div>
      );
    }

    const modeLabel = mode === 'image-word' ? '图片 ⇄ 单词' : '释义 ⇄ 单词';
    const encouragement = gameComplete ? getEncouragement(totalCorrect, maxStreak, gameWords.length) : null;
    const progressPct = gameWords.length ? (totalDone / gameWords.length) * 100 : 0;

    return (
      <div className={`fixed inset-0 z-[10000] flex flex-col min-h-0 ${theme === 'dark' ? 'bg-[#1a1d21]' : 'bg-[#f7f7f5]'}`}>
      {/* 顶部：关闭 + 进度条 + 连对 */}
      <header className={`flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 ${theme === 'dark' ? 'bg-[#1a1d21]' : 'bg-[#f7f7f5]'}`}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <button type="button" onClick={onClose} className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`} aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
          <div className={`flex-1 min-w-0 text-center text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {modeLabel}
          </div>
          {currentStreak > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-semibold text-sm">
              <Flame className="w-4 h-4" />
              {currentStreak}
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, backgroundColor: CORRECT_GREEN }}
          />
        </div>
        <p className={`mt-1.5 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          第 {roundIndex + 1}/{totalRounds} 屏 · 已配对 {totalDone}/{gameWords.length}
        </p>
      </header>

      {/* 本局结束：全部完成，多邻国式庆祝卡片 */}
      {gameComplete && encouragement && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
          <div className={`w-full max-w-md rounded-3xl p-8 sm:p-10 text-center shadow-xl ${theme === 'dark' ? 'bg-gray-800/90' : 'bg-white'}`}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: `${CORRECT_GREEN}20` }}>
              <CheckCircle className="w-12 h-12" style={{ color: CORRECT_GREEN }} />
            </div>
            {maxStreak >= gameWords.length && (
              <div className="flex justify-center gap-1 mb-3">
                <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
              </div>
            )}
            <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {encouragement.title}
            </h2>
            <p className={`text-base mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {encouragement.sub}
            </p>
            <p className={`text-sm mb-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              本局 {gameWords.length}/{gameWords.length} 配对成功{maxStreak > 0 ? ` · 连对最多 ${maxStreak} 个` : ''}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button type="button" onClick={startNewGame} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]" style={{ backgroundColor: CORRECT_GREEN }}>
                <RefreshCw className="w-5 h-5" /> 再玩一局
              </button>
              <button type="button" onClick={onClose} className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.98] ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 本屏 5 个配对完成，进入下一屏 */}
      {roundComplete && !gameComplete && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className={`w-full max-w-sm rounded-3xl p-8 text-center shadow-lg ${theme === 'dark' ? 'bg-gray-800/90' : 'bg-white'}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${CORRECT_GREEN}20` }}>
              <CheckCircle className="w-10 h-10" style={{ color: CORRECT_GREEN }} />
            </div>
            <p className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>本屏全部正确！</p>
            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              已完成 {totalDone}/{gameWords.length}{currentStreak > 0 ? ` · 连对 ${currentStreak} 个` : ''}
            </p>
            <button type="button" onClick={goNextRound} className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]" style={{ backgroundColor: CORRECT_GREEN }}>
              下一屏
            </button>
          </div>
        </div>
      )}

      {/* 配对区域：一屏 5 个，多邻国式圆角卡片 */}
      {!roundComplete && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto min-h-0">
          <div className="w-full max-w-2xl grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              {leftItems.map((item, index) => {
                const isMatched = matchedLeft.has(index);
                const isSelected = selectedLeft === index;
                return (
                  <button
                    key={`left-${item.word?.id ?? index}-${index}`}
                    type="button"
                    onClick={() => handleLeftClick(index)}
                    disabled={isMatched}
                    className={`w-full rounded-2xl border-2 p-4 sm:p-5 text-left transition-all duration-200 min-h-[88px] sm:min-h-[100px] flex items-center justify-center shadow-sm active:scale-[0.98] ${
                      isMatched
                        ? 'cursor-default border-transparent opacity-90 shadow-inner'
                        : isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-transparent border-primary shadow-md'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-800/80 hover:bg-gray-700/80 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                    }`}
                    style={isMatched ? { backgroundColor: `${CORRECT_GREEN}18`, borderColor: `${CORRECT_GREEN}50` } : undefined}
                  >
                    {mode === 'image-word' ? (
                      <WordImage
                        src={item.word?.imageUrl?.[0]}
                        alt={item.word?.word || ''}
                        keyword={item.word?.word?.charAt(0)?.toUpperCase() || '?'}
                        theme={theme}
                        className="max-h-20 sm:max-h-24 w-full object-contain rounded-lg"
                      />
                    ) : (
                      <span className={`line-clamp-2 text-base sm:text-lg leading-snug ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {item.word?.definitions?.[0]?.definition || '—'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3 sm:space-y-4">
              {rightItems.map((word, index) => {
                const isMatched = matchedRight.has(index);
                const isWrong = wrongFlash === index;
                return (
                  <button
                    key={`right-${word?.id ?? index}-${index}`}
                    type="button"
                    onClick={() => handleRightClick(index)}
                    disabled={isMatched}
                    className={`w-full rounded-2xl border-2 p-4 sm:p-5 text-center transition-all duration-200 font-semibold text-lg sm:text-xl min-h-[88px] sm:min-h-[100px] flex items-center justify-center shadow-sm active:scale-[0.98] ${
                      isMatched
                        ? 'cursor-default border-transparent opacity-90 shadow-inner'
                        : isWrong
                          ? 'border-red-400 bg-red-50 dark:bg-red-500/10 animate-shake'
                          : theme === 'dark'
                            ? 'border-gray-600 bg-gray-800/80 hover:bg-gray-700/80 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                    } ${theme === 'dark' && !isMatched && !isWrong ? 'text-gray-100' : isWrong ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
                    style={isMatched ? { backgroundColor: `${CORRECT_GREEN}18`, borderColor: `${CORRECT_GREEN}50` } : undefined}
                  >
                    {word?.word ?? '—'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
    );
  };

  return createPortal(renderContent(), document.body);
}

export default MatchMode;
