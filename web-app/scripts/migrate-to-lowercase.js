/**
 * 数据迁移脚本：将所有已存储的单词转换为小写
 *
 * 使用方法：
 * 1. 在浏览器中打开 WordLog 网页版
 * 2. 打开浏览器开发者工具（F12）
 * 3. 切换到 Console 标签
 * 4. 复制此脚本内容并粘贴到控制台
 * 5. 按回车执行
 */

(async function migrateToLowercase() {
  console.log('🔄 开始迁移单词到小写格式...');

  try {
    // 从 Chrome Storage 或 localStorage 读取数据
    let words = [];

    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Chrome 环境
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['words'], resolve);
      });

      words = result.words || [];
      console.log(`📦 从 Chrome Storage 读取到 ${words.length} 个单词`);
    } else {
      // localStorage 环境
      const saved = localStorage.getItem('wordlog_words');
      if (saved) {
        words = JSON.parse(saved);
        console.log(`📦 从 localStorage 读取到 ${words.length} 个单词`);
      }
    }

    if (words.length === 0) {
      console.log('⚠️ 没有找到需要迁移的单词');
      return;
    }

    // 统计需要修改的单词
    let modifiedCount = 0;
    const modifiedWords = [];

    // 遍历并转换
    const migratedWords = words.map(word => {
      const lowercaseWord = word.word.toLowerCase();
      const needsUpdate = word.word !== lowercaseWord || word.wordLower !== lowercaseWord;

      if (needsUpdate) {
        modifiedCount++;
        modifiedWords.push({
          original: word.word,
          migrated: lowercaseWord
        });

        return {
          ...word,
          word: lowercaseWord,
          wordLower: lowercaseWord,
          updatedAt: Date.now()
        };
      }

      return word;
    });

    if (modifiedCount === 0) {
      console.log('✅ 所有单词已经是小写格式，无需迁移');
      return;
    }

    console.log(`📝 需要修改 ${modifiedCount} 个单词：`);
    modifiedWords.forEach(({ original, migrated }) => {
      console.log(`   "${original}" → "${migrated}"`);
    });

    // 保存回存储
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Chrome 环境
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(
          {
            words: migratedWords,
            wordSet: migratedWords.map(w => w.wordLower)
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          }
        );
      });
      console.log('💾 已保存到 Chrome Storage');
    } else {
      // localStorage 环境
      localStorage.setItem('wordlog_words', JSON.stringify(migratedWords));
      console.log('💾 已保存到 localStorage');
    }

    console.log(`✅ 迁移完成！已将 ${modifiedCount} 个单词转换为小写`);
    console.log('🔄 请刷新页面查看效果');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
  }
})();
