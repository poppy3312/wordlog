// WordLog Chrome Extension - Popup Script
// 优化版：显示最近单词 + 快速添加功能 + 支持配图导入

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
  loadWordList();
  setupEventListeners();
});

// ========== 数据加载 ==========

async function loadWordList() {
  try {
    const result = await chrome.storage.local.get(['words']);

    const words = result.words || [];

    // 按创建时间倒序排列（最新的在前）
    const sortedWords = words.sort((a, b) => b.createdAt - a.createdAt);

    // 更新统计
    updateWordCount(words.length);

    // 显示最近5个单词
    displayWordList(sortedWords.slice(0, 5));

  } catch (error) {
    console.error('加载单词列表失败:', error);
    showError('加载失败，请刷新重试');
  }
}

function updateWordCount(count) {
  document.getElementById('wordCount').textContent = `${count} 个单词`;
}

function displayWordList(words) {
  const content = document.getElementById('content');

  if (words.length === 0) {
    content.innerHTML = `
      <div class="popup-empty">
        <div class="popup-empty-icon">📝</div>
        <p>还没有收藏任何单词</p>
        <p style="font-size: 12px; margin-top: 8px;">在下方输入框添加单词，或选中网页上的单词右键添加</p>
      </div>
    `;
    return;
  }

  let html = '';
  for (const word of words) {
    html += generateWordItemHTML(word);
  }

  content.innerHTML = html;
}

function generateWordItemHTML(word) {
  const date = formatDate(word.createdAt);

  const definition = word.definitions && word.definitions[0]
    ? truncateText(word.definitions[0].definition, 80)
    : '暂无释义';

  const pos = word.definitions && word.definitions[0]
    ? word.definitions[0].partOfSpeech
    : '';

  // 转换词性为英文缩写
  const posAbbr = posToAbbr(pos);

  // 获取图片URL（支持用户导入的配图）
  const imageUrl = word.imageUrl && word.imageUrl[0] ? word.imageUrl[0] : null;
  const imageHTML = imageUrl ? `<img src="${imageUrl}" alt="${word.word}" class="word-list-svg">` : '';

  return `
    <div class="word-list-item" data-word="${word.word}">
      <div class="word-list-content">
        <div class="word-list-header">
          <span class="word-list-word">${word.word}</span>
          ${imageHTML}
          <span class="word-list-date">${date}</span>
        </div>
        <div class="word-list-definition">
          ${posAbbr ? `<span class="word-list-pos">${posAbbr}</span>` : ''}
          <span>${definition}</span>
        </div>
      </div>
    </div>
  `;
}

// 为旧单词保存生成的SVG数据
async function saveSVGToWord(word, svgUrl, svgData) {
  try {
    const result = await chrome.storage.local.get(['words']);
    const words = result.words || [];
    const index = words.findIndex(w => w.word === word || w.wordLower === word.toLowerCase());

    if (index !== -1) {
      words[index].imageUrl = [svgUrl];
      words[index].svgData = svgData;
      await chrome.storage.local.set({ words });
    }
  } catch (error) {
    console.error('保存SVG失败:', error);
  }
}

// 词性转英文缩写
function posToAbbr(pos) {
  const mapping = {
    '名词': 'n.',
    '动词': 'v.',
    '形容词': 'adj.',
    '副词': 'adv.',
    '其他': 'other',
    '未知': 'unknown'
  };
  return mapping[pos] || (pos ? pos.charAt(0) + '.' : '');
}

// 格式化日期
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

