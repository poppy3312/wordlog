// 检查 localStorage 中的单词数据
const words = JSON.parse(localStorage.getItem('wordlog_words') || '[]');

// 查找所有 butt 相关的单词
const buttWords = words.filter(w => w.wordLower === 'butt' || w.word.toLowerCase().includes('butt'));

console.log('=== 所有包含 butt 的单词 ===');
buttWords.forEach((w, i) => {
  console.log(`\n${i + 1}. ID: ${w.id}`);
  console.log(`   单词: ${w.word}`);
  console.log(`   wordLower: ${w.wordLower}`);
  console.log(`   创建时间: ${new Date(w.createdAt).toLocaleString('zh-CN')}`);
  console.log(`   释义: ${w.definitions?.[0]?.definition || '无'}`);
});

// 查找所有重复的单词
const wordCount = {};
words.forEach(w => {
  const key = w.wordLower;
  if (!wordCount[key]) {
    wordCount[key] = [];
  }
  wordCount[key].push(w);
});

console.log('\n\n=== 所有重复的单词 ===');
Object.entries(wordCount)
  .filter(([key, list]) => list.length > 1)
  .forEach(([key, list]) => {
    console.log(`\n"${key}" 出现 ${list.length} 次:`);
    list.forEach((w, i) => {
      console.log(`  ${i + 1}. ID: ${w.id}, 创建于: ${new Date(w.createdAt).toLocaleString('zh-CN')}`);
    });
  });

console.log(`\n总单词数: ${words.length}`);
console.log(`去重后的单词数: ${Object.keys(wordCount).length}`);
