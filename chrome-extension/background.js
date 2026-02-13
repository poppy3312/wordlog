// WordLog Chrome Extension - Background Service Worker
// 处理右键菜单、快捷键和存储管理

// ========== 初始化 ==========

// 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-word',
    title: '添加到 WordLog 单词本',
    contexts: ['selection']
  });

  console.log('WordLog Extension 已安装');
});

// ========== 右键菜单处理 ==========

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-word') {
    const selectedText = info.selectionText.trim();
    console.log('右键菜单触发 - 选中文本:', selectedText, '页面URL:', tab.url);

    // 验证是否为英文单词
    if (isValidEnglishWord(selectedText)) {
      console.log('✅ 有效英文单词，正在添加:', selectedText);

      try {
        const result = await addWordToStorage(selectedText);
        console.log('添加结果:', result);

        // 显示结果通知
        if (result.status === 'added') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'WordLog',
            message: `✅ 已添加 "${selectedText}" 到单词本`
          });
          sendContentMessage(tab.id, {
            type: 'WORD_ADDED',
            word: selectedText
          });
        } else if (result.status === 'exists') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'WordLog',
            message: `ℹ️ "${selectedText}" 已存在于单词本`
          });
          sendContentMessage(tab.id, {
            type: 'WORD_EXISTS',
            word: selectedText
          });
        } else if (result.status === 'error') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'WordLog',
            message: `❌ 添加失败: ${result.message}`
          });
        }
      } catch (error) {
        console.error('添加单词异常:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'WordLog',
          message: `❌ 添加异常: ${error.message}`
        });
      }
    } else {
      console.log('❌ 无效的英文单词:', selectedText);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'WordLog',
        message: '❌ 请选择有效的英文单词（只含字母，2个字符以上）'
      });
    }
  }
});

// ========== 快捷键处理 ==========

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'add-word') {
    // 通过 content script 获取选中文本
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
      if (response && response.word) {
        const word = response.word.trim();

        if (isValidEnglishWord(word)) {
          addWordToStorage(word);
          sendContentMessage(tab.id, {
            type: 'WORD_ADDED',
            word: word
          });
        } else {
          sendContentMessage(tab.id, {
            type: 'INVALID_WORD',
            message: '请选择有效的英文单词'
          });
        }
      }
    });
  }
});

// ========== 存储管理 ==========

// 添加单词到存储
async function addWordToStorage(word) {
  try {
    console.log(`[addWordToStorage] 开始添加单词: "${word}"`);

    const result = await chrome.storage.local.get(['words', 'wordSet', 'stats']);
    console.log(`[addWordToStorage] 当前存储:`, result.words?.length || 0, '个单词');

    const words = result.words || [];
    const wordSet = new Set(result.wordSet || []);
    const stats = result.stats || {
      totalWords: 0,
      uniqueWords: 0,
      todayAdded: 0
    };

    const wordLower = word.toLowerCase();

    // 检查是否已存在
    if (wordSet.has(wordLower)) {
      const existingWord = words.find(w => w.word.toLowerCase() === wordLower);
      if (existingWord) {
        existingWord.updatedAt = Date.now();
      }
      await chrome.storage.local.set({ words });
      console.log(`[addWordToStorage] 单词 "${word}" 已存在，已更新时间戳`);
      return { status: 'exists', message: '单词已存在' };
    }

    // 获取释义（如果失败则使用占位符）
    console.log(`[addWordToStorage] 开始获取释义...`);
    let definitions;
    try {
      definitions = await fetchWordDefinitions(word);
      console.log(`[addWordToStorage] 获取到 ${word} 的释义:`, definitions.length, '条');
    } catch (error) {
      console.error(`[addWordToStorage] 获取 ${word} 释义失败，使用占位符:`, error);
      definitions = [{
        partOfSpeech: '未知',
        definition: '释义暂不可用',
        example: '',
        exampleTranslation: ''
      }];
    }

    // 创建新单词对象
    const newWord = {
      id: generateId(),
      word: word,
      wordLower: wordLower,
      definitions: definitions,
      pronunciation: definitions[0]?.phonetic || '',
      createdAt: Date.now(),
      source: 'chrome-extension',
      imageUrl: '' // 配图URL（稍后异步生成）
    };
    console.log(`[addWordToStorage] 创建单词对象:`, newWord);

    // 添加到存储
    words.push(newWord);
    wordSet.add(wordLower);

    // 更新统计
    stats.totalWords = words.length;
    stats.uniqueWords = wordSet.size;
    stats.todayAdded++;

    console.log(`[addWordToStorage] 保存到存储...`);
    await chrome.storage.local.set({
      words: words,
      wordSet: Array.from(wordSet),
      stats: stats
    });
    console.log(`[addWordToStorage] 保存成功！当前共`, words.length, '个单词');

    // 异步生成配图（不阻塞添加流程）
    setTimeout(() => {
      generateWordImageAsync(word, definitions[0]?.partOfSpeech, definitions[0]?.definition)
        .then(imageUrl => {
          if (imageUrl) {
            console.log(`✅ 已生成 ${word} 的配图:`, imageUrl);
            // 更新存储中的图片URL
            chrome.storage.local.get(['words'], (result) => {
              const updatedWords = result.words.map(w =>
                w.wordLower === wordLower ? { ...w, imageUrl: imageUrl } : w
              );
              chrome.storage.local.set({ words: updatedWords });
            });
          }
        })
        .catch(err => {
          console.log(`配图生成失败（不影响添加）:`, err.message);
        });
    }, 1000);

    return { status: 'added', message: '已添加到单词本' };

  } catch (error) {
    console.error('[addWordToStorage] 添加单词失败:', error);
    return { status: 'error', message: error.message || '添加失败，请稍后重试' };
  }
}

