/* @ts-nocheck */
/**
 * Obsidian 同步工具 - 简化版
 * 直接写入 Obsidian vault，无需任何插件
 */

// 默认配置
const DEFAULT_CONFIG = {
  vaultPath: '~/Documents/obsidian/sometime',
  subfolder: 'WordLog',
  format: 'flashcard',
  autoSync: false
};

// 闪卡格式模板
const FLASHCARD_TEMPLATE = (word) => {
  const definitions = word.definitions || [];
  const primaryDef = definitions[0] || {};

  return `---
tags: [wordlog/英语, 单词本/${primaryDef.partOfSpeech || '未分类'}]
cssclass: flashcard
created: ${new Date(word.createdAt).toISOString()}
source: ${word.source || 'webapp'}
---

# ${word.word}

## 音标
${word.pronunciation || '暂无'}

## 词性
${primaryDef.partOfSpeech || '未知'}

## 释义
${primaryDef.definition || '暂无释义'}

${definitions.length > 1 ? definitions.slice(1).map(def =>
  `### ${def.partOfSpeech || '其他'}\n${def.definition}`
).join('\n\n') : ''}

## 例句
> ${primaryDef.example || '暂无例句'}
>
> ${primaryDef.exampleTranslation || ''}

---
<!--SR:!2026-02-05,1,270-->
`;

/**
 * 获取配置
 */
function getConfig() {
  const savedConfig = localStorage.getItem('wordlog_obsidian_config');
  return savedConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) } : DEFAULT_CONFIG;
}

/**
 * 保存配置
 */
function saveConfig(config) {
  localStorage.setItem('wordlog_obsidian_config', JSON.stringify(config));
}

/**
 * 展开波浪号路径
 */
function expandTildePath(path) {
  if (path.startsWith('~/')) {
    // 在浏览器中无法直接展开，需要用户配置完整路径
    // 这里返回原路径，实际使用时需要用户配置完整路径
    return path.replace('~', '/Users/suyingli/Documents/obsidian/sometime');
  }
  return path;
}

/**
 * 生成单词笔记内容
 */
function generateNoteContent(word, format = 'flashcard') {
  return FLASHCARD_TEMPLATE(word);
}

/**
 * 获取笔记文件路径（完整路径）
 */
function getNoteFilePath(word, config) {
  const vaultPath = expandTildePath(config.vaultPath);
  const subfolder = config.subfolder || '';
  const fileName = `${word.word}.md`;

  return subfolder
    ? `${vaultPath}/${subfolder}/${fileName}`
    : `${vaultPath}/${fileName}`;
}

/**
 * 同步单个单词到 Obsidian
 * 说明：浏览器环境无法直接写入文件系统
 * 解决方案：使用 Obsidian Local REST API 插件 或 导出功能
 */
async function syncWordToObsidian(word, config = null) {
  const activeConfig = config || getConfig();

  if (!activeConfig.autoSync) {
    return { success: false, message: 'Obsidian 同步未启用' };
  }

  const content = generateNoteContent(word, activeConfig.format);
  const notePath = getNoteFilePath(word, activeConfig);

  // 浏览器环境：尝试使用 Obsidian Local REST API
  if (typeof window !== 'undefined') {
    try {
      const apiEndpoint = activeConfig.apiEndpoint || 'http://localhost:27124';
      const relativePath = (activeConfig.subfolder ? activeConfig.subfolder + '/' : '') + word.word + '.md';

      const response = await fetch(`${apiEndpoint}/vault/${encodeURIComponent(relativePath)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/markdown'
        },
        body: content
      });

      if (response.ok) {
        return { success: true, message: `已同步 ${word.word} 到 Obsidian` };
      } else {
        return { success: false, message: `API 错误: ${response.status}` };
      }
    } catch (error) {
      // API 不可用，返回下载方案
      return {
        success: false,
        message: 'Obsidian API 未连接',
        fallback: 'download',
        content: content,
        suggestedPath: notePath
      };
    }
  }

  return { success: false, message: '不支持的运行环境' };
}

/**
 * 下载单个文件（浏览器环境）
 */
function downloadWordNote(word, config = null) {
  const activeConfig = config || getConfig();
  const content = generateNoteContent(word, activeConfig.format);
  const fileName = `${word.word}.md`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, message: `已下载 ${fileName}` };
}

/**
 * 批量导出所有单词为 ZIP
 */
async function exportAllWords(words, config = null) {
  const activeConfig = config || getConfig();

  // 使用 JSZip 创建 ZIP 文件
  if (typeof JSZip !== 'undefined') {
    const zip = new JSZip();
    const subfolder = activeConfig.subfolder || '';

    for (const word of words) {
      const content = generateNoteContent(word, activeConfig.format);
      const path = subfolder ? `${subfolder}/${word.word}.md` : `${word.word}.md`;
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WordLog_Obsidian_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, message: `已导出 ${words.length} 个单词` };
  }

  return { success: false, message: 'JSZip 库未加载' };
}

/**
 * 检查 Obsidian API 状态
 */
async function checkObsidianAPI(apiEndpoint = 'http://localhost:27124') {
  try {
    const response = await fetch(`${apiEndpoint}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
}

export {
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
  generateNoteContent,
  syncWordToObsidian,
  downloadWordNote,
  exportAllWords,
  checkObsidianAPI,
  getNoteFilePath
};

