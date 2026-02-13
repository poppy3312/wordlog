// 💊 WordLog → Google Sheets 一键同步
// 使用方法：在 WordLog 页面 (http://localhost:3001) 按 F12 打开控制台，粘贴这段代码并回车

(function() {
    console.log('🚀 开始同步 WordLog 数据到 Google Sheets...');
    
    // 读取数据
    const wordsData = localStorage.getItem('words');
    if (!wordsData) {
        console.error('❌ 未找到数据！请先在 WordLog 中添加单词。');
        return;
    }
    
    const words = JSON.parse(wordsData);
    console.log(`📊 找到 ${words.length} 个单词`);
    
    // 生成 TSV 格式（一个单词一行）
    let tsv = '单词\t音标\t词性\t释义\t例句\t例句翻译\t掌握程度\t添加时间\t来源\t关键词\n';
    
    words.forEach(word => {
        const definitions = word.definitions || [];
        
        // 合并所有词性（用 ; 分隔）
        const allPartOfSpeech = definitions.map(d => d.partOfSpeech).filter(Boolean).join('; ');
        // 合并所有释义（用 ; 分隔）
        const allDefinitions = definitions.map(d => d.definition).filter(Boolean).join('; ');
        // 合并所有例句（用 | 分隔）
        const allExamples = definitions.map(d => d.example).filter(Boolean).join(' | ');
        // 合并所有例句翻译（用 | 分隔）
        const allExampleTranslations = definitions.map(d => d.exampleTranslation).filter(Boolean).join(' | ');
        
        tsv += [
            word.word,
            word.pronunciation || '',
            allPartOfSpeech,
            allDefinitions,
            allExamples,
            allExampleTranslations,
            word.masteryLevel || '',
            new Date(word.createdAt).toLocaleString('zh-CN'),
            word.source || '',
            word.keyword || ''
        ].join('\t') + '\n';
    });
    
    console.log(`✅ 生成了 ${words.length} 行数据`);
    
    // 复制到剪贴板
    navigator.clipboard.writeText(tsv).then(() => {
        console.log('✅ 数据已复制到剪贴板！');
        console.log('📋 即将打开 Google Sheets...');
        console.log('👉 在表格中点击单元格 A1，然后按 Cmd+V (Mac) 或 Ctrl+V (Windows) 粘贴');
        
        // 打开 Google Sheets
        setTimeout(() => {
            window.open('https://docs.google.com/spreadsheets/d/1wKe_Nk45L7XrPmv9SGwtYB7PzILFINxhQTtWjTRfWDE/edit?usp=sharing', '_blank');
        }, 1000);
    }).catch(err => {
        console.error('❌ 复制失败:', err);
        console.log('💡 请手动复制下面的数据：\n');
        console.log(tsv);
    });
})();