// ========== 释义查询 ==========

// 获取单词释义（中文）- 优化版：本地词库优先
async function fetchWordDefinitions(word) {
  const wordLower = word.toLowerCase();
  console.log(`[fetchWordDefinitions] 开始获取 "${word}" 的释义`);

  // 方案0：本地常见词库（极速）
  const localDef = getLocalDefinition(wordLower);
  if (localDef) {
    console.log(`[fetchWordDefinitions] 本地词库命中:`, localDef.definitions[0].definition);
    return localDef.definitions;
  }

  // 方案1：优先使用 GLM-4.7（快速失败）
  try {
    console.log(`[fetchWordDefinitions] 尝试使用 GLM-4.7...`);
    const result = await fetchFromGLM(word);
    if (result && result.length > 0 && result[0].definition && result[0].definition.length > 0) {
      console.log(`[fetchWordDefinitions] GLM-4.7 成功`);
      return result;
    }
  } catch (error) {
    console.log('[fetchWordDefinitions] GLM 失败:', error.message);
  }

  // 方案2：使用 MiniMax（快速失败）
  try {
    console.log(`[fetchWordDefinitions] 尝试使用 MiniMax...`);
    const result = await fetchFromMiniMax(word);
    if (result && result.length > 0 && result[0].definition && result[0].definition.length > 0) {
      console.log(`[fetchWordDefinitions] MiniMax 成功`);
      return result;
    }
  } catch (error) {
    console.log('[fetchWordDefinitions] MiniMax 失败:', error.message);
  }

  // 方案3：使用免费的 DictionaryAPI (英文释义，非常稳定)
  try {
    console.log(`[fetchWordDefinitions] 尝试使用 DictionaryAPI...`);
    const response = await fetchWithTimeout(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      3000
    );

    if (response.ok) {
      const data = await response.json();
      const definitions = parseDictionaryData(data);
      console.log(`[fetchWordDefinitions] DictionaryAPI 成功，获取`, definitions.length, '条释义');
      return definitions;
    }
  } catch (error) {
    console.log('[fetchWordDefinitions] DictionaryAPI 失败:', error.message);
  }

  // 最终降级：返回占位符
  console.log(`[fetchWordDefinitions] 所有方案失败，返回占位符`);
  return [{
    partOfSpeech: '未知',
    definition: '释义暂不可用，可稍后刷新',
    example: '',
    exampleTranslation: ''
  }];
}

