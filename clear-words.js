// 清空所有单词数据
// 在浏览器控制台运行

(async function clearAllWords() {
  await chrome.storage.local.clear();
  console.log('✅ 已清空所有单词数据');
  console.log('📝 请刷新 WordLog 网页');
})();
