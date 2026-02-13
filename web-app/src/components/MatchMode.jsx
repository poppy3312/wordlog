import React, { useState, useMemo, useCallback } from 'react';
import { X, RefreshCw, CheckCircle, Star } from 'lucide-react';

const ROUND_SIZE = 5;
const GAME_SIZE = 15;
const MODES = ['image-word', 'definition-word'];

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

function MatchMode({ words, theme, onClose }) {
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

  const handleLeftClick = useCallback((index) => {
    if (matchedLeft.has(index)) return;
    setSelectedLeft(prev => (prev === index ? null : index));
    setSelectedRight(null);
  }, [matchedLeft]);

  const handleRightClick = useCallback((index) => {
    if (matchedRight.has(index)) return;
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
  }, [selectedLeft, leftItems, rightItems, matchedRight, currentStreak]);

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

  if (words.length < ROUND_SIZE) {
    return (
      <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          至少需要 {ROUND_SIZE} 个单词才能玩消消乐哦
        </p>
        <button type="button" onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover">
          返回
        </button>
      </div>
    );
  }

  const modeLabel = mode === 'image-word' ? '图片 ⇄ 单词' : '释义 ⇄ 单词';
  const encouragement = gameComplete ? getEncouragement(totalCorrect, maxStreak, gameWords.length) : null;

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onClose} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>单词消消乐</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {modeLabel} · 第 {roundIndex + 1}/{totalRounds} 屏 · 已配对 {totalDone}/{gameWords.length}
              {currentStreak > 0 && ` · 连对 ${currentStreak}`}
            </div>
          </div>
        </div>
      </div>

      {/* 本局结束：15 词全部完成，展示反馈 */}
      {gameComplete && encouragement && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <Star className="w-10 h-10 text-amber-400" />
          </div>
          <p className={`text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {encouragement.title}
          </p>
          <p className={`text-base mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {encouragement.sub}
          </p>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            本局 {gameWords.length}/{gameWords.length} 配对成功{maxStreak > 0 ? ` · 连对最多 ${maxStreak} 个` : ''}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={startNewGame} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover">
              <RefreshCw className="w-4 h-4" /> 再玩一局
            </button>
            <button type="button" onClick={onClose} className={`px-5 py-2.5 rounded-xl font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
              完成
            </button>
          </div>
        </div>
      )}

      {/* 当前一屏 5 个配对完成，进入下一屏 */}
      {roundComplete && !gameComplete && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <p className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>本屏全部正确！</p>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            已完成 {totalDone}/{gameWords.length} · {currentStreak > 0 ? `当前连对 ${currentStreak} 个` : '继续下一屏～'}
          </p>
          <button type="button" onClick={goNextRound} className="px-6 py-2.5 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover">
            下一屏
          </button>
        </div>
      )}

      {/* 配对区域：一屏 5 个 */}
      {!roundComplete && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl grid grid-cols-2 gap-8">
            <div className="space-y-3">
              {leftItems.map((item, index) => {
                const isMatched = matchedLeft.has(index);
                const isSelected = selectedLeft === index;
                return (
                  <button
                    key={`left-${item.word.id}-${index}`}
                    type="button"
                    onClick={() => handleLeftClick(index)}
                    disabled={isMatched}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all min-h-[80px] flex items-center justify-center ${
                      isMatched ? 'border-green-500/50 bg-green-500/10 opacity-70 cursor-default'
                        : isSelected ? 'border-primary bg-primary/10'
                        : theme === 'dark' ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {mode === 'image-word' ? (
                      item.word.imageUrl?.[0] ? (
                        <img src={item.word.imageUrl[0]} alt="" className="max-h-16 w-full object-contain" />
                      ) : (
                        <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>?</span>
                      )
                    ) : (
                      <span className={`line-clamp-2 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {item.word.definitions?.[0]?.definition || '—'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {rightItems.map((word, index) => {
                const isMatched = matchedRight.has(index);
                const isWrong = wrongFlash === index;
                return (
                  <button
                    key={`right-${word.id}-${index}`}
                    type="button"
                    onClick={() => handleRightClick(index)}
                    disabled={isMatched}
                    className={`w-full rounded-xl border-2 p-4 text-center transition-all font-medium ${
                      isMatched ? 'border-green-500/50 bg-green-500/10 opacity-70 cursor-default'
                        : isWrong ? 'border-red-500 bg-red-500/20 animate-shake'
                        : theme === 'dark' ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {word.word}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}

export default MatchMode;