// 本地常见词库（极速返回）
function getLocalDefinition(word) {
  const commonWords = {
    'log': {
      definitions: [{
        partOfSpeech: '名词',
        definition: '日志；原木；记录',
        example: 'Check the server logs.',
        exampleTranslation: '检查服务器日志。'
      }, {
        partOfSpeech: '动词',
        definition: '记录；登录；砍伐',
        example: 'Log in to continue.',
        exampleTranslation: '登录以继续。'
      }]
    },
    'get': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '获得；得到；变成',
        example: 'I get a new book.',
        exampleTranslation: '我得到一本新书。'
      }]
    },
    'have': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '有；拥有；吃',
        example: 'I have a cat.',
        exampleTranslation: '我有一只猫。'
      }]
    },
    'make': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '制作；使；做',
        example: 'Make a cake.',
        exampleTranslation: '做一个蛋糕。'
      }]
    },
    'go': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '去；走；离开',
        example: 'Let\'s go home.',
        exampleTranslation: '让我们回家吧。'
      }]
    },
    'see': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '看见；明白；参观',
        example: 'I see a bird.',
        exampleTranslation: '我看见一只鸟。'
      }]
    },
    'know': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '知道；了解；认识',
        example: 'I know him.',
        exampleTranslation: '我认识他。'
      }]
    },
    'take': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '拿；取；花费',
        example: 'Take a seat.',
        exampleTranslation: '请坐。'
      }]
    },
    'come': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '来；到达；出现',
        example: 'Come here.',
        exampleTranslation: '来这里。'
      }]
    },
    'think': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '想；认为；思考',
        example: 'I think so.',
        exampleTranslation: '我是这么想的。'
      }]
    },
    'look': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '看；寻找；看起来',
        example: 'Look at this.',
        exampleTranslation: '看这个。'
      }]
    },
    'want': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '想要；希望；需要',
        example: 'I want to go.',
        exampleTranslation: '我想去。'
      }]
    },
    'give': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '给；提供；交付',
        example: 'Give me a hand.',
        exampleTranslation: '帮我一下。'
      }]
    },
    'find': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '找到；发现；寻找',
        example: 'Find the answer.',
        exampleTranslation: '找到答案。'
      }]
    },
    'tell': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '告诉；说；分辨',
        example: 'Tell me the truth.',
        exampleTranslation: '告诉我真相。'
      }]
    },
    'work': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '工作；运作；起作用',
        example: 'It works!',
        exampleTranslation: '它起作用了！'
      }]
    },
    'call': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '呼叫；称呼；打电话',
        example: 'Call me later.',
        exampleTranslation: '稍后给我打电话。'
      }]
    },
    'try': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '尝试；努力；审判',
        example: 'Try again.',
        exampleTranslation: '再试一次。'
      }]
    },
    'ask': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '问；要求；邀请',
        example: 'Ask a question.',
        exampleTranslation: '问一个问题。'
      }]
    },
    'need': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '需要；必须；缺少',
        example: 'I need help.',
        exampleTranslation: '我需要帮助。'
      }]
    },
    'feel': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '感觉；觉得；触摸',
        example: 'I feel good.',
        exampleTranslation: '我感觉很好。'
      }]
    },
    'become': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '变成；成为；变得',
        example: 'Dreams come true.',
        exampleTranslation: '梦想成真。'
      }]
    },
    'leave': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '离开；留下；遗忘',
        example: 'Leave now.',
        exampleTranslation: '现在离开。'
      }]
    },
    'put': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '放；放置；表达',
        example: 'Put it here.',
        exampleTranslation: '把它放这里。'
      }]
    },
    'mean': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '意味着；打算；有意',
        example: 'What do you mean?',
        exampleTranslation: '你是什么意思？'
      }]
    },
    'keep': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '保持；保留；遵守',
        example: 'Keep going.',
        exampleTranslation: '继续前进。'
      }]
    },
    'let': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '让；允许；出租',
        example: 'Let me help.',
        exampleTranslation: '让我帮忙。'
      }]
    },
    'begin': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '开始；着手',
        example: 'Let\'s begin.',
        exampleTranslation: '让我们开始吧。'
      }]
    },
    'seem': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '似乎；看起来；显得',
        example: 'It seems good.',
        exampleTranslation: '看起来不错。'
      }]
    },
    'help': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '帮助；有助于；救命',
        example: 'Can you help?',
        exampleTranslation: '你能帮忙吗？'
      }]
    },
    'talk': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '谈话；交谈；讨论',
        example: 'Let\'s talk.',
        exampleTranslation: '让我们谈谈。'
      }]
    },
    'turn': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '转动；变成；次序',
        example: 'Turn left.',
        exampleTranslation: '左转。'
      }]
    },
    'start': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '开始；启动；创办',
        example: 'Start now.',
        exampleTranslation: '现在开始。'
      }]
    },
    'show': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '展示；显示；证明',
        example: 'Show me.',
        exampleTranslation: '给我看看。'
      }]
    },
    'hear': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '听见；倾听；得知',
        example: 'I hear you.',
        exampleTranslation: '我听到你了。'
      }]
    },
    'play': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '玩；演奏；扮演',
        example: 'Play a game.',
        exampleTranslation: '玩游戏。'
      }]
    },
    'run': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '跑；运行；经营',
        example: 'Run fast.',
        exampleTranslation: '快跑。'
      }]
    },
    'move': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '移动；搬家；感动',
        example: 'Move it.',
        exampleTranslation: '移动它。'
      }]
    },
    'live': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '居住；活着；生活',
        example: 'I live here.',
        exampleTranslation: '我住在这里。'
      }]
    },
    'believe': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '相信；认为；信任',
        example: 'I believe you.',
        exampleTranslation: '我相信你。'
      }]
    },
    'hold': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '握住；举办；保持',
        example: 'Hold on.',
        exampleTranslation: '等一下。'
      }]
    },
    'bring': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '带来；引起；促使',
        example: 'Bring it here.',
        exampleTranslation: '把它带到这里。'
      }]
    },
    'happen': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '发生；碰巧；出现',
        example: 'What happened?',
        exampleTranslation: '发生了什么？'
      }]
    },
    'write': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '写；写作；编写',
        example: 'Write it down.',
        exampleTranslation: '写下来。'
      }]
    },
    'sit': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '坐；坐落；担任',
        example: 'Sit down.',
        exampleTranslation: '坐下。'
      }]
    },
    'stand': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '站立；忍受；位于',
        example: 'Stand up.',
        exampleTranslation: '站起来。'
      }]
    },
    'lose': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '丢失；输掉；错过',
        example: 'Don\'t lose it.',
        exampleTranslation: '别把它弄丢了。'
      }]
    },
    'pay': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '支付；付钱；值得',
        example: 'Pay the bill.',
        exampleTranslation: '付账单。'
      }]
    },
    'meet': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '遇见；满足；应付',
        example: 'Nice to meet you.',
        exampleTranslation: '很高兴见到你。'
      }]
    },
    'include': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '包括；包含',
        example: 'The price includes tax.',
        exampleTranslation: '价格包含税费。'
      }]
    },
    'continue': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '继续；持续',
        example: 'Please continue.',
        exampleTranslation: '请继续。'
      }]
    },
    'learn': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '学习；得知；记住',
        example: 'Learn English.',
        exampleTranslation: '学习英语。'
      }]
    },
    'change': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '改变；交换；兑换',
        example: 'Change the world.',
        exampleTranslation: '改变世界。'
      }]
    },
    'lead': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '领导；引导；通向',
        example: 'Lead the team.',
        exampleTranslation: '带领团队。'
      }]
    },
    'understand': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '理解；明白；获悉',
        example: 'I understand.',
        exampleTranslation: '我理解了。'
      }]
    },
    'watch': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '观看；看守；注视',
        example: 'Watch a movie.',
        exampleTranslation: '看电影。'
      }]
    },
    'follow': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '跟随；遵循；理解',
        example: 'Follow me.',
        exampleTranslation: '跟我来。'
      }]
    },
    'stop': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '停止；阻止；车站',
        example: 'Stop here.',
        exampleTranslation: '在这里停下。'
      }]
    },
    'create': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '创造；创建；造成',
        example: 'Create art.',
        exampleTranslation: '创造艺术。'
      }]
    },
    'speak': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '说话；演讲；发言',
        example: 'Speak English.',
        exampleTranslation: '说英语。'
      }]
    },
    'read': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '阅读；读懂；显示',
        example: 'Read a book.',
        exampleTranslation: '读书。'
      }]
    },
    'allow': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '允许；给予；认可',
        example: 'Smoking not allowed.',
        exampleTranslation: '禁止吸烟。'
      }]
    },
    'add': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '添加；增加；加法',
        example: 'Add more sugar.',
        exampleTranslation: '多加点糖。'
      }]
    },
    'spend': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '花费；度过；消耗',
        example: 'Spend time wisely.',
        exampleTranslation: '明智地花费时间。'
      }]
    },
    'grow': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '生长；成长；种植',
        example: 'Grow fast.',
        exampleTranslation: '长得快。'
      }]
    },
    'open': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '打开；开启；营业',
        example: 'Open the door.',
        exampleTranslation: '开门。'
      }]
    },
    'walk': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '走；散步；步行',
        example: 'Walk with me.',
        exampleTranslation: '跟我一起走。'
      }]
    },
    'win': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '赢；获胜；获得',
        example: 'Win the game.',
        exampleTranslation: '赢得比赛。'
      }]
    },
    'offer': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '提供；报价；奉献',
        example: 'Offer help.',
        exampleTranslation: '提供帮助。'
      }]
    },
    'remember': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '记得；记住；纪念',
        example: 'Remember me.',
        exampleTranslation: '记住我。'
      }]
    },
    'love': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '爱；热爱；喜爱',
        example: 'I love you.',
        exampleTranslation: '我爱你。'
      }]
    },
    'consider': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '考虑；认为；把...看作',
        example: 'Consider this.',
        exampleTranslation: '考虑一下这个。'
      }]
    },
    'appear': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '出现；显得；似乎',
        example: 'It appears true.',
        exampleTranslation: '这似乎是真的。'
      }]
    },
    'buy': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '买；购买；买到',
        example: 'Buy a car.',
        exampleTranslation: '买车。'
      }]
    },
    'wait': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '等待；等候；伺候',
        example: 'Wait a moment.',
        exampleTranslation: '等一下。'
      }]
    },
    'serve': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '服务；接待；端上',
        example: 'Serve customers.',
        exampleTranslation: '服务顾客。'
      }]
    },
    'die': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '死；去世；消失',
        example: 'The battery died.',
        exampleTranslation: '电池没电了。'
      }]
    },
    'send': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '发送；寄；派遣',
        example: 'Send a message.',
        exampleTranslation: '发送消息。'
      }]
    },
    'expect': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '期望；预期；指望',
        example: 'I expect success.',
        exampleTranslation: '我期望成功。'
      }]
    },
    'build': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '建造；建立；构建',
        example: 'Build a house.',
        exampleTranslation: '盖房子。'
      }]
    },
    'stay': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '停留；保持；暂住',
        example: 'Stay here.',
        exampleTranslation: '待在这里。'
      }]
    },
    'fall': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '落下；跌倒；变成',
        example: 'Leaves fall.',
        exampleTranslation: '叶子落下。'
      }]
    },
    'cut': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '切；剪；削减',
        example: 'Cut the paper.',
        exampleTranslation: '剪纸。'
      }]
    },
    'reach': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '到达；达到；联系',
        example: 'Reach the goal.',
        exampleTranslation: '达到目标。'
      }]
    },
    'kill': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '杀；杀死；消磨',
        example: 'Kill time.',
        exampleTranslation: '消磨时间。'
      }]
    },
    'remain': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '保持；剩余；留下',
        example: 'Remain calm.',
        exampleTranslation: '保持冷静。'
      }]
    },
    'suggest': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '建议；暗示；提议',
        example: 'I suggest rest.',
        exampleTranslation: '我建议休息。'
      }]
    },
    'raise': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '举起；提高；抚养',
        example: 'Raise your hand.',
        exampleTranslation: '举手。'
      }]
    },
    'pass': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '通过；传递；经过',
        example: 'Pass the test.',
        exampleTranslation: '通过测试。'
      }]
    },
    'sell': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '卖；销售；推销',
        example: 'Sell products.',
        exampleTranslation: '销售产品。'
      }]
    },
    'require': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '需要；要求；命令',
        example: 'Requires attention.',
        exampleTranslation: '需要关注。'
      }]
    },
    'report': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '报告；报道；举报',
        example: 'Report the news.',
        exampleTranslation: '报道新闻。'
      }]
    },
    'decide': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '决定；判断；使决断',
        example: 'Decide now.',
        exampleTranslation: '现在决定。'
      }]
    },
    'pull': {
      definitions: [{
        partOfSpeech: '动词',
        definition: '拉；拖；拔',
        example: 'Pull the door.',
        exampleTranslation: '拉门。'
      }]
    }
  };

  return commonWords[wordLower] || null;
}

