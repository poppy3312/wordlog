// WordLog 单词释义修复工具
// 在浏览器控制台中运行此脚本来批量更新单词释义

(async function fixWordDefinitions() {
  console.log('🔧 开始修复单词释义...');

  // 读取当前存储的单词
  const result = await chrome.storage.local.get(['words']);
  let words = result.words || [];

  if (words.length === 0) {
    console.log('❌ 没有找到单词数据');
    return;
  }

  console.log(`📚 找到 ${words.length} 个单词`);

  // 常用词中文释义映射
  const commonWords = {
    'serendipity': {
      partOfSpeech: '名词',
      definition: '意外发现珍奇事物的本领；机缘凑巧',
      example: 'Finding this shop was pure serendipity.',
      exampleTranslation: '发现这家店纯属机缘巧合。'
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
    'example': {
      partOfSpeech: '名词',
      definition: '例子；榜样',
      example: 'This is a good example.',
      exampleTranslation: '这是一个好例子。'
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
    },
    'happy': {
      partOfSpeech: '形容词',
      definition: '快乐的；幸福的',
      example: 'I am very happy today.',
      exampleTranslation: '我今天很开心。'
    },
    'learn': {
      partOfSpeech: '动词',
      definition: '学习；得知',
      example: 'I want to learn English.',
      exampleTranslation: '我想学英语。'
    }
  };

  let updatedCount = 0;

  // 更新单词释义
  for (const word of words) {
    const wordLower = word.word.toLowerCase();
    const chineseDef = commonWords[wordLower];

    if (chineseDef && word.definitions && word.definitions[0]) {
      // 检查是否需要更新（如果释义是英文的）
      const currentDef = word.definitions[0].definition;
      if (currentDef.length > 0 && /^[a-zA-Z\s\.,]+$/.test(currentDef)) {
        // 当前是英文释义，更新为中文
        word.definitions = [{
          ...chineseDef,
          phonetic: word.pronunciation || ''
        }];
        updatedCount++;
        console.log(`✅ 已更新: ${word.word}`);
      }
    }
  }

  // 保存更新后的数据
  if (updatedCount > 0) {
    await chrome.storage.local.set({ words: words });
    console.log(`\n🎉 成功更新了 ${updatedCount} 个单词的释义！`);
    console.log('📝 请刷新 WordLog 网页查看效果');
  } else {
    console.log('ℹ️ 没有需要更新的单词，或所有单词都已经是中文释义');
  }

  // 显示当前单词列表
  console.log('\n📋 当前单词列表:');
  words.forEach((w, i) => {
    console.log(`${i + 1}. ${w.word} - ${w.definitions[0]?.definition || '无释义'}`);
  });
})();
