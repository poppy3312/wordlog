/**
 * WordLog 全局类型定义
 */

// 单词释义接口
export interface Definition {
  partOfSpeech: string;
  definition: string;
  example?: string;
  exampleTranslation?: string;
  phonetic?: string;
}

// 单词对象接口
export interface Word {
  id: string;
  word: string;
  wordLower: string;
  pronunciation?: string;
  definitions: Definition[];
  imageUrl?: string | string[];
  audioUrl?: string;
  createdAt: number;
  updatedAt?: number;
  source?: string;
  keyword?: string;
  masteryLevel?: 'unlearned' | 'unknown' | 'known'; // 掌握程度：未学、不认识、认识
}

// 统计数据接口
export interface Stats {
  totalWords: number;
  uniqueWords: number;
  todayAdded: number;
}

// 主题类型
export type Theme = 'light' | 'dark';

// 导出格式类型
export type ExportFormat = 'txt' | 'csv' | 'md';

// Store 状态接口
export interface WordStore {
  // 状态
  words: Word[];
  stats: Stats;
  theme: Theme;

  // Actions
  loadWords: (words: Word[], stats?: Stats) => void;
  setWords: (words: Word[]) => void;
  addWord: (word: Word) => 'added' | 'updated';
  updateWord: (wordId: string, updates: Partial<Word>) => void;
  deleteWord: (wordId: string) => void;
  clearAll: () => void;
  setTheme: (theme: Theme) => void;
}

// Chrome Storage API 类型
export interface ChromeStorage {
  local: {
    get: (keys: string | string[] | null | object, callback?: (result: object) => void) => Promise<object>;
    set: (items: object, callback?: () => void) => Promise<void>;
  };
}

// 全局 window 扩展
declare global {
  interface Window {
    chrome?: {
      storage: ChromeStorage;
    };
  }
}

export {};
