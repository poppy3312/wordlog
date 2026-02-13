import { describe, it, expect } from 'vitest';
import { exportWords } from './export';

describe('exportWords - 导出功能', () => {
  const mockWords = [
    {
      id: '1',
      word: 'hello',
      wordLower: 'hello',
      pronunciation: '/həˈloʊ/',
      definitions: [
        {
          partOfSpeech: '名词',
          definition: '问候，你好',
          example: 'Hello! How are you?'
        },
        {
          partOfSpeech: '感叹词',
          definition: '喂（用于引起注意或回答电话）',
          example: 'Hello? Is anyone there?'
        }
      ],
      createdAt: '2026-02-06T10:00:00.000Z'
    },
    {
      id: '2',
      word: 'world',
      wordLower: 'world',
      pronunciation: '/wɜːrld/',
      definitions: [
        {
          partOfSpeech: '名词',
          definition: '世界，地球',
          example: 'The world is beautiful.'
        }
      ],
      createdAt: '2026-02-06T12:00:00.000Z'
    }
  ];

  describe('TXT 格式导出', () => {
    it('应该生成纯文本格式', async () => {
      const result = await exportWords(mockWords, 'txt');

      expect(result).toBe('hello\nworld');
    });

    it('应该每个单词占一行', async () => {
      const result = await exportWords(mockWords, 'txt');
      const lines = result.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('hello');
      expect(lines[1]).toBe('world');
    });

    it('空单词列表应该返回空字符串', async () => {
      const result = await exportWords([], 'txt');

      expect(result).toBe('');
    });
  });

  describe('CSV 格式导出', () => {
    it('应该生成 CSV 格式', async () => {
      const result = await exportWords(mockWords, 'csv');

      expect(result).toContain('单词,音标,释义,添加时间');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('应该包含 UTF-8 BOM', async () => {
      const result = await exportWords(mockWords, 'csv');

      expect(result.charCodeAt(0)).toBe(0xFEFF); // BOM 字符
    });

    it('应该包含表头', async () => {
      const result = await exportWords(mockWords, 'csv');

      // 由于有 BOM 字符，第一行是空行，第二行是表头
      expect(result).toContain('单词,音标,释义,添加时间');
    });

    it('应该转义双引号', async () => {
      const wordsWithQuote = [
        {
          id: '1',
          word: 'test',
          wordLower: 'test',
          definitions: [{ partOfSpeech: '名词', definition: '包含"引号"的内容' }],
          createdAt: Date.now()
        }
      ];

      const result = await exportWords(wordsWithQuote, 'csv');

      expect(result).toContain('包含""引号""的内容');
    });

    it('应该正确合并多个词性', async () => {
      const result = await exportWords(mockWords, 'csv');

      // hello 有两个词性：名词和感叹词
      expect(result).toContain('n.问候，你好；int.喂（用于引起注意或回答电话）');
    });
  });

  describe('Markdown 格式导出', () => {
    it('应该生成 Markdown 格式', async () => {
      const result = await exportWords(mockWords, 'md');

      expect(result).toContain('# WordLog 单词本');
      expect(result).toContain('## 2026-02-06');
      expect(result).toContain('### hello');
      expect(result).toContain('### world');
    });

    it('应该包含最后更新时间和总单词数', async () => {
      const result = await exportWords(mockWords, 'md');

      expect(result).toContain('最后更新:');
      expect(result).toContain('总单词数: 2');
    });

    it('应该包含单词发音', async () => {
      const result = await exportWords(mockWords, 'md');

      expect(result).toContain('- **发音**: /həˈloʊ/');
      expect(result).toContain('- **发音**: /wɜːrld/');
    });

    it('应该包含词性和释义', async () => {
      const result = await exportWords(mockWords, 'md');

      expect(result).toContain('- **词性**: 名词');
      expect(result).toContain('- **释义**: 问候，你好');
    });

    it('应该包含例句', async () => {
      const result = await exportWords(mockWords, 'md');

      expect(result).toContain('- **例句**: Hello! How are you?');
    });

    it('应该按日期分组单词', async () => {
      const result = await exportWords(mockWords, 'md');

      // 两个单词都在同一天，应该只有一个日期标题
      const dateHeaders = result.match(/## \d{4}-\d{2}-\d{2}/g);
      expect(dateHeaders).toHaveLength(1);
    });

    it('应该按日期降序排列', async () => {
      const wordsWithDifferentDates = [
        {
          id: '1',
          word: 'first',
          wordLower: 'first',
          definitions: [],
          createdAt: '2026-02-05T10:00:00.000Z'
        },
        {
          id: '2',
          word: 'second',
          wordLower: 'second',
          definitions: [],
          createdAt: '2026-02-06T10:00:00.000Z'
        }
      ];

      const result = await exportWords(wordsWithDifferentDates, 'md');
      const lines = result.split('\n');

      // 找到日期标题的行号
      const firstDateIndex = lines.findIndex(line => line.includes('## 2026-02-06'));
      const secondDateIndex = lines.findIndex(line => line.includes('## 2026-02-05'));

      expect(firstDateIndex).toBeLessThan(secondDateIndex);
    });
  });

  describe('错误处理', () => {
    it('不支持的格式应该抛出错误', async () => {
      await expect(exportWords(mockWords, 'pdf')).rejects.toThrow('不支持的导出格式: pdf');
    });

    it('不支持的格式应该抛出错误', async () => {
      await expect(exportWords(mockWords, 'docx')).rejects.toThrow('不支持的导出格式: docx');
    });
  });
});
