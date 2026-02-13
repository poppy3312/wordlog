import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWordStore } from './useWordStore';

// 模拟 Chrome Storage API
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
};

global.chrome = { storage: mockChromeStorage };

describe('useWordStore', () => {
  beforeEach(() => {
    // 每个测试前重置 store
    useWordStore.setState({
      words: [],
      stats: {
        totalWords: 0,
        uniqueWords: 0,
        todayAdded: 0
      },
      theme: 'light'
    });
  });

  describe('初始状态', () => {
    it('应该有空的单词列表', () => {
      const { words } = useWordStore.getState();
      expect(words).toEqual([]);
    });

    it('应该有初始统计数据', () => {
      const { stats } = useWordStore.getState();
      expect(stats).toEqual({
        totalWords: 0,
        uniqueWords: 0,
        todayAdded: 0
      });
    });

    it('应该有默认主题', () => {
      const { theme } = useWordStore.getState();
      expect(theme).toBe('light');
    });
  });

  describe('addWord', () => {
    it('应该添加新单词', () => {
      const { addWord, words } = useWordStore.getState();

      const newWord = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [{ partOfSpeech: 'noun', definition: '问候' }],
        createdAt: Date.now()
      };

      addWord(newWord);

      const { words: updatedWords } = useWordStore.getState();
      expect(updatedWords).toHaveLength(1);
      expect(updatedWords[0].word).toBe('hello');
    });

    it('应该更新已存在的单词', () => {
      const { addWord } = useWordStore.getState();

      const word1 = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [{ partOfSpeech: 'noun', definition: '问候' }],
        createdAt: Date.now()
      };

      const word2 = {
        id: 'test-2',
        word: 'hello',
        wordLower: 'hello',
        definitions: [{ partOfSpeech: 'interjection', definition: '喂' }],
        createdAt: Date.now()
      };

      addWord(word1);
      const result = addWord(word2);

      const { words } = useWordStore.getState();
      expect(result).toBe('updated');
      expect(words).toHaveLength(1);
      expect(words[0].definitions).toHaveLength(2);
    });

    it('应该返回 added 状态表示新单词', () => {
      const { addWord } = useWordStore.getState();

      const newWord = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [],
        createdAt: Date.now()
      };

      const result = addWord(newWord);
      expect(result).toBe('added');
    });

    it('应该更新统计数据', () => {
      const { addWord } = useWordStore.getState();

      const newWord = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [],
        createdAt: Date.now()
      };

      addWord(newWord);

      const { stats } = useWordStore.getState();
      expect(stats.totalWords).toBe(1);
      expect(stats.uniqueWords).toBe(1);
    });
  });

  describe('deleteWord', () => {
    it('应该删除指定单词', () => {
      const { addWord, deleteWord } = useWordStore.getState();

      const word1 = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [],
        createdAt: Date.now()
      };

      const word2 = {
        id: 'test-2',
        word: 'world',
        wordLower: 'world',
        definitions: [],
        createdAt: Date.now()
      };

      addWord(word1);
      addWord(word2);
      deleteWord('test-1');

      const { words } = useWordStore.getState();
      expect(words).toHaveLength(1);
      expect(words[0].word).toBe('world');
    });
  });

  describe('clearAll', () => {
    it('应该清空所有单词', () => {
      const { addWord, clearAll } = useWordStore.getState();

      const word = {
        id: 'test-1',
        word: 'hello',
        wordLower: 'hello',
        definitions: [],
        createdAt: Date.now()
      };

      addWord(word);
      clearAll();

      const { words, stats } = useWordStore.getState();
      expect(words).toEqual([]);
      expect(stats.totalWords).toBe(0);
    });
  });

  describe('setWords', () => {
    it('应该设置单词列表并更新统计', () => {
      const { setWords } = useWordStore.getState();

      const words = [
        {
          id: 'test-1',
          word: 'hello',
          wordLower: 'hello',
          definitions: [],
          createdAt: Date.now()
        },
        {
          id: 'test-2',
          word: 'world',
          wordLower: 'world',
          definitions: [],
          createdAt: Date.now()
        }
      ];

      setWords(words);

      const { words: updatedWords, stats } = useWordStore.getState();
      expect(updatedWords).toHaveLength(2);
      expect(stats.totalWords).toBe(2);
      expect(stats.uniqueWords).toBe(2);
    });

    it('应该正确计算唯一单词数（去重）', () => {
      const { setWords } = useWordStore.getState();

      const words = [
        {
          id: 'test-1',
          word: 'Hello',
          wordLower: 'hello',
          definitions: [],
          createdAt: Date.now()
        },
        {
          id: 'test-2',
          word: 'hello',
          wordLower: 'hello',
          definitions: [],
          createdAt: Date.now()
        }
      ];

      setWords(words);

      const { stats } = useWordStore.getState();
      expect(stats.totalWords).toBe(2);
      expect(stats.uniqueWords).toBe(1);
    });
  });

  describe('setTheme', () => {
    it('应该设置主题', () => {
      const { setTheme } = useWordStore.getState();

      setTheme('dark');

      const { theme } = useWordStore.getState();
      expect(theme).toBe('dark');
    });
  });
});
