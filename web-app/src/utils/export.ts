/**
 * 导出 & 导入功能工具函数
 */
import type { Word, ExportFormat } from '../types';
import { fetchWordDefinition } from './dictionaryAPI';

/** 导入结果 */
export interface ImportResult {
  imported: Word[];
  skipped: string[];
  errors: string[];
}

/**
 * 从 TXT 文件内容导入单词
 * 格式：一行一个英文单词
 * @param fileContent - TXT 文件内容
 * @param existingWords - 已有的单词列表（用于去重）
 * @param onProgress - 进度回调 (current, total, succeeded, skipped, failed)
 * @returns 导入结果
 */
export async function importWordsFromTxt(
  fileContent: string,
  existingWords: Word[],
  onProgress: (current: number, total: number, succeeded: number, skipped: number, failed: number) => void
): Promise<ImportResult> {
  // 1. 解析：按换行拆分、去空行、trim
  const rawLines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // 2. 过滤：只保留英文单词（允许含连字符和撇号，如 well-known, don't）
  const englishWordRegex = /^[a-zA-Z][a-zA-Z'-]*$/;
  const validWords = rawLines.filter(line => englishWordRegex.test(line));

  // 3. 转小写 + 按输入形式去重（不转原形）
  const existingSet = new Set(existingWords.map(w => w.wordLower));
  const seenInBatch = new Set<string>();

  const toImport: string[] = [];
  const skipped: string[] = [];

  for (const raw of validWords) {
    const lower = raw.toLowerCase();

    if (existingSet.has(lower)) {
      skipped.push(`${raw}（已存在）`);
      continue;
    }
    if (seenInBatch.has(lower)) {
      skipped.push(`${raw}（重复）`);
      continue;
    }
    seenInBatch.add(lower);
    toImport.push(lower);
  }

  // 4. 上限检查
  const MAX_IMPORT = 100;
  if (toImport.length > MAX_IMPORT) {
    toImport.length = MAX_IMPORT;
    skipped.push(`...超过 ${MAX_IMPORT} 个单词上限，已截断`);
  }

  // 5. 逐个获取释义并构造 Word 对象
  const imported: Word[] = [];
  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < toImport.length; i++) {
    const word = toImport[i];
    onProgress(i + 1, toImport.length, succeeded, skipped.length, failed);

    try {
      const wordData = await fetchWordDefinition(word);
      const newWord: Word = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        ...wordData,
        word: word,
        wordLower: word,
        createdAt: Date.now() - (toImport.length - i), // 微小时间差保持顺序
        source: 'import'
      };
      imported.push(newWord);
      succeeded++;
    } catch (err) {
      // API 失败时仍然添加，但用占位符释义
      const fallbackWord: Word = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        word: word,
        wordLower: word,
        definitions: [{ partOfSpeech: '未知', definition: '释义暂不可用，请稍后在设置中刷新释义' }],
        createdAt: Date.now() - (toImport.length - i),
        source: 'import'
      };
      imported.push(fallbackWord);
      errors.push(word);
      failed++;
    }

    // 限速：每个请求间隔 300ms
    if (i < toImport.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 最终进度
  onProgress(toImport.length, toImport.length, succeeded, skipped.length, failed);

  return { imported, skipped, errors };
}

/**
 * 从 CSV 文件内容导入单词
 * 格式：单词,音标,释义,添加时间（WordLog 导出的 CSV 格式）
 * CSV 已包含释义，无需调用 API，速度极快
 */