// 解析词典数据
function parseDictionaryData(data) {
  const definitions = [];

  for (const entry of data) {
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';

    for (const meaning of entry.meanings || []) {
      const partOfSpeech = translatePartOfSpeech(meaning.partOfSpeech);

      // 只取前3个释义
      for (const def of meaning.definitions.slice(0, 3)) {
        definitions.push({
          partOfSpeech: partOfSpeech,
          definition: def.definition || '暂无释义',
          example: def.example || '',
          exampleTranslation: '',
          phonetic: phonetic
        });
      }
    }

    if (definitions.length > 0) break;
  }

  return definitions.length > 0 ? definitions : [{
    partOfSpeech: '未知',
    definition: '未找到释义',
    example: '',
    exampleTranslation: ''
  }];
}

// 翻译词性
function translatePartOfSpeech(pos) {
  const translations = {
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
  return translations[pos.toLowerCase()] || pos;
}

// MiniMax API 查询
async function fetchFromMiniMax(word) {
  const API_ENDPOINT = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
  const API_KEY = 'sk-cp-a6J__kANTsbV2sFzBPYdzcC-AqkLIHdm6yd2g-bed1n3xUSBRT2UoNzYoG8S7ORyt3Kq9i6jMlG7uBhdI8o-oHdtShfHjxtI1biuGi--7cbFyBU2NYrs0j8';

  if (API_KEY === 'YOUR_MINIMAX_API_KEY') {
    console.log('[fetchFromMiniMax] API Key 未配置，跳过');
    throw new Error('MiniMax API Key 未配置');
  }

  const userPrompt = `请提供英文单词 "${word}" 的中文释义，JSON格式：
{
  "definitions": [
    {
      "partOfSpeech": "词性",
      "definition": "中文释义",
      "example": "英文例句",
      "exampleTranslation": "例句中文翻译"
    }
  ]
}

只返回JSON，不要其他解释。`;

  try {
    console.log(`[fetchFromMiniMax] 发送请求...`);
    const response = await fetchWithTimeout(
      API_ENDPOINT,
      6000,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'abab6.5s-chat',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides Chinese definitions for English words in JSON format.' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.messages[0]?.text || '';
      console.log(`[fetchFromMiniMax] 原始返回:`, content.substring(0, 200));

      // 尝试提取 JSON
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.definitions && Array.isArray(parsed.definitions) && parsed.definitions.length > 0) {
          return parsed.definitions;
        }
      } catch (e) {
        console.log('[fetchFromMiniMax] JSON 解析失败:', e.message);
      }

      // 解析失败，尝试从文本中提取
      return parseDefinitionFromText(content);
    } else {
      const errorText = await response.text();
      console.error('[fetchFromMiniMax] API 错误:', response.status, errorText);
      throw new Error(`MiniMax API 错误: ${response.status}`);
    }
  } catch (error) {
    console.error('[fetchFromMiniMax] 查询失败:', error);
    throw error;
  }
}

