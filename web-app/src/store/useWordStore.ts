import { create } from 'zustand';
import type { Word, Stats, Theme, WordStore, Definition } from '../types';

export const useWordStore = create<WordStore>((set, get) => ({
  // 状态
  words: [],
  stats: {
    totalWords: 0,
    uniqueWords: 0,
    todayAdded: 0
  },
  theme: 'light' as Theme,

  // Actions

  // 加载单词列表
  loadWords: (words: Word[], stats?: Stats | null) => {
    // 如果没有传入stats，基于words计算
    const calculatedStats: Stats = stats || calculateStats(words || []);

    set({
      words: words || [],
      stats: calculatedStats
    });
  },

  // 设置单词列表
  setWords: (words: Word[]) => {
    set({ words });

    // 更新统计
    const stats = calculateStats(words);
    set({ stats });
  },

  // 添加单词
  addWord: (word: Word): 'added' | 'updated' => {
    const { words } = get();
    const existingIndex = words.findIndex(w => w.wordLower === word.wordLower);

    let updatedWords: Word[];

    if (existingIndex !== -1) {
      // 单词已存在，更新释义
      updatedWords = [...words];
      updatedWords[existingIndex] = {
        ...updatedWords[existingIndex],
        definitions: mergeDefinitions(updatedWords[existingIndex].definitions, word.definitions),
        updatedAt: Date.now()
      };
    } else {
      // 新单词
      updatedWords = [...words, word];
    }

    set({ words: updatedWords });

    // 更新统计
    const stats = calculateStats(updatedWords);
    set({ stats });

    return existingIndex !== -1 ? 'updated' : 'added';
  },

  // 更新单词
  updateWord: (wordId: string, updates: Partial<Word>) => {
    const { words } = get();
    const index = words.findIndex(w => w.id === wordId);

    if (index !== -1) {
      const updatedWords = [...words];
      updatedWords[index] = {
        ...updatedWords[index],
        ...updates,
        updatedAt: Date.now()
      };
      set({ words: updatedWords });
    }
  },

  // 删除单词
  deleteWord: (wordId: string) => {
    const { words } = get();
    const updatedWords = words.filter(w => w.id !== wordId);
    set({ words: updatedWords });

    // 更新统计
    const stats = calculateStats(updatedWords);
    set({ stats });
  },

  // 清空所有单词
  clearAll: () => {
    set({
      words: [],
      stats: {
        totalWords: 0,
        uniqueWords: 0,
        todayAdded: 0
      }
    });
  },

  // 设置主题
  setTheme: (theme: Theme) => {
    set({ theme });
  }
}));

// 计算统计数据
function calculateStats(words: Word[]): Stats {
  const today = new Date().toDateString();
  const todayAdded = words.filter(w =>
    new Date(w.createdAt).toDateString() === today
  ).length;

  return {
    totalWords: words.length,
    uniqueWords: new Set(words.map(w => w.wordLower)).size,
    todayAdded
  };
}

// 合并释义（去重）
function mergeDefinitions(existingDefs: Definition[], newDefs: Definition[]): Definition[] {
  const merged: Definition[] = [...existingDefs];

  for (const newDef of newDefs) {
    const exists = merged.find(d =>
      d.partOfSpeech === newDef.partOfSpeech &&
      d.definition === newDef.definition
    );

    if (!exists) {
      merged.push(newDef);
    }
  }

  return merged;
}
