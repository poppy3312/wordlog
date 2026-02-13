// WordLog 单词释义修复脚本 - 修复现有4个单词
// 在 WordLog 网页版 (localhost:3001) 的浏览器控制台中运行此脚本

(async function fixExistingWords() {
  console.log('🔧 开始修复现有单词的释义...');

  // 读取当前存储的单词
  const result = await chrome.storage.local.get(['words']);
  let words = result.words || [];

  if (words.length === 0) {
    console.log('❌ 没有找到单词数据');
    return;
  }

  console.log(`📚 找到 ${words.length} 个单词`);

  // 4个单词的正确中文释义
  const correctDefinitions = {
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
    }
  };

  let updatedCount = 0;

  // 更新单词释义
  for (const word of words) {
    const wordLower = word.word.toLowerCase();
    const correctDef = correctDefinitions[wordLower];

    if (correctDef) {
      // 检查当前释义是否是占位符
      const currentDef = word.definitions && word.definitions[0];
      const needsUpdate = !currentDef ||
        currentDef.definition === '测试释义' ||
        currentDef.definition === '释义暂不可用，可稍后手动补充' ||
        currentDef.example === 'Test example';

      if (needsUpdate) {
        // 更新为正确的中文释义
        word.definitions = [{
          partOfSpeech: correctDef.partOfSpeech,
          definition: correctDef.definition,
          example: correctDef.example,
          exampleTranslation: correctDef.exampleTranslation
        }];

        // 更新发音
        if (!word.pronunciation) {
          word.pronunciation = `/${word.word}/`;
        }

        updatedCount++;
        console.log(`✅ 已更新: ${word.word}`);
      } else {
        console.log(`ℹ️ ${word.word} 已是正确释义，跳过`);
      }
    }
  }

  // 保存更新后的数据
  if (updatedCount > 0) {
    await chrome.storage.local.set({ words: words });

    // 同时更新 localStorage (用于网页版)
    localStorage.setItem('wordlog_words', JSON.stringify(words));

    console.log(`\n🎉 成功更新了 ${updatedCount} 个单词的释义！`);
    console.log('📝 请刷新 WordLog 网页查看效果');
  } else {
    console.log('ℹ️ 没有需要更新的单词，或所有单词都已经是正确释义');
  }

  // 显示当前单词列表
  console.log('\n📋 当前单词列表:');
  words.forEach((w, i) => {
    const def = w.definitions && w.definitions[0];
    console.log(`${i + 1}. ${w.word}`);
    console.log(`   词性: ${def ? def.partOfSpeech : '无'}`);
    console.log(`   释义: ${def ? def.definition : '无'}`);
    console.log(`   例句: ${def ? def.example : '无'}`);
    console.log(`   译文: ${def && def.exampleTranslation ? def.exampleTranslation : '无'}`);
  });
})();
