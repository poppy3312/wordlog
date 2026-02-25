import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWordStore } from '../store/useWordStore';
import { debouncedSaveWords, flushDebouncedSave } from '../utils/chromeStorage';
import { unlockAudioForChrome, runAfterUnlock, stopWordPlayback } from '../utils/audioUnlock';
import { playWithGoogleTTS } from '../utils/ttsGoogle';
import WordImage from './WordImage';

const REINSERT_AFTER = 4; // 选「生」时隔几张牌再出现
const SYLLABLE_PAUSE_MS = 380; // 自然拼读分段播放时的间隔（毫秒）

/** 与 WordList 一致：获取最佳英语 TTS 语音，避免机器人声 */
function getBestEnglishVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  const preferred = [
    'Google US English', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Daniel',
    'Google UK English Male', 'Microsoft Aria', 'Microsoft Guy', 'Microsoft Jenny',
    'Natural', 'Neural', 'Premium', 'Enhanced', 'English (United States)', 'en-US', 'American'
  ];
  for (const name of preferred) {
    const v = voices.find(x => x.name.includes(name) || x.voiceURI.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith('en')) || null;
}

/** 简单音节分割（辅元结构），用于自然拼读展示与分段播放 */
function getSyllables(word) {
  const w = word.toLowerCase();
  if (!w.length) return [word];
  const vowels = new Set('aeiou');
  const isVowel = (c) => vowels.has(c);
  const indices = [];
  for (let i = 0; i < w.length; i++) if (isVowel(w[i])) indices.push(i);
  if (indices.length <= 1) return [word];
  const out = [];
  let start = 0;
  for (let k = 0; k < indices.length; k++) {
    const v0 = indices[k];
    const v1 = indices[k + 1];
    if (v1 === undefined) {
      out.push(w.slice(start));
      break;
    }
    const between = v1 - v0 - 1;
    const endIdx = between === 0 ? v0 + 1 : v0 + 1 + Math.min(1, between);
    out.push(w.slice(start, endIdx));
    start = endIdx;
  }
  return out.length ? out : [word];
}

/** 常见前缀：em, en, ex 等，拆出后按音节处理 */
const COMMON_PREFIXES = ['em', 'en', 'ex', 'be', 'de', 're', 'pre', 'un', 'dis', 'mis', 'over', 'under'];

/** 辅音连缀：不拆开，如 sc|ur 而非 s|cu（含 wh/wr/kn/gn 等 silent 开头） */
const CONSONANT_BLENDS = ['scr', 'spr', 'str', 'squ', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'tw', 'wh', 'wr', 'kn', 'gn'];

/** 三字母辅音组合：tch(atch), dge(edge) */
const TRIGRAPHS = ['tch', 'dge'];

/** 词尾 -le 音节：ble, cle, tle 等，table→ta|ble */
const LE_ENDINGS = ['ble', 'cle', 'dle', 'fle', 'gle', 'kle', 'ple', 'tle', 'zle'];