// GLM 查询（使用 glm-4-flash 更快）
async function fetchFromGLM(word) {
  const API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const API_KEY = 'cb984be4ea064e20b4dad8df5cb16a37.luDyhsqqMMSITW5F';

  const userPrompt = `Provide Chinese definition for "${word}" in JSON:
{"definitions":[{"partOfSpeech":"词性","definition":"中文释义","example":"英文例句","exampleTranslation":"中文翻译"}]}
Only return JSON.`;

  try {
    console.log(`[fetchFromGLM] 请求 glm-4-flash...`);
    const response = await fetchWithTimeout(
      API_ENDPOINT,
      8000,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.3,
          max_tokens: 300
        })
      }
    );

    console.log(`[fetchFromGLM] 响应状态:`, response.status);

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      console.log(`[fetchFromGLM] 返回内容:`, content.substring(0, 150));

      // 提取 JSON
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*"definitions"[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.definitions && parsed.definitions.length > 0) {
          console.log(`[fetchFromGLM] ✅ 成功`);
          return parsed.definitions;
        }
      } catch (e) {
        console.log('[fetchFromGLM] JSON 解析失败:', e.message);
      }

      return parseDefinitionFromText(content);
    } else {
      const errorText = await response.text();
      console.error('[fetchFromGLM] API 错误:', response.status, errorText);
      throw new Error(`API 错误: ${response.status}`);
    }
  } catch (error) {
    console.error('[fetchFromGLM] 失败:', error.message);
    throw error;
  }
}