// 截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function showError(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="popup-empty">
      <div class="popup-empty-icon">⚠️</div>
      <p>${message}</p>
    </div>
  `;
}

// ========== 事件监听 ==========

function setupEventListeners() {
  // 添加单词按钮
  document.getElementById('addBtn').addEventListener('click', handleAddWord);

  // 输入框回车添加
  document.getElementById('wordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddWord();
    }
  });

  // 打开完整版
  document.getElementById('openWebApp').addEventListener('click', () => {
    // 打开本地的web app (端口3001)
    chrome.tabs.create({ url: 'http://localhost:3001/' });
  });

  // 单词卡片点击 - 复制单词
  document.getElementById('content').addEventListener('click', (event) => {
    const wordItem = event.target.closest('.word-list-item');
    if (wordItem) {
      const word = wordItem.dataset.word;
      // 左键复制
      if (event.button === 0) {
        copyToClipboard(word);
      }
    }
  });

  // 单词卡片右键 - 删除单词
  document.getElementById('content').addEventListener('contextmenu', (event) => {
    const wordItem = event.target.closest('.word-list-item');
    if (wordItem) {
      event.preventDefault();
      const word = wordItem.dataset.word;
      if (confirm(`删除单词 "${word}"？`)) {
        deleteWord(word);
      }
    }
  });
}

// ========== 添加单词功能 ==========

async function handleAddWord() {
  const input = document.getElementById('wordInput');
  const addBtn = document.getElementById('addBtn');

  const wordText = input.value.trim();

  if (!wordText) {
    showToast('请输入要添加的单词', 'error');
    return;
  }

  if (!isValidEnglishWord(wordText)) {
    showToast('请输入有效的英文单词', 'error');
    return;
  }

  // 禁用按钮和输入框
  addBtn.disabled = true;
  input.disabled = true;

  try {
    const lowercaseWord = wordText.toLowerCase().trim();

    // 输入什么形式就存什么形式，不转原形；先按输入查释义，无结果再试原形
    let definitions = await fetchDefinitions(lowercaseWord);
    const noDefinition = !definitions?.length || (definitions[0] && (definitions[0].definition === '暂无释义' || (definitions[0].definition && definitions[0].definition.includes('暂无'))));
    if (noDefinition && typeof analyzeWordForm !== 'undefined') {
      const { original } = analyzeWordForm(lowercaseWord);
      if (original && original !== lowercaseWord) {
        const lemmaDefs = await fetchDefinitions(original);
        if (lemmaDefs?.length && lemmaDefs[0].definition && !lemmaDefs[0].definition.includes('暂无')) {
          definitions = lemmaDefs;
        }
      }
    }

    const word = createWordObject(lowercaseWord, definitions);
    await saveWord(word);
    showToast(`已添加 "${lowercaseWord}"`, 'success');

    // 清空输入框
    input.value = '';

    // 重新加载列表
    await loadWordList();

  } catch (error) {
    console.error('添加单词失败:', error);
    showToast(`添加失败: ${error.message}`, 'error');
  } finally {
    // 恢复按钮和输入框
    addBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

// 验证是否为有效英文单词
function isValidEnglishWord(text) {
  return /^[a-zA-Z\s-']+$/.test(text) && text.length > 0;
}

// 创建单词对象
function createWordObject(word, definitions) {
  const now = Date.now();

  return {
    id: `word_${now}_${Math.random().toString(36).substr(2, 9)}`,
    word: word,
    wordLower: word.toLowerCase(),
    definitions: definitions,
    pronunciation: extractPronunciation(definitions),
    imageUrl: '', // 不再自动生成配图，由用户手动导入
    createdAt: now
  };
}

// 提取音标
function extractPronunciation(definitions) {
  if (definitions && definitions[0] && definitions[0].phonetic) {
    return definitions[0].phonetic;
  }
  if (definitions && definitions[0] && definitions[0].phonetics) {
    const phonetic = definitions[0].phonetics.find(p => p.text);
    if (phonetic) return phonetic.text;
  }
  return null;
}

// 从API查询释义
async function fetchDefinitions(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

    if (!response.ok) {
      if (response.status === 404) {
        // 单词不存在，返回占位释义
        return [{
          partOfSpeech: '未知',
          definition: '暂无释义',
          example: null,
          exampleTranslation: null,
          phonetic: null
        }];
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return [{
        partOfSpeech: '未知',
        definition: '暂无释义',
        example: null,
        exampleTranslation: null,
        phonetic: null
      }];
    }

    const entry = data[0];
    const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text);

    // 提取释义
    const definitions = [];

    for (const meaning of entry.meanings || []) {
      const partOfSpeech = translatePartOfSpeech(meaning.partOfSpeech);

      for (const def of meaning.definitions.slice(0, 3)) {
        definitions.push({
          partOfSpeech: partOfSpeech,
          definition: def.definition || '暂无释义',
          example: def.example || null,
          exampleTranslation: null, // 暂不翻译例句
          phonetic: phonetic || null
        });

        if (definitions.length >= 6) break; // 最多6个释义
      }

      if (definitions.length >= 6) break;
    }

    if (definitions.length === 0) {
      return [{
        partOfSpeech: '未知',
        definition: '暂无释义',
        example: null,
        exampleTranslation: null,
        phonetic: phonetic || null
      }];
    }

    return definitions;

  } catch (error) {
    console.error('查询释义失败:', error);
    throw new Error('查询释义失败，请稍后重试');
  }
}

// 翻译词性
function translatePartOfSpeech(pos) {
  const mapping = {
    'noun': '名词',
    'verb': '动词',
    'adjective': '形容词',
    'adverb': '副词',
    'pronoun': '代词',
    'preposition': '介词',
    'conjunction': '连词',
    'interjection': '感叹词',
    'exclamation': '感叹词'
  };
  return mapping[pos.toLowerCase()] || '其他';
}

// 保存单词到storage
async function saveWord(word) {
  const result = await chrome.storage.local.get(['words', 'wordSet']);

  let words = result.words || [];
  let wordSet = new Set(result.wordSet || []);

  // 检查是否已存在
  if (wordSet.has(word.wordLower)) {
    throw new Error('单词已存在');
  }

  // 验证释义数据有效（不是占位数据）
  const hasValidDefinition = word.definitions && word.definitions.length > 0 &&
    word.definitions[0].definition && word.definitions[0].definition !== '暂无释义';

  if (!hasValidDefinition) {
    throw new Error('未找到该单词的释义，请检查拼写');
  }

  // 添加到列表
  words.unshift(word); // 添加到开头
  wordSet.add(word.wordLower);

  // 限制最多存储1000个单词
  if (words.length > 1000) {
    const removedWord = words.pop();
    wordSet.delete(removedWord.wordLower);
  }

  await chrome.storage.local.set({
    words: words,
    wordSet: Array.from(wordSet)
  });
}

// ========== 工具函数 ==========

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`已复制: ${text}`, 'success');
  } catch (error) {
    console.error('复制失败:', error);
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(`已复制: ${text}`, 'success');
    } catch (e) {
      showToast('复制失败', 'error');
    }
    document.body.removeChild(textarea);
  }
}

// Toast 提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// 删除单词
async function deleteWord(word) {
  try {
    const result = await chrome.storage.local.get(['words', 'wordSet']);

    let words = result.words || [];
    let wordSet = new Set(result.wordSet || []);

    // 找到并删除单词
    const index = words.findIndex(w => w.word === word || w.wordLower === word.toLowerCase());
    if (index === -1) {
      showToast('单词不存在', 'error');
      return;
    }

    const wordLower = words[index].wordLower;
    words.splice(index, 1);
    wordSet.delete(wordLower);

    await chrome.storage.local.set({
      words: words,
      wordSet: Array.from(wordSet)
    });

    showToast(`已删除 "${word}"`, 'success');

    // 重新加载列表
    await loadWordList();

  } catch (error) {
    console.error('删除单词失败:', error);
    showToast('删除失败', 'error');
  }
}