/** 自然拼读颜色分段：按音节划分。embellish → em|bel|lish，scurrying → sc|ur|ry|ing */
function getPhonicSegments(word) {
  const w = word.toLowerCase();
  if (!w.length) return [{ text: w, type: 'consonant' }];
  const vowels = new Set('aeiou');
  const vowelTeams = ['au', 'ou', 'ee', 'oa', 'ai', 'oo', 'ea', 'ie', 'ue', 'ay', 'oy', 'ow', 'ew', 'aw'];
  const rControlled = ['er', 'ir', 'ur', 'ar', 'or'];
  const digraphs = ['th', 'ch', 'sh', 'ck', 'ph', 'ng', 'qu'];
  const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'sion', 'ness', 'ish', 'ful', 'less'];

  const isVowel = (i) => i < w.length && (vowels.has(w[i]) || (w[i] === 'y' && i > 0 && vowels.has(w[i - 1])));
  const isBlend = (s) => CONSONANT_BLENDS.includes(s);

  const syllables = [];
  let i = 0;

  while (i < w.length) {
    let done = false;
    // 1. 词尾后缀（tion/sion 在词中也独立成音节，如 national）
    if (i <= w.length - 2) {
      const rest = w.slice(i);
      const suf = suffixes.find(s => {
        if (!rest.startsWith(s)) return false;
        if (['tion', 'sion'].includes(s)) return true;
        return i + s.length >= w.length || !/[a-z]/.test(w[i + s.length]);
      });
      if (suf) {
        syllables.push(suf);
        i += suf.length;
        done = true;
      }
    }
    // 1b. 词尾 -le 音节：table→ta|ble, little→lit|tle
    if (!done && i <= w.length - 3) {
      const rest = w.slice(i);
      const le = LE_ENDINGS.find(e => rest === e || (rest.startsWith(e) && i + e.length >= w.length));
      if (le) {
        syllables.push(le);
        i += le.length;
        done = true;
      }
    }
    // 2. 词首前缀（如 em-, en-）使 em|bellish → em + 后续
    if (!done && i === 0 && w.length >= 3) {
      const pre = COMMON_PREFIXES.find(p => w.startsWith(p) && w.length > p.length);
      if (pre) {
        syllables.push(pre);
        i = pre.length;
        done = true;
      }
    }
    if (!done && i <= w.length - 2) {
      const two = w.slice(i, i + 2);
      if (vowelTeams.includes(two)) {
        syllables.push(two);
        i += 2;
        done = true;
      } else if (rControlled.includes(two) && (i + 2 >= w.length || !vowels.has(w[i + 2]))) {
        syllables.push(two);
        i += 2;
        done = true;
      } else if (digraphs.includes(two)) {
        syllables.push(two);
        i += 2;
        done = true;
      } else if (i <= w.length - 3 && TRIGRAPHS.includes(w.slice(i, i + 3))) {
        syllables.push(w.slice(i, i + 3));
        i += 3;
        done = true;
      } else if (two === 'qu') {
        syllables.push(two);
        i += 2;
        done = true;
      }
    }
    if (!done && i < w.length) {
      if (isVowel(i)) {
        syllables.push(w[i]);
        i++;
      } else {
        let j = i;
        while (j < w.length && !vowels.has(w[j]) && w[j] !== 'y') j++;
        if (j >= w.length) {
          syllables.push(w.slice(i));
          i = w.length;
        } else {
          const cons = w.slice(i, j);
          let v = w[j];
          let jNext = j + 1;
          // o+o→oo 等：单元音后若可构成 vowel team，扩展元音（boot→b|oo|t）
          if (jNext < w.length && vowelTeams.includes(v + w[jNext])) {
            v = v + w[jNext];
            jNext = j + 2;
          } else if (jNext < w.length && w[jNext] === 'r' && rControlled.includes(v + 'r')) {
            v = v + 'r';
            jNext = j + 2;
          }
          // VCCV：双辅音介于两元音间时按音节拆分（mb→m|b, ll→l|l），辅音连缀不拆（sc→sc）
          if (cons.length >= 2) {
            const isDigraph = digraphs.includes(cons.slice(-2)) || cons.slice(-2) === 'qu';
            const isConsBlend = isBlend(cons);
            if (isConsBlend) {
              syllables.push(cons);
              syllables.push(v);
              i = jNext;
            } else if (!isDigraph && cons.length === 2) {
              syllables.push(cons[0]);
              syllables.push(cons[1] + v);
              i = jNext;
            } else {
              syllables.push(cons);
              syllables.push(v);
              i = jNext;
            }
            done = true;
          }
          if (!done) {
            j = jNext;
            let coda = '';
            if (j < w.length && !vowels.has(w[j]) && w[j] !== 'y') {
              // 若剩余为 -le 音节（ble/tle 等），不取 coda，留给下一音节
              const remainder = w.slice(j);
              const isLeEnding = LE_ENDINGS.some(le => remainder.startsWith(le) && (j + le.length >= w.length || !/[a-z]/.test(w[j + le.length])));
              if (!isLeEnding) {
                let k = j;
                while (k < w.length && !vowels.has(w[k]) && w[k] !== 'y') k++;
                const consAfter = k - j;
                if (consAfter >= 2) {
                  if (TRIGRAPHS.includes(w.slice(j, j + 3))) {
                    coda = w.slice(j, j + 3);
                    j += 3;
                  } else if (digraphs.includes(w.slice(j, j + 2))) {
                    coda = w.slice(j, j + 2);
                    j += 2;
                  } else if (w[j] === w[j + 1]) {
                    coda = w[j];
                    j += 1;
                  } else {
                    coda = w[j];
                    j += 1;
                  }
                } else if (consAfter === 1 && (k >= w.length || suffixes.some(s => w.slice(k).startsWith(s)))) {
                  coda = w[j];
                  j += 1;
                }
              }
            }
            syllables.push(cons + v + coda);
            i = j;
          }
        }
      }
    }
  }

  const segments = [];
  for (const syl of syllables) {
    let type = 'consonant';
    if (rControlled.some(r => syl.includes(r))) type = 'r-controlled';
    else if (vowelTeams.some(vt => syl.includes(vt)) || /^[aeiouy]/.test(syl) || /[aeiou]$/.test(syl)) type = 'vowel';
    segments.push({ text: syl, type });
  }
  return segments.length ? segments : [{ text: w, type: 'consonant' }];
}