// 从文本中解析释义（当 JSON 解析失败时的降级方案）
function parseDefinitionFromText(text) {
  console.log('[parseDefinitionFromText] 尝试从文本解析:', text);

  // 清理文本，移除 markdown 代码块标记
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // 尝试多种方式提取 JSON
  let jsonStr = cleaned;
  const patterns = [
    /\{[\s\S]*"definitions"[\s\S]*\}/,  // 包含 definitions 的完整 JSON
    /\{[\s\S]*\}/,                        // 任何 JSON 对象
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      jsonStr = match[0];
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.definitions && Array.isArray(parsed.definitions)) {
          console.log('[parseDefinitionFromText] 成功解析 JSON');
          return parsed.definitions;
        }
      } catch (e) {
        console.log('[parseDefinitionFromText] JSON 解析尝试失败:', e.message);
      }
    }
  }

  // 完全无法解析 JSON，尝试从文本中提取有用信息
  const definitions = [];

  // 查找词性
  let partOfSpeech = '名词';
  const posPatterns = [
    /词性[：:]\s*([^\n，。]+)/,
    /partOfSpeech[：:]\s*([^\n，。]+)/i,
    /(名词|动词|形容词|副词)/,
  ];
  for (const p of posPatterns) {
    const match = cleaned.match(p);
    if (match) {
      partOfSpeech = match[1].trim();
      break;
    }
  }

  // 查找释义
  let definition = cleaned;
  const defPatterns = [
    /释义[：:]\s*([^\n]+)/,
    /definition[：:]\s*([^\n]+)/i,
  ];
  for (const p of defPatterns) {
    const match = cleaned.match(p);
    if (match) {
      definition = match[1].trim();
      break;
    }
  }

  // 限制长度
  if (definition.length > 200) {
    definition = definition.substring(0, 200) + '...';
  }

  definitions.push({
    partOfSpeech: partOfSpeech,
    definition: definition || '释义解析失败',
    example: '',
    exampleTranslation: ''
  });

  console.log('[parseDefinitionFromText] 降级解析结果:', definitions);
  return definitions;
}

