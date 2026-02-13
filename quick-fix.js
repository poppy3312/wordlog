// 在浏览器控制台直接运行，快速修复单词释义
(async function() {
  console.log('🔧 WordLog 释义修复工具');

  // 从 localStorage 读取
  const wordsData = localStorage.getItem('wordlog_words');
  if (!wordsData) {
    console.log('❌ 没有找到单词数据');
    return;
  }

  let words = JSON.parse(wordsData);
  console.log(`📚 当前有 ${words.length} 个单词`);

  // 中文释义库（常用词）
  const chineseDict = {
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
    'good': {
      partOfSpeech: '形容词',
      definition: '好的；优秀的',
      example: 'You are a good student.',
      exampleTranslation: '你是个好学生。'
    },
    'time': {
      partOfSpeech: '名词',
      definition: '时间',
      example: 'What time is it?',
      exampleTranslation: '现在几点了？'
    },
    'friend': {
      partOfSpeech: '名词',
      definition: '朋友',
      example: 'She is my best friend.',
      exampleTranslation: '她是我最好的朋友。'
    },
    'school': {
      partOfSpeech: '名词',
      definition: '学校',
      example: 'I go to school every day.',
      exampleTranslation: '我每天去上学。'
    },
    'teacher': {
      partOfSpeech: '名词',
      definition: '老师',
      example: 'Our teacher is very kind.',
      exampleTranslation: '我们的老师很和蔼。'
    },
    'student': {
      partOfSpeech: '名词',
      definition: '学生',
      example: 'Every student should study hard.',
      exampleTranslation: '每个学生都应该努力学习。'
    },
    'family': {
      partOfSpeech: '名词',
      definition: '家庭；家人',
      example: 'I love my family.',
      exampleTranslation: '我爱我的家人。'
    },
    'house': {
      partOfSpeech: '名词',
      definition: '房子；住宅',
      example: 'This is my house.',
      exampleTranslation: '这是我的房子。'
    },
    'car': {
      partOfSpeech: '名词',
      definition: '汽车；车',
      example: 'My father has a new car.',
      exampleTranslation: '我爸爸有一辆新车。'
    },
    'food': {
      partOfSpeech: '名词',
      definition: '食物',
      example: 'Chinese food is delicious.',
      exampleTranslation: '中国菜很好吃。'
    },
    'water': {
      partOfSpeech: '名词',
      definition: '水',
      example: 'Please give me a glass of water.',
      exampleTranslation: '请给我一杯水。'
    }
  };

  let updatedCount = 0;
  let notFound = [];

  // 遍历并更新
  words.forEach(word => {
    const wordLower = word.word.toLowerCase();
    const chineseDef = chineseDict[wordLower];

    if (chineseDef) {
      // 更新为中文释义
      word.definitions = [{
        partOfSpeech: chineseDef.partOfSpeech,
        definition: chineseDef.definition,
        example: chineseDef.example,
        exampleTranslation: chineseDef.exampleTranslation
      }];
      updatedCount++;
      console.log(`✅ ${word.word} → ${chineseDef.definition}`);
    } else {
      notFound.push(word.word);
      console.log(`⚠️ ${word.word} → 未找到中文释义`);
    }
  });

  // 保存更新后的数据
  localStorage.setItem('wordlog_words', JSON.stringify(words));

  console.log('\n📊 修复结果:');
  console.log(`✅ 成功更新: ${updatedCount} 个`);
  console.log(`⚠️ 未找到释义: ${notFound.length} 个`, notFound);
  console.log('\n💡 提示: 刷新页面查看效果');

  // 如果有未找到的单词，提示用户
  if (notFound.length > 0) {
    console.log('\n💡 提示: 未找到释义的单词，请手动添加或在 background.js 中的 commonWords 字典中添加');
  }
})();