// 自然拼读色块：背景色 + 文字色（高对比），参考 brother 分色图
const PHONIC_COLORS = {
  consonant: {
    light: { bg: 'rgba(59, 130, 246, 0.2)', text: '#1D4ED8' },
    dark: { bg: 'rgba(96, 165, 250, 0.25)', text: '#93C5FD' },
  },
  vowel: {
    light: { bg: 'rgba(249, 115, 22, 0.22)', text: '#C2410C' },
    dark: { bg: 'rgba(251, 146, 60, 0.28)', text: '#FDBA74' },
  },
  'r-controlled': {
    light: { bg: 'rgba(107, 114, 128, 0.18)', text: '#4B5563' },
    dark: { bg: 'rgba(156, 163, 175, 0.22)', text: '#D1D5DB' },
  },
};

function posToAbbr(pos) {
  const mapping = {
    '名词': 'n.', '动词': 'v.', '形容词': 'adj.', '副词': 'adv.',
    '代词': 'pron.', '介词': 'prep.', '连词': 'conj.', '感叹词': 'interj.',
    '其他': 'other', '未知': '—',
    noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.',
    pronoun: 'pron.', preposition: 'prep.', conjunction: 'conj.', interjection: 'interj.',
    unknown: '—'
  };
  const raw = (pos || '').trim();
  if (!raw) return '—';
  const key = raw.toLowerCase();
  return mapping[raw] ?? mapping[key] ?? raw;
}