// 简单中文释义（临时方案，未配置 API 时使用）
function getSimpleChineseDefinition(word) {
  const commonWords = {
    'extension': {
      partOfSpeech: '名词',
      definition: '扩展；延长；电话分机',
      example: 'I installed a new browser extension.',
      exampleTranslation: '我安装了一个新的浏览器扩展。'
    },
    'proceed': {
      partOfSpeech: '动词',
      definition: '继续进行；前进',
      example: 'Please proceed with your presentation.',
      exampleTranslation: '请继续你的演示。'
    },
    'beaming': {
      partOfSpeech: '形容词',
      definition: '微笑的；发光的；容光焕发',
      example: 'She was beaming with happiness.',
      exampleTranslation: '她开心地微笑着。'
    },
    'method': {
      partOfSpeech: '名词',
      definition: '方法；方式',
      example: 'This is a good method to learn English.',
      exampleTranslation: '这是一个学习英语的好方法。'
    },
    'hello': {
      partOfSpeech: '感叹词',
      definition: '你好；问候',
      example: 'Hello, how are you?',
      exampleTranslation: '你好，你好吗？'
    },
    'world': {
      partOfSpeech: '名词',
      definition: '世界；地球',
      example: 'The world is beautiful.',
      exampleTranslation: '这个世界很美丽。'
    },
    'test': {
      partOfSpeech: '名词/动词',
      definition: '测试；考试',
      example: 'This is a test.',
      exampleTranslation: '这是一个测试。'
    },
    'apple': {
      partOfSpeech: '名词',
      definition: '苹果',
      example: 'I eat an apple every day.',
      exampleTranslation: '我每天吃一个苹果。'
    },
    'book': {
      partOfSpeech: '名词',
      definition: '书；书籍',
      example: 'This is a good book.',
      exampleTranslation: '这是一本好书。'
    },
    'love': {
      partOfSpeech: '动词/名词',
      definition: '爱；喜爱；热爱',
      example: 'I love my family.',
      exampleTranslation: '我爱我的家人。'
    }
  };

  const wordLower = word.toLowerCase();
  if (commonWords[wordLower]) {
    return [commonWords[wordLower]];
  }

  // 未知单词返回占位符
  return [{
    partOfSpeech: '未知',
    definition: '请在 background.js 中配置 GLM-4.7 API 以获取完整释义',
    example: '',
    exampleTranslation: ''
  }];
}

// ========== 工具函数 ==========

// 验证是否为有效英文单词
function isValidEnglishWord(text) {
  const englishWordRegex = /^[a-zA-Z]+(-[a-zA-Z]+)*$/;
  return englishWordRegex.test(text) && text.length >= 2;
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 带超时的 fetch
function fetchWithTimeout(url, timeout, options = {}) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

// 向 content script 发送消息
function sendContentMessage(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(error => {
    console.log('发送消息到 content script 失败 (可能页面未加载或已关闭):', error.message);
    // 消息发送失败不影响核心功能（添加单词已成功）
  });
}

// ========== 导出功能 ==========

// 导出为 TXT
async function exportToTxt() {
  const result = await chrome.storage.local.get(['words']);
  const words = result.words || [];

  let content = '# WordLog 单词本\n\n';
  content += `导出时间: ${new Date().toLocaleString()}\n`;
  content += `总单词数: ${words.length}\n\n`;
  content += '---\n\n';

  for (const word of words) {
    content += `## ${word.word}\n`;
    if (word.pronunciation) {
      content += `发音: ${word.pronunciation}\n`;
    }
    content += `添加时间: ${new Date(word.createdAt).toLocaleString()}\n\n`;

    for (const def of word.definitions) {
      content += `- **${def.partOfSpeech}**: ${def.definition}\n`;
      if (def.example) {
        content += `  例句: ${def.example}\n`;
      }
    }
    content += '\n';
  }

  return content;
}

// 导出为 CSV
async function exportToCsv() {
  const result = await chrome.storage.local.get(['words']);
  const words = result.words || [];

  let csv = '单词,词性,释义,例句,添加时间\n';

  for (const word of words) {
    for (const def of word.definitions) {
      csv += `"${word.word}","${def.partOfSpeech}","${def.definition}","${def.example}","${new Date(word.createdAt).toLocaleString()}"\n`;
    }
  }

  return csv;
}

// 导出为 Obsidian Markdown
async function exportToObsidian() {
  const result = await chrome.storage.local.get(['words']);
  const words = result.words || [];

  let content = '# WordLog 单词本\n\n';
  content += `> 最后更新: ${new Date().toLocaleString()}\n`;
  content += `> 总单词数: ${words.length}\n\n`;
  content += '---\n\n';

  // 按日期分组
  const groupedByDate = {};
  for (const word of words) {
    const date = new Date(word.createdAt).toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(word);
  }

  // 按日期输出
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

      content += `- **添加时间**: ${new Date(word.createdAt).toLocaleString()}\n\n`;
    }
  }

  return content;
}

// ========== 自动配图生成系统 ==========