export function importWordsFromCsv(
  fileContent: string,
  existingWords: Word[]
): ImportResult {
  const imported: Word[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // 去掉 UTF-8 BOM
  const content = fileContent.replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return { imported, skipped: ['文件为空或只有表头'], errors };
  }

  // 跳过表头
  const existingSet = new Set(existingWords.map(w => w.wordLower));
  const seenInBatch = new Set<string>();

  // 检测 CSV 格式：新格式有 8 列（含例句、翻译等），旧格式 4 列
  const headerFields = parseCsvLine(lines[0]);
  const isNewFormat = headerFields.length >= 8 || lines[0].includes('例句');

  for (let i = 1; i < lines.length; i++) {
    try {
      // 简单 CSV 解析：处理引号包裹的字段
      const fields = parseCsvLine(lines[i]);
      if (fields.length < 3) {
        errors.push(`第${i + 1}行格式错误`);
        continue;
      }

      const cleanField = (s: string) => s.replace(/^"|"$/g, '').trim();

      const rawWord = cleanField(fields[0]);
      const rawPronunciation = cleanField(fields[1] || '');
      const rawDefinition = cleanField(fields[2] || '');
      const rawExamples = fields[3] ? cleanField(fields[3]) : '';
      const rawExampleTranslations = fields[4] ? cleanField(fields[4]) : '';
      const rawImageUrl = fields[5] ? cleanField(fields[5]) : '';
      const rawMastery = fields[6] ? cleanField(fields[6]) : '';
      const rawDate = fields[isNewFormat ? 7 : 3] ? cleanField(fields[isNewFormat ? 7 : 3]) : '';

      const wordText = rawWord.toLowerCase();

      if (!wordText || !/^[a-zA-Z]/.test(wordText)) {
        continue; // 跳过非英文行
      }

      // 按输入形式去重（不转原形）
      if (existingSet.has(wordText)) {
        skipped.push(`${wordText}（已存在）`);
        continue;
      }
      if (seenInBatch.has(wordText)) {
        skipped.push(`${wordText}（重复）`);
        continue;
      }
      seenInBatch.add(wordText);

      // 解析释义字段
      const pronunciation = rawPronunciation;
      const definitionStr = rawDefinition;

      // 新结构格式：pos:::def|||pos:::def
      let definitions: Array<{ partOfSpeech: string; definition: string }> = [];
      if (definitionStr.includes(':::')) {
        definitions = definitionStr.split('|||').map(part => {
          const [posRaw, ...defParts] = part.split(':::');
          const pos = normalizePartOfSpeech(posRaw.trim());
          const def = defParts.join(':::').trim();
          return { partOfSpeech: pos, definition: def };
        }).filter(d => d.definition.length > 0);
      } else {
        // 旧格式兼容：n.释义；v.释义
        definitions = parseDefinitionString(definitionStr);
      }

      // 解析例句和翻译（新格式用 ||| 分隔多个）
      const examples = rawExamples ? rawExamples.split('|||') : [];
      const exampleTranslations = rawExampleTranslations ? rawExampleTranslations.split('|||') : [];

      // 将例句和翻译合并到对应的 definition 中
      if (examples.length > 0) {
        for (let j = 0; j < definitions.length && j < examples.length; j++) {
          if (examples[j]) {
            (definitions[j] as any).example = examples[j];
          }
          if (exampleTranslations[j]) {
            (definitions[j] as any).exampleTranslation = exampleTranslations[j];
          }
        }
      }

      // 解析配图
      const imageUrl = rawImageUrl ? rawImageUrl.split('|||').filter((u: string) => u.length > 0) : undefined;

      // 解析时间
      let createdAt = Date.now() - (lines.length - i);
      if (rawDate) {
        const parsed = new Date(rawDate).getTime();
        if (!isNaN(parsed)) {
          createdAt = parsed;
        }
      }

      const newWord: Word = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2) + i.toString(36),
        word: wordText,
        wordLower: wordText,
        pronunciation: pronunciation || undefined,
        definitions: definitions.length > 0 ? definitions : [{ partOfSpeech: '未知', definition: definitionStr || '释义暂不可用' }],
        imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : undefined,
        masteryLevel: rawMastery || undefined,
        createdAt,
        source: 'import'
      } as Word;

      imported.push(newWord);
    } catch (err) {
      errors.push(`第${i + 1}行解析失败`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // 跳过转义的引号
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * 解析释义字符串，如 "n.释义；v.释义" 或 "verb释义"
 */
function parseDefinitionString(defStr: string): Array<{ partOfSpeech: string; definition: string }> {
  if (!defStr) return [];

  const results: Array<{ partOfSpeech: string; definition: string }> = [];

  // 尝试按分号拆分多个词性释义
  const parts = defStr.split(/[；;]/).map(s => s.trim()).filter(s => s.length > 0);

  for (const part of parts) {
    // 匹配 "n.释义" 或 "noun释义" 或 "verb释义" 格式
    const match = part.match(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|int\.|aux\.|num\.|art\.|noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection)\s*(.*)/i);
    if (match) {
      const pos = normalizePartOfSpeech(match[1]);
      const def = match[2].trim();
      if (def) {
        results.push({ partOfSpeech: pos, definition: def });
      }
    } else {
      // 无法解析词性，整体作为释义
      results.push({ partOfSpeech: '未知', definition: part });
    }
  }

  return results;
}

/**
 * 规范化词性名称
 */
function normalizePartOfSpeech(pos: string): string {
  const map: Record<string, string> = {
    'n.': '名词', 'noun': '名词',
    'v.': '动词', 'verb': '动词',
    'adj.': '形容词', 'adjective': '形容词',
    'adv.': '副词', 'adverb': '副词',
    'prep.': '介词', 'preposition': '介词',
    'conj.': '连词', 'conjunction': '连词',
    'pron.': '代词', 'pronoun': '代词',
    'int.': '感叹词', 'interjection': '感叹词',
    'aux.': '助动词',
    'num.': '数词',
    'art.': '冠词',
  };
  return map[pos.toLowerCase()] || pos;
}

/**
 * 导出单词为指定格式
 * @param words - 单词数组
 * @param format - 导出格式 (txt, csv, md)
 * @returns 导出内容
 */
export async function exportWords(words: Word[], format: ExportFormat): Promise<string> {
  switch (format) {
    case 'txt':
      return generateTxtContent(words);
    case 'csv':
      return generateCsvContent(words);
    case 'md':
      return generateMarkdownContent(words);
    default:
      throw new Error(`不支持的导出格式: ${format}`);
  }
}

/**
 * 生成 TXT 格式内容
 * 仅保留英文单词，一个单词一行
 */
function generateTxtContent(words: Word[]): string {
  // 一个单词一行
  return words.map(w => w.word).join('\n');
}

/**
 * 生成 CSV 格式内容
 * 包含完整数据：单词、音标、释义、例句、例句翻译、配图、掌握度、添加时间
 * 每个释义单独一行，通过 JSON 格式保留结构化数据
 */
function generateCsvContent(words: Word[]): string {
  // 添加 UTF-8 BOM 以确保 Excel 正确显示中文
  let csv = '\uFEFF';
  csv += '单词,音标,释义,例句,例句翻译,配图,掌握度,添加时间\n';

  const escapeCsv = (text: string | undefined): string => {
    if (!text) return '';
    return '"' + String(text).replace(/"/g, '""') + '"';
  };

  // 词性中文转英文缩写
  const posToAbbr = (pos: string): string => {
    const map: Record<string, string> = {
      '名词': 'n.',
      '动词': 'v.',
      '形容词': 'adj.',
      '副词': 'adv.',
      '代词': 'pron.',
      '介词': 'prep.',
      '连词': 'conj.',
      '感叹词': 'int.',
      '助动词': 'aux.',
      '数词': 'num.',
      '冠词': 'art.',
      '未知': 'n.'
    };
    return map[pos] || pos;
  };

  for (const word of words) {
    // 每个释义独立保存：pos1:::def1|||pos2:::def2
    const definitions = word.definitions
      .map(def => `${posToAbbr(def.partOfSpeech || '未知')}:::${def.definition || ''}`)
      .join('|||');

    // 合并例句：用 ||| 分隔多个例句
    const examples = word.definitions
      .map(def => def.example || '')
      .filter(e => e.length > 0)
      .join('|||');

    // 合并例句翻译：用 ||| 分隔
    const exampleTranslations = word.definitions
      .map(def => (def as any).exampleTranslation || '')
      .filter(e => e.length > 0)
      .join('|||');

    // 配图 URL
    const imageUrl = Array.isArray(word.imageUrl) ? word.imageUrl.join('|||') : (word.imageUrl || '');

    // 掌握度
    const mastery = (word as any).masteryLevel || '';

    csv += `${escapeCsv(word.word)},`;
    csv += `${escapeCsv(word.pronunciation)},`;
    csv += `${escapeCsv(definitions)},`;
    csv += `${escapeCsv(examples)},`;
    csv += `${escapeCsv(exampleTranslations)},`;
    csv += `${escapeCsv(imageUrl)},`;
    csv += `${escapeCsv(mastery)},`;
    csv += `"${new Date(word.createdAt).toLocaleString('zh-CN')}"\n`;
  }

  return csv;
}

/**
 * 生成 Obsidian Markdown 格式内容
 */
function generateMarkdownContent(words: Word[]): string {
  let content = '# WordLog 单词本\n\n';
  content += `> 最后更新: ${new Date().toLocaleString('zh-CN')}\n`;
  content += `> 总单词数: ${words.length}\n\n`;
  content += '---\n\n';

  // 按日期分组
  const groupedByDate: Record<string, Word[]> = {};
  for (const word of words) {
    const date = new Date(word.createdAt).toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(word);
  }

  // 按日期降序输出
  for (const [date, dateWords] of Object.entries(groupedByDate).sort().reverse()) {
    content += `## ${date}\n\n`;

    for (const word of dateWords) {
      content += `### ${word.word}\n`;

      if (word.pronunciation) {
        content += `- **发音**: ${word.pronunciation}\n`;
      }

      for (const def of word.definitions) {
        content += `- **词性**: ${def.partOfSpeech}\n`;
        content += `- **释义**: ${def.definition}\n`;
        if (def.example) {
          content += `- **例句**: ${def.example}\n`;
        }
      }

      content += `- **添加时间**: ${new Date(word.createdAt).toLocaleString('zh-CN')}\n\n`;
    }
  }

  return content;
}

/**
 * 下载文件
 * @param content - 文件内容
 * @param filename - 文件名
 * @param mimeType - MIME 类型
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 根据格式生成文件名
 * @param format - 导出格式
 * @returns 文件名
 */
export function generateFilename(format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'md' ? 'md' : format.toUpperCase();
  return `WordLog_${date}.${extension}`;
}

/**
 * 根据格式获取 MIME 类型
 * @param format - 导出格式
 * @returns MIME 类型
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    txt: 'text/plain',
    csv: 'text/csv',
    md: 'text/markdown'
  };
  return mimeTypes[format];
}