/** 例句中高亮当前单词及其变形（如 form -> form/forming/formed） */
function highlightWordInSentence(sentence, word, theme) {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b(${escaped}\\w*)\\b`, 'gi');
  const parts = sentence.split(regex);
  if (parts.length <= 1) return sentence;
  const highlightClass = theme === 'dark' ? 'font-bold text-primary' : 'font-bold text-primary';
  return parts.map((p, i) => {
    if (i % 2 === 1) return <span key={i} className={highlightClass}>{p}</span>;
    return <span key={i}>{p}</span>;
  });
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
  const playbackCancelledRef = useRef(false);

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

  // 切换单词时立即停止播放（兜底，确保切换后不再播上一个）
  useEffect(() => {
    return () => {
      stopWordPlayback();
      if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }
      playbackCancelledRef.current = true;
    };
  }, [currentWord?.id]);

  const playWordAudio = useCallback((count = 1) => {
    if (!currentWord) return;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    setIsPlaying(true);
    if (count > 1) {
      let n = 0;
      const scheduleNext = () => {
        n++;
        if (n < count) onPlay?.(currentWord, scheduleNext, 1);
        else setTimeout(() => setIsPlaying(false), 600);
      };
      onPlay?.(currentWord, scheduleNext, 1);
    } else {
      onPlay?.(currentWord, () => setIsPlaying(false), 3);
    }
  }, [currentWord, onPlay]);

  /** 按音节分段播放（无真实音频时）或整词播放（有 audioUrl 时），结束时调用 onComplete */
  const playWordAudioBySyllables = useCallback((onComplete) => {
    if (!currentWord?.word) {
      onComplete?.();
      return;
    }
    const done = () => { setIsPlaying(false); onComplete?.(); };

    // 有真实音频时直接整词播放一遍，避免音节 TTS 机器人声
    if (currentWord.audioUrl && currentWord.audioUrl.length > 0) {
      onPlay?.(currentWord, done);
      return;
    }

    if (!('speechSynthesis' in window)) {
      onPlay?.(currentWord);
      setTimeout(done, 600);
      return;
    }
    speechSynthesis.cancel();
    const syllables = getSyllables(currentWord.word);
    if (syllables.length <= 1) {
      onPlay?.(currentWord);
      setTimeout(done, 600);
      return;
    }
    setIsPlaying(true);
    const voice = getBestEnglishVoice();
    let i = 0;
    const speakNext = () => {
      if (i >= syllables.length) {
        setTimeout(done, 300);
        return;
      }
      const u = new SpeechSynthesisUtterance(syllables[i]);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = 1.0;
      u.pitch = 0.98;
      u.onend = () => {
        i++;
        if (i < syllables.length) {
          playTimeoutRef.current = setTimeout(speakNext, SYLLABLE_PAUSE_MS);
        } else setTimeout(done, 300);
      };
      u.onerror = () => { i++; setTimeout(speakNext, SYLLABLE_PAUSE_MS); };
      speechSynthesis.speak(u);
    };
    speakNext();
  }, [currentWord, onPlay]);

  // 例句：先暂停单词播放，再播例句（先试 Google TTS，失败再用浏览器 TTS）
  const playExample = useCallback((example) => {
    if (!example || typeof example !== 'string') return;
    stopWordPlayback();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingExample(example);
    runAfterUnlock(() => {
      const done = () => setPlayingExample(null);
      const fallback = () => {
        if (!('speechSynthesis' in window)) { done(); return; }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(example.trim());
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          const best = getBestEnglishVoice();
          if (best) u.voice = best;
        }
        u.lang = 'en-US';
        u.rate = 1.0;
        u.pitch = 0.95;
        u.volume = 1.0;
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      };
      playWithGoogleTTS(example.trim(), done, fallback);
    });
  }, []);

  // 查看释义时：第1遍正常（优先真实音频）→ 第2遍自然拼读/整词 → 第3遍正常
  useEffect(() => {
    if (!isRevealed || !currentWord?.word) return;
    playbackCancelledRef.current = false;
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    playTimeoutRef.current = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setIsPlaying(true);
    onPlay?.(currentWord, () => {
      if (playbackCancelledRef.current) return;
      playTimeoutRef.current = setTimeout(() => {
        if (playbackCancelledRef.current) return;
        playWordAudioBySyllables(() => {
          if (playbackCancelledRef.current) return;
          playTimeoutRef.current = setTimeout(() => {
            if (playbackCancelledRef.current) return;
            onPlay?.(currentWord, () => setIsPlaying(false), 1);
          }, 500);
        });
      }, 500);
    });
    return () => {
      playbackCancelledRef.current = true;
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
      stopWordPlayback();
    };
  }, [isRevealed, currentWord?.id, playWordAudioBySyllables, onPlay]);

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
    stopWordPlayback();
    if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }
    playbackCancelledRef.current = true;
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
      setDeck(prev => {
        const insertAt = Math.min(REINSERT_AFTER, prev.length - 1);
        return [...prev.slice(1, insertAt + 1), prev[0], ...prev.slice(insertAt + 1)];
      });
    }
    setIsRevealed(false);
  }, [currentWord, deck.length, saveMasteryData, onClose]);

  const goNext = useCallback(() => {
    stopWordPlayback();
    if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }
    playbackCancelledRef.current = true;
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
    stopWordPlayback();
    if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }
    playbackCancelledRef.current = true;
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
        case 'r':
        case 'R':
          e.preventDefault();
          playWordAudio(1);
          break;
        case 's':
        case 'S':
          e.preventDefault();
          if (!isRevealed) setIsRevealed(true);
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
              <WordImage
                src={currentWord.imageUrl?.[0]}
                alt={currentWord.word}
                keyword={currentWord.word}
                theme={theme}
                className="max-w-full max-h-full object-contain p-6"
                onClick={(e) => { e.stopPropagation(); playWordAudio(1); }}
              />
              <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                R=播放 · S/Enter=显示
              </p>
            </div>
          ) : (
            <div
              className="absolute inset-0 flex flex-col p-6 overflow-hidden cursor-pointer"
              onClick={() => playWordAudio(1)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); playWordAudio(1); } }}
            >
              <div className="flex flex-1 min-h-0">
                {hasImage && (
                  <div className="w-1/3 flex-shrink-0 flex items-center justify-center pr-4">
                    <WordImage
                      src={currentWord.imageUrl?.[0]}
                      alt={currentWord.word}
                      keyword={currentWord.word}
                      theme={theme}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                )}
                <div className={`flex-1 overflow-y-auto ${hasImage ? 'pl-4 border-l border-gray-200 dark:border-gray-700' : ''}`}>
                  {(() => {
                    const segments = getPhonicSegments(currentWord.word);
                    const totalLen = segments.reduce((s, x) => s + x.text.length, 0);
                    const fs = totalLen > 12 ? 'clamp(1.25rem, 3.5vw, 2.5rem)' : totalLen > 10 ? 'clamp(1.5rem, 4vw, 3rem)' : 'clamp(2rem, 5vw, 4rem)';
                    return (
                      <div className={`mb-3 flex flex-nowrap items-baseline gap-1 sm:gap-1.5 min-w-0 overflow-x-auto ${isPlaying ? 'animate-pulse' : ''}`}>
                        {segments.map((seg, i) => {
                          const colors = theme === 'dark' ? PHONIC_COLORS[seg.type].dark : PHONIC_COLORS[seg.type].light;
                          return (
                            <span key={i} className="inline-flex items-baseline flex-shrink-0">
                              <span
                                className="rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 font-bold tracking-tight shadow-sm whitespace-nowrap"
                                style={{
                                  backgroundColor: colors.bg,
                                  color: colors.text,
                                  fontSize: fs,
                                  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                                }}
                              >
                                {seg.text}
                              </span>
                              {i < segments.length - 1 && (
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mx-1 align-middle flex-shrink-0 ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`} aria-hidden />
                              )}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {currentWord.pronunciation && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsPlaying(true); onPlay?.(currentWord, () => setIsPlaying(false), 3); }}
                      className={`flex items-center gap-2 text-xl xl:text-2xl mb-4 ${theme === 'dark' ? 'text-gray-400 hover:text-primary' : 'text-gray-500 hover:text-primary'}`}
                    >
                      <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-bounce text-primary' : ''}`} />
                      <span>{currentWord.pronunciation}</span>
                    </button>
                  )}
                  {currentWord.definitions?.slice(0, 3).map((def, idx) => {
                    const isValidPos = (p) => p && String(p).trim() && p !== '未知' && !/^unknown$/i.test(p);
                    const fallbackPos = currentWord.definitions?.find(d => isValidPos(d.partOfSpeech))?.partOfSpeech || '';
                    const displayPos = isValidPos(def.partOfSpeech) ? def.partOfSpeech : fallbackPos;
                    return (
                      <div key={idx} className="mb-5">
                        <div className="flex gap-3 items-baseline">
                          <span className={`flex-shrink-0 w-10 text-center px-2 py-0.5 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                            {posToAbbr(displayPos)}
                          </span>
                          <span className={`text-lg xl:text-xl ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{def.definition}</span>
                        </div>
                        {def.example && (
                          <button
                            type="button"
                            className={`w-full flex items-start gap-2 cursor-pointer mt-1.5 pl-[3.25rem] text-left rounded transition-colors bg-transparent border-0 p-0 ${playingExample === def.example ? 'text-primary' : theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'}`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); playExample(def.example); }}
                          >
                            <Volume2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${playingExample === def.example ? 'animate-pulse' : ''}`} />
                            <span className="text-xl xl:text-2xl italic">"{highlightWordInSentence(def.example, currentWord.word, theme)}"</span>
                          </button>
                        )}
                        {def.exampleTranslation && (
                          <p className={`text-base xl:text-lg mt-0.5 pl-[3.25rem] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                            {def.exampleTranslation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-center gap-4 pt-4 mt-auto border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); markResult(false); }}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    theme === 'dark' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  生 (1)
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); markResult(true); }}
                  className="px-6 py-2.5 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
                >
                  熟悉 (2)
                </button>
              </div>
              <p className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                空格/R=播放 · 1=生 · 2=熟悉 · 方向键=切换
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