// 风格推荐系统：名词→实物/3D，动词/形容词等→人物+辅助物品，更直观
function recommendStyle(word, partOfSpeech) {
  const pos = (partOfSpeech || '').toLowerCase();

  // 名词 - 实物或3D
  if (pos.includes('名词') || pos.includes('noun')) {
    const concreteNouns = ['keyboard', 'camera', 'apple', 'book', 'phone', 'computer', 'laptop', 'mouse', 'table', 'chair', 'cup', 'glass', 'bottle', 'pen', 'pencil', 'car', 'bicycle', 'tree', 'flower', 'bird', 'cat', 'dog', 'house', 'door', 'window', 'piano', 'guitar', 'violin', 'camera', 'watch'];
    if (concreteNouns.includes(word.toLowerCase())) {
      return 'REAL';
    }
    return '3D';
  }

  // 动词 - 人物+道具表现动作
  if (pos.includes('动词') || pos.includes('verb')) {
    return 'PERSON_ACTION';
  }

  // 形容词/副词 - 人物或场景+辅助物品体现含义
  if (pos.includes('形容词') || pos.includes('adjective') || pos.includes('adj') || pos.includes('副词') || pos.includes('adverb')) {
    return 'PERSON_CONCEPT';
  }

  // 抽象概念 - 人物+象征物
  const abstractConcepts = ['freedom', 'love', 'peace', 'harmony', 'success', 'balance', 'serendipity', 'innovation', 'creativity', 'wisdom', 'hope', 'dream', 'courage', 'justice', 'truth'];
  if (abstractConcepts.includes(word.toLowerCase())) {
    return 'PERSON_CONCEPT';
  }

  return 'PERSON_CONCEPT';
}

// 生成配图提示词（基于v2.0风格系统）
function generateImagePrompt(word, style, definition) {
  const baseParams = ', 1:1 aspect ratio, centered, no text, no watermark, high quality';

  switch(style) {
    case 'REAL':
      return `Professional product photography of ${word}, ${definition || ''}, sharp focus, studio lighting, soft shadows, pure white background, 8k resolution${baseParams}`;

    case '3D':
      return `${word}, 3D isometric style, high-quality 3D render, C4D style, Octane render, solid white background, studio lighting, soft shadows, 8k resolution${baseParams}, safe margin, no cropping`;

    case 'PERSON_ACTION':
      return `One 3D illustrated person (realistic cartoon style, diverse appearance) clearly performing the action "${word}", ${definition || ''}. The person must hold or interact with relevant props or objects that show the meaning at a glance. Full body or upper body, dynamic pose, clean white background, soft lighting, no text${baseParams}`;

    case 'PERSON_CONCEPT':
      return `One 3D illustrated scene with a person (realistic cartoon style) and supporting props or objects that together show the meaning of "${word}", ${definition || ''}. Use character expression, pose, and clear visual props to make the concept obvious. Clean white background, soft lighting, no text${baseParams}`;

    case 'INK':
      return `${word} concept, Japanese ink drawing style, sumi-e inspired, hand-drawn illustration with brush strokes, minimal elegant lines, white paper background, artistic${baseParams}`;

    case 'MINI':
      return `${word} as a minimalist flat icon, simple geometric shapes, single accent color on white background, vector illustration style, clean lines${baseParams}`;

    case 'FLAT':
      return `${word}, modern flat illustration style, vector art, vibrant colors, clean shapes, subtle gradients, white background${baseParams}`;

    case 'RETRO':
      return `${word}, vintage poster art style, art deco inspired, muted retro color palette, paper texture, cream background${baseParams}`;

    default:
      return `${word}, professional illustration, white background${baseParams}`;
  }
}

// 异步生成单词配图
async function generateWordImageAsync(word, partOfSpeech, definition) {
  console.log(`[generateWordImageAsync] 开始生成 ${word} 的配图...`);
  try {
    const style = recommendStyle(word, partOfSpeech);
    console.log(`[generateWordImageAsync] 风格: ${style}`);

    const prompt = generateImagePrompt(word, style, definition);
    console.log(`[generateWordImageAsync] 提示词:`, prompt.substring(0, 100));

    const response = await fetchWithTimeout(
      'https://open.bigmodel.cn/api/paas/v4/images/generations',
      30000,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 8dac85c3e1764785b751b10f375b67de.cp2kBrj5Ua0JysG7'
        },
        body: JSON.stringify({
          model: 'cogview-3-plus',
          prompt: prompt
        })
      }
    );

    console.log(`[generateWordImageAsync] API 响应:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateWordImageAsync] API 错误:`, response.status, errorText);
      return null;
    }

    const result = await response.json();
    console.log(`[generateWordImageAsync] 返回数据:`, result);

    const imageUrl = result.data?.[0]?.url;

    if (imageUrl) {
      console.log(`[generateWordImageAsync] ✅ 配图生成成功:`, imageUrl);
    } else {
      console.log(`[generateWordImageAsync] 返回数据中没有图片 URL`);
    }

    return imageUrl || null;
  } catch (error) {
    console.error(`[generateWordImageAsync] 异常:`, error);
    return null;
  }
}
