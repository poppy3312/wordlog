// 检查 localStorage 数据
const data = localStorage.getItem('wordlog_words');
if (data) {
  const words = JSON.parse(data);
  console.log('=== 存储的单词数据 ===');
  words.slice(0, 5).forEach((w, i) => {
    console.log(`\n单词 ${i + 1}: ${w.word}`);
    console.log('wordLower:', w.wordLower);
    console.log('source:', w.source);
    console.log('pronunciation:', w.pronunciation);
    console.log('definitions:', w.definitions ? JSON.stringify(w.definitions, null, 2) : 'NO DEFINITIONS');
  });
} else {
  console.log('没有找到数据');
}
