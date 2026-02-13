// WordLog Chrome Extension - Content Script
// 处理页面选中文本和 Toast 显示

// ========== 初始化 ==========

let toastElement = null;
let toastTimeout = null;

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message);
  sendResponse({ received: true });
});

// ========== 消息处理 ==========

function handleBackgroundMessage(message) {
  switch (message.type) {
    case 'WORD_ADDED':
      showToast('success', `已添加 "${message.word}" 到单词本`);
      break;

    case 'INVALID_WORD':
      showToast('error', message.message);
      break;

    case 'WORD_EXISTS':
      showToast('info', `"${message.word}" 已存在于单词本`);
      break;

    case 'WORD_UPDATED':
      showToast('success', `已更新 "${message.word}" 的释义`);
      break;
  }
}

// ========== 选中文本获取 ==========

// 响应快捷键命令
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
      sendResponse({ word: selectedText });
    } else {
      sendResponse({ word: null });
    }
  }
  return true; // 保持消息通道开启
});

// ========== Toast 提示组件 ==========

function showToast(type, message) {
  // 移除已存在的 toast
  if (toastElement) {
    removeToast();
  }

  // 创建 toast 元素
  toastElement = document.createElement('div');
  toastElement.className = `wordlog-toast wordlog-toast-${type}`;

  // 添加图标
  const icon = getToastIcon(type);
  toastElement.innerHTML = `
    <span class="wordlog-toast-icon">${icon}</span>
    <span class="wordlog-toast-message">${message}</span>
  `;

  // 添加到页面
  document.body.appendChild(toastElement);

  // 触发动画
  requestAnimationFrame(() => {
    toastElement.classList.add('wordlog-toast-show');
  });

  // 自动移除
  toastTimeout = setTimeout(() => {
    removeToast();
  }, 1500);
}

function removeToast() {
  if (toastElement) {
    toastElement.classList.remove('wordlog-toast-show');
    toastElement.classList.add('wordlog-toast-hide');

    setTimeout(() => {
      if (toastElement && toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      toastElement = null;
    }, 300);
  }

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}

function getToastIcon(type) {
  const icons = {
    'success': '✓',
    'error': '✕',
    'info': 'ℹ',
    'warning': '⚠'
  };
  return icons[type] || 'ℹ';
}

// ========== 划词悬浮卡片（可选功能） ==========

// 可选：实现鼠标悬停显示单词卡片的功能
// 需要在设置中启用

let selectionTimer = null;
let floatCard = null;

document.addEventListener('mouseup', (event) => {
  // 清除之前的定时器
  if (selectionTimer) {
    clearTimeout(selectionTimer);
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // 移除已存在的悬浮卡片
  if (floatCard) {
    removeFloatCard();
  }

  // 验证选中文本
  if (!selectedText || !isValidEnglishWord(selectedText)) {
    return;
  }

  // 延迟显示悬浮卡片（避免误触）
  selectionTimer = setTimeout(() => {
    showFloatCard(selectedText, event.pageX, event.pageY);
  }, 500);
});

document.addEventListener('mousedown', () => {
  // 点击其他地方时移除卡片
  if (floatCard) {
    removeFloatCard();
  }
  if (selectionTimer) {
    clearTimeout(selectionTimer);
  }
});

async function showFloatCard(word, x, y) {
  // 创建悬浮卡片
  floatCard = document.createElement('div');
  floatCard.className = 'wordlog-float-card';

  // 显示加载状态
  floatCard.innerHTML = `
    <div class="wordlog-card-header">
      <span class="wordlog-card-word">${word}</span>
      <button class="wordlog-card-close" onclick="this.closest('.wordlog-float-card').remove()">✕</button>
    </div>
    <div class="wordlog-card-loading">正在查询释义...</div>
  `;

  // 定位
  positionFloatCard(x, y);
  document.body.appendChild(floatCard);

  // 获取释义
  try {
    const definitions = await fetchWordDefinitions(word);

    // 更新卡片内容
    floatCard.innerHTML = generateCardHTML(word, definitions);

  } catch (error) {
    floatCard.innerHTML = `
      <div class="wordlog-card-header">
        <span class="wordlog-card-word">${word}</span>
        <button class="wordlog-card-close">✕</button>
      </div>
      <div class="wordlog-card-error">释义查询失败</div>
    `;
  }

  // 添加关闭按钮事件
  const closeBtn = floatCard.querySelector('.wordlog-card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeFloatCard);
  }

  // 添加到单词本按钮
  const addBtn = floatCard.querySelector('.wordlog-card-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'ADD_WORD',
        word: word
      });
      removeFloatCard();
    });
  }
}

function positionFloatCard(x, y) {
  if (!floatCard) return;

  // 先添加到 DOM 以获取尺寸
  floatCard.style.visibility = 'hidden';
  document.body.appendChild(floatCard);

  const cardWidth = floatCard.offsetWidth;
  const cardHeight = floatCard.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 计算位置，避免超出屏幕
  let left = x + 10;
  let top = y + 10;

  if (left + cardWidth > windowWidth) {
    left = x - cardWidth - 10;
  }

  if (top + cardHeight > windowHeight) {
    top = y - cardHeight - 10;
  }

  floatCard.style.left = `${Math.max(10, left)}px`;
  floatCard.style.top = `${Math.max(10, top)}px`;
  floatCard.style.visibility = 'visible';
}

function removeFloatCard() {
  if (floatCard && floatCard.parentNode) {
    floatCard.parentNode.removeChild(floatCard);
  }
  floatCard = null;
}

function generateCardHTML(word, definitions) {
  let html = `
    <div class="wordlog-card-header">
      <span class="wordlog-card-word">${word}</span>
      <button class="wordlog-card-close">✕</button>
    </div>
    <div class="wordlog-card-content">
  `;

  for (const def of definitions) {
    html += `
      <div class="wordlog-card-definition">
        <span class="wordlog-card-pos">${def.partOfSpeech}</span>
        <span class="wordlog-card-def">${def.definition}</span>
      </div>
    `;

    if (def.example) {
      html += `<div class="wordlog-card-example">${def.example}</div>`;
    }
  }

  html += `
    </div>
    <div class="wordlog-card-footer">
      <button class="wordlog-card-add">添加到单词本</button>
    </div>
  `;

  return html;
}

// ========== 工具函数 ==========

function isValidEnglishWord(text) {
  const englishWordRegex = /^[a-zA-Z]+(-[a-zA-Z]+)*$/;
  return englishWordRegex.test(text) && text.length >= 2;
}

// 本地释义查询（通过 background）
async function fetchWordDefinitions(word) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_DEFINITION', word: word },
      (response) => {
        resolve(response?.definitions || []);
      }
    );
  });
}
