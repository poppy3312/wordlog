// 单词词典 API 服务
// 优先使用中文释义，备用英文释义

// import { generateWordImage } from './imageAPI.js';  // 暂时禁用自动生图

// ========== 根据释义匹配Emoji表情 ==========

/**
 * 从释义中提取中文关键词（用于fallback显示）
 */
export function extractKeywordFromDefinition(definition) {
  if (!definition) return '';

  // 提取2-6个连续的中文字符作为关键词
  const chineseWordMatch = definition.match(/[\u4e00-\u9fa5]{2,6}/);
  if (chineseWordMatch) {
    return chineseWordMatch[0];
  }

  return '';
}

/**
 * 根据释义关键词匹配Emoji表情
 */
export function getEmojiFromDefinition(definition) {
  if (!definition) return null;

  const defLower = definition.toLowerCase();

  // 方向/移动类
  if (defLower.match(/前进|向前|继续|proceed|go on|move forward|advance|继续/)) return '➡️';
  if (defLower.match(/后退|返回|back|return|go back/)) return '⬅️';
  if (defLower.match(/向上|上升|增加|growth|increase|rise|grow/)) return '⬆️';
  if (defLower.match(/向下|下降|减少|decrease|fall|drop/)) return '⬇️';

  // 思考/理解类
  if (defLower.match(/思考|理解|想法|认为|think|understand|believe|idea|mind|考虑/)) return '💡';
  if (defLower.match(/学习|study|learn|knowledge|教育|培训/)) return '📚';
  if (defLower.match(/问题|question|problem|ask|疑问/)) return '❓';
  if (defLower.match(/答案|answer|solution/)) return '💬';

  // 时间类
  if (defLower.match(/时间|今天|明天|昨天|time|today|day|date/)) return '🕐';
  if (defLower.match(/等待|wait|delay|等待/)) return '⏳';
  if (defLower.match(/快速|快|fast|quick|speed/)) return '⚡';
  if (defLower.match(/慢|slow/)) return '🐌';

  // 情感/关系类
  if (defLower.match(/爱|喜欢|喜爱|love|like|heart/)) return '❤️';
  if (defLower.match(/快乐|开心|高兴|happy|joy|smile|笑/)) return '😊';
  if (defLower.match(/悲伤|难过|sad|cry|哭/)) return '😢';
  if (defLower.match(/愤怒|生气|angry|mad/)) return '😠';
  if (defLower.match(/惊讶|惊讶|surprise|惊讶/)) return '😲';
  if (defLower.match(/害怕|恐惧|fear|scared/)) return '😨';

  // 交流/语言类
  if (defLower.match(/说|讲|说话|speak|talk|say|tell/)) return '🗣️';
  if (defLower.match(/写|书写|记录|write|record|note/)) return '📝';
  if (defLower.match(/读|阅读|read|book/)) return '📖';
  if (defLower.match(/听|hear|listen|sound/)) return '👂';
  if (defLower.match(/看|看见|look|see|view|watch|eye/)) return '👁️';
  if (defLower.match(/消息|message|信息|info/)) return '💬';

  // 动作类
  if (defLower.match(/做|做|制造|make|do|create|build|工作/)) return '🔨';
  if (defLower.match(/运行|run|walk|move|运动/)) return '🏃';
  if (defLower.match(/停止|stop|halt/)) return '🛑';
  if (defLower.match(/开始|start|begin/)) return '▶️';
  if (defLower.match(/结束|end|finish/)) return '⏹️';

  // 学习/教育类
  if (defLower.match(/学校|school|学校/)) return '🏫';
  if (defLower.match(/老师|teacher|老师/)) return '👨‍🏫';
  if (defLower.match(/学生|student|学生/)) return '👨‍🎓';
  if (defLower.match(/考试|exam|test|考试/)) return '📝';
  if (defLower.match(/成绩|grade|score/)) return '📊';

  // 物品类
  if (defLower.match(/书|book|书籍/)) return '📕';
  if (defLower.match(/笔|pen|pencil|笔/)) return '✏️';
  if (defLower.match(/电脑|computer|电脑/)) return '💻';
  if (defLower.match(/手机|phone|电话/)) return '📱';
  if (defLower.match(/房子|house|home|家/)) return '🏠';
  if (defLower.match(/车|car|车辆/)) return '🚗';

  // 自然类
  if (defLower.match(/太阳|sun|太阳/)) return '☀️';
  if (defLower.match(/月亮|moon|月亮/)) return '🌙';
  if (defLower.match(/星星|star|星星/)) return '⭐';
  if (defLower.match(/雨|rain|下雨/)) return '🌧️';
  if (defLower.match(/雪|snow|下雪/)) return '❄️';
  if (defLower.match(/火|fire|火/)) return '🔥';
  if (defLower.match(/水|water|水/)) return '💧';

  // 食物类
  if (defLower.match(/苹果|apple/)) return '🍎';
  if (defLower.match(/香蕉|banana/)) return '🍌';
  if (defLower.match(/面包|bread|面包/)) return '🍞';
  if (defLower.match(/咖啡|coffee/)) return '☕';
  if (defLower.match(/茶|tea/)) return '🍵';

  // 状态类
  if (defLower.match(/好的|好|正确|对|good|right|correct|yes|是/)) return '✅';
  if (defLower.match(/坏的|错|错误|bad|wrong|error|no|否/)) return '❌';
  if (defLower.match(/成功|success|成功/)) return '🎉';
  if (defLower.match(/失败|fail|失败/)) return '😞';

  // 数据/信息类
  if (defLower.match(/数据|data|信息|information/)) return '📊';
  if (defLower.match(/设置|setting|config|配置/)) return '⚙️';
  if (defLower.match(/搜索|search|find|查找/)) return '🔍';
  if (defLower.match(/链接|link|链接/)) return '🔗';

  // 安全/保护类
  if (defLower.match(/安全|safe|安全|保护|protect/)) return '🛡️';
  if (defLower.match(/警告|danger|warning|警告/)) return '⚠️';
  if (defLower.match(/锁|lock|锁/)) return '🔒';
  if (defLower.match(/钥匙|key|钥匙/)) return '🔑';

  // 交通类
  if (defLower.match(/飞机|plane|airplane/)) return '✈️';
  if (defLower.match(/火车|train|火车/)) return '🚆';
  if (defLower.match(/船|ship|boat|船/)) return '🚢';
  if (defLower.match(/自行车|bike|bicycle/)) return '🚲';

  // 工具类
  if (defLower.match(/工具|tool|工具/)) return '🔧';
  if (defLower.match(/剪刀|scissors/)) return '✂️';
  if (defLower.match(/尺子|ruler/)) return '📏';

  // 购物/商业类
  if (defLower.match(/钱|money|钱|价格|price/)) return '💰';
  if (defLower.match(/购物|shop|shopping|买/)) return '🛒';
  if (defLower.match(/购物车|cart|车/)) return '🛒';
  if (defLower.match(/礼物|gift|礼物/)) return '🎁';

  // 运动类
  if (defLower.match(/球|ball|球/)) return '⚽';
  if (defLower.match(/足球|football|soccer/)) return '⚽';
  if (defLower.match(/篮球|basketball/)) return '🏀';
  if (defLower.match(/游泳|swim|游泳/)) return '🏊';
  if (defLower.match(/跑步|run|跑步/)) return '🏃';

  // 天气类
  if (defLower.match(/晴天|sunny|晴/)) return '☀️';
  if (defLower.match(/多云|cloudy|多云/)) return '⛅';
  if (defLower.match(/阴天|overcast/)) return '☁️';

  // 医疗类
  if (defLower.match(/医院|hospital|医院/)) return '🏥';
  if (defLower.match(/药|medicine|药/)) return '💊';
  if (defLower.match(/医生|doctor|医生/)) return '👨‍⚕️';

  // 默认返回null，使用关键词显示
  return null;
}

// ========== 常见单词中文释义库 ==========
const CHINESE_DEFINITIONS = {
  // 原有单词
  'extension': {
    pronunciation: '/ɪkˈstenʃn/',
    partOfSpeech: '名词',
    definition: '扩展；延长；电话分机',
    example: 'I installed a new browser extension.',
    exampleTranslation: '我安装了一个新的浏览器扩展。'
  },
  'proceed': {
    pronunciation: '/prəˈsiːd/',
    partOfSpeech: '动词',
    definition: '继续进行；前进',
    example: 'Please proceed with your presentation.',
    exampleTranslation: '请继续你的演示。'
  },
  'beaming': {
    pronunciation: '/ˈbiːmɪŋ/',
    partOfSpeech: '形容词',
    definition: '微笑的；发光的；容光焕发',
    example: 'She was beaming with happiness.',
    exampleTranslation: '她开心地微笑着。'
  },
  'method': {
    pronunciation: '/ˈmeθəd/',
    partOfSpeech: '名词',
    definition: '方法；方式',
    example: 'This is a good method to learn English.',
    exampleTranslation: '这是一个学习英语的好方法。'
  },

  // 新增单词（用户截图中的单词）
  'philosophising': {
    pronunciation: '/fɪˈlɒsəfaɪzɪŋ/',
    partOfSpeech: '动词',
    definition: '进行哲学思考；哲学化',
    example: 'He is philosophising about the nature of reality.',
    exampleTranslation: '他正在思考现实的本质。'
  },
  'sprouting': {
    pronunciation: '/ˈspraʊtɪŋ/',
    partOfSpeech: '动词',
    definition: '发芽；长出；萌芽',
    example: 'The seeds are sprouting early this year.',
    exampleTranslation: '种子今年发芽很早。'
  },
  'crunched': {
    pronunciation: '/krʌntʃt/',
    partOfSpeech: '动词',
    definition: '压碎；嘎吱作响地咀嚼；挤压',
    example: 'She crunched the numbers in her head.',
    exampleTranslation: '她在脑海中盘算着这些数字。'
  },
  'bloating': {
    pronunciation: '/ˈbləʊtɪŋ/',
    partOfSpeech: '动词',
    definition: '膨胀；肿胀；浮夸',
    example: 'The bloated corpse floated on the river.',
    exampleTranslation: '肿胀的尸体漂浮在河面上。'
  },
  'tempering': {
    pronunciation: '/ˈtempərɪŋ/',
    partOfSpeech: '名词/动词',
    definition: '回火；淬炼；调节；锻炼',
    example: 'The tempering of steel requires skill.',
    exampleTranslation: '钢材的回火处理需要技巧。'
  },
  'twisting': {
    pronunciation: '/ˈtwɪstɪŋ/',
    partOfSpeech: '动词/名词',
    definition: '扭曲；转动；捻',
    example: 'She was twisting her hair nervously.',
    exampleTranslation: '她紧张地卷着头发。'
  },

  // 更多常见单词（保持原有）
  'log': {
    pronunciation: '/lɔːɡ/',
    partOfSpeech: '名词/动词',
    definition: '日志；记录；原木',
    example: 'Check the server logs.',
    exampleTranslation: '检查服务器日志。'
  },
  'get': {
    pronunciation: '/ɡet/',
    partOfSpeech: '动词',
    definition: '获得；得到；变成',
    example: 'I get a new book.',
    exampleTranslation: '我得到一本新书。'
  },
  'have': {
    pronunciation: '/hæv/',
    partOfSpeech: '动词',
    definition: '有；拥有；吃',
    example: 'I have a cat.',
    exampleTranslation: '我有一只猫。'
  },
  'hello': {
    pronunciation: '/həˈləʊ/',
    partOfSpeech: '感叹词',
    definition: '你好；问候',
    example: 'Hello, how are you?',
    exampleTranslation: '你好，你好吗？'
  },
  'world': {
    pronunciation: '/wɜːld/',
    partOfSpeech: '名词',
    definition: '世界；地球',
    example: 'The world is beautiful.',
    exampleTranslation: '这个世界很美丽。'
  },
  'test': {
    pronunciation: '/test/',
    partOfSpeech: '名词/动词',
    definition: '测试；考试',
    example: 'This is a test.',
    exampleTranslation: '这是一个测试。'
  },
  'apple': {
    pronunciation: '/ˈæpl/',
    partOfSpeech: '名词',
    definition: '苹果',
    example: 'I eat an apple every day.',
    exampleTranslation: '我每天吃一个苹果。'
  },
  'book': {
    pronunciation: '/bʊk/',
    partOfSpeech: '名词',
    definition: '书；书籍',
    example: 'This is a good book.',
    exampleTranslation: '这是一本好书。'
  },
  'love': {
    pronunciation: '/lʌv/',
    partOfSpeech: '动词/名词',
    definition: '爱；喜爱；热爱',
    example: 'I love my family.',
    exampleTranslation: '我爱我的家人。'
  },
  'happy': {
    pronunciation: '/ˈhæpi/',
    partOfSpeech: '形容词',
    definition: '快乐的；幸福的',
    example: 'I am very happy today.',
    exampleTranslation: '我今天很开心。'
  },
  'sad': {
    pronunciation: '/sæd/',
    partOfSpeech: '形容词',
    definition: '悲伤的；难过的',
    example: 'She looks sad.',
    exampleTranslation: '她看起来很伤心。'
  },
  'good': {
    pronunciation: '/ɡʊd/',
    partOfSpeech: '形容词',
    definition: '好的；优秀的',
    example: 'This is a good idea.',
    exampleTranslation: '这是一个好主意。'
  },
  'bad': {
    pronunciation: '/bæd/',
    partOfSpeech: '形容词',
    definition: '坏的；糟糕的',
    example: 'That was a bad mistake.',
    exampleTranslation: '那是一个糟糕的错误。'
  },
  'big': {
    pronunciation: '/bɪɡ/',
    partOfSpeech: '形容词',
    definition: '大的；巨大的',
    example: 'It\'s a big city.',
    exampleTranslation: '这是一个大城市。'
  },
  'small': {
    pronunciation: '/smɔːl/',
    partOfSpeech: '形容词',
    definition: '小的；小型的',
    example: 'The room is very small.',
    exampleTranslation: '这个房间很小。'
  },
  'run': {
    pronunciation: '/rʌn/',
    partOfSpeech: '动词',
    definition: '跑；奔跑；运行',
    example: 'I run every morning.',
    exampleTranslation: '我每天早上跑步。'
  },
  'walk': {
    pronunciation: '/wɔːk/',
    partOfSpeech: '动词',
    definition: '走；步行',
    example: 'Let\'s go for a walk.',
    exampleTranslation: '我们去散步吧。'
  },
  'eat': {
    pronunciation: '/iːt/',
    partOfSpeech: '动词',
    definition: '吃；进食',
    example: 'What do you want to eat?',
    exampleTranslation: '你想吃什么？'
  },
  'drink': {
    pronunciation: '/drɪŋk/',
    partOfSpeech: '动词',
    definition: '喝；饮',
    example: 'Would you like something to drink?',
    exampleTranslation: '你想喝点什么？'
  },
  'see': {
    pronunciation: '/siː/',
    partOfSpeech: '动词',
    definition: '看见；看到；明白',
    example: 'I see what you mean.',
    exampleTranslation: '我明白你的意思了。'
  },
  'think': {
    pronunciation: '/θɪŋk/',
    partOfSpeech: '动词',
    definition: '想；认为；思考',
    example: 'I think you\'re right.',
    exampleTranslation: '我觉得你是对的。'
  },
  'make': {
    pronunciation: '/meɪk/',
    partOfSpeech: '动词',
    definition: '制作；使；做',
    example: 'I can make a cake.',
    exampleTranslation: '我会做蛋糕。'
  },
  'go': {
    pronunciation: '/ɡəʊ/',
    partOfSpeech: '动词',
    definition: '去；走；离开',
    example: 'Let\'s go home.',
    exampleTranslation: '我们回家吧。'
  },
  'come': {
    pronunciation: '/kʌm/',
    partOfSpeech: '动词',
    definition: '来；到来；到达',
    example: 'Please come here.',
    exampleTranslation: '请来这里。'
  },
  'time': {
    pronunciation: '/taɪm/',
    partOfSpeech: '名词',
    definition: '时间；时刻；时代',
    example: 'What time is it?',
    exampleTranslation: '现在几点了？'
  },
  'day': {
    pronunciation: '/deɪ/',
    partOfSpeech: '名词',
    definition: '天；日；白天',
    example: 'Have a nice day!',
    exampleTranslation: '祝你愉快！'
  },
  'night': {
    pronunciation: '/naɪt/',
    partOfSpeech: '名词',
    definition: '夜；夜晚',
    example: 'Good night!',
    exampleTranslation: '晚安！'
  },
  'morning': {
    pronunciation: '/ˈmɔːnɪŋ/',
    partOfSpeech: '名词',
    definition: '早晨；早上',
    example: 'Good morning!',
    exampleTranslation: '早上好！'
  },
  'learn': {
    pronunciation: '/lɜːn/',
    partOfSpeech: '动词',
    definition: '学习；得知',
    example: 'I want to learn English.',
    exampleTranslation: '我想学英语。'
  },
  'study': {
    pronunciation: '/ˈstʌdi/',
    partOfSpeech: '动词',
    definition: '学习；研究',
    example: 'I study English every day.',
    exampleTranslation: '我每天学英语。'
  },
  'know': {
    pronunciation: '/nəʊ/',
    partOfSpeech: '动词',
    definition: '知道；了解；认识',
    example: 'I know the answer.',
    exampleTranslation: '我知道答案。'
  },
  'understand': {
    pronunciation: '/ˌʌndəˈstænd/',
    partOfSpeech: '动词',
    definition: '理解；明白',
    example: 'Do you understand?',
    exampleTranslation: '你明白吗？'
  },
  'speak': {
    pronunciation: '/spiːk/',
    partOfSpeech: '动词',
    definition: '说；讲；说话',
    example: 'Can you speak English?',
    exampleTranslation: '你会说英语吗？'
  },
  'write': {
    pronunciation: '/raɪt/',
    partOfSpeech: '动词',
    definition: '写；书写；写作',
    example: 'Write your name here.',
    exampleTranslation: '在这里写下你的名字。'
  },
  'read': {
    pronunciation: '/riːd/',
    partOfSpeech: '动词',
    definition: '读；阅读；朗读',
    example: 'I like to read books.',
    exampleTranslation: '我喜欢读书。'
  },
  'work': {
    pronunciation: '/wɜːk/',
    partOfSpeech: '动词/名词',
    definition: '工作；劳动；作品',
    example: 'I work from home.',
    exampleTranslation: '我在家工作。'
  },
  'bloviating': {
    pronunciation: '/ˈbləviˌeɪtɪŋ/',
    partOfSpeech: '动词',
    definition: '夸夸其谈；说大话；浮夸',
    example: 'He kept bloviating about his achievements.',
    exampleTranslation: '他一直夸耀自己的成就。'
  }
};

/**
 * 获取单词的完整释义（包括音标、词性、中文释义、例句、配图）
 * @param {string} word - 要查询的英文单词
 * @returns {Promise<Object>} 单词数据对象
 */
export async function fetchWordDefinition(word) {
  const wordLower = word.toLowerCase();

  // 1. 优先使用内置的中文释义库（统一为 definitions 数组格式）
  if (CHINESE_DEFINITIONS[wordLower]) {
    const builtin = CHINESE_DEFINITIONS[wordLower];

    return {
      word: word,
      wordLower: wordLower,
      pronunciation: builtin.pronunciation,
      audioUrl: '', // 内置库没有真实音频，留空使用 TTS
      imageUrl: '', // 配图由用户手动导入
      definitions: [{
        partOfSpeech: builtin.partOfSpeech,
        definition: builtin.definition,
        example: builtin.example,
        exampleTranslation: builtin.exampleTranslation
      }],
      source: 'builtin'
    };
  }

  // 2. 优先走服务端查词（Key 在服务端，用户无需配置）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const apiRes = await fetch(
      `/api/definition?word=${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.definitions && data.definitions.length > 0) {
        return {
          word: data.word || word,
          wordLower: (data.wordLower || word).toLowerCase(),
          pronunciation: data.pronunciation || `/${word}/`,
          audioUrl: data.audioUrl || '',
          imageUrl: data.imageUrl || '',
          definitions: data.definitions,
          source: data.source || 'server'
        };
      }
    }
  } catch (error) {
    console.log('服务端查词未可用或超时，使用备用方案:', error.message);
  }

  // 3. 尝试从英文API获取（直接用英文释义）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return await parseDictionaryAPI(data, word);
      }
    }
  } catch (error) {
    console.error('英文API查询失败:', error);
  }

  // 4. 失败时返回占位符
  return getPlaceholderWord(word);
}

/**
 * 将英文释义翻译为中文（使用 GLM-4.7 翻译）
 * @param {Array} data - Free Dictionary API 返回的数据
 * @param {string} word - 单词
 * @returns {Promise<Object>} 翻译后的单词对象
 */
async function translateToChinese(data, word) {
  const entry = data[0];

  // 提取音标
  let pronunciation = '';
  const phoneticText = entry.phonetic ||
                       entry.phonetics?.find(p => p.text)?.text ||
                       entry.phonetics?.find(p => p.audio)?.text ||
                       '';

  if (phoneticText) {
    pronunciation = phoneticText;
  } else {
    pronunciation = `/${word}/`;
  }

  // 提取真实音频 URL（优先使用 UK 或 US 音频）
  let audioUrl = '';
  const phoneticWithAudio = entry.phonetics?.find(p => p.audio && p.audio.length > 0);
  if (phoneticWithAudio) {
    audioUrl = phoneticWithAudio.audio;
  }

  // 提取英文释义（按常用程度排序，每种词性最多取3个释义）
  const englishDefinitions = [];
  for (const meaning of entry.meanings || []) {
    const partOfSpeech = translatePartOfSpeech(meaning.partOfSpeech);
    // 取前3个释义（最常用的在前），用于详情页展示
    for (const def of meaning.definitions.slice(0, 3)) {
      englishDefinitions.push({
        partOfSpeech: partOfSpeech,
        definition: def.definition,
        example: def.example || ''
      });
    }
  }

  // 使用 GLM-4.7 翻译
  const chineseDefinitions = await translateWithGLM(englishDefinitions, word);

  // 如果翻译失败，返回占位符
  if (!chineseDefinitions || chineseDefinitions.length === 0) {
    return {
      word: word,
      wordLower: word.toLowerCase(),
      pronunciation: pronunciation,
      audioUrl: audioUrl,
      definitions: [{
        partOfSpeech: '未知',
        definition: '释义查询中，可稍后刷新或手动添加',
        example: '',
        exampleTranslation: ''
      }],
      source: 'api-english-only'
    };
  }

  return {
    word: word,
    wordLower: word.toLowerCase(),
    pronunciation: pronunciation,
    audioUrl: audioUrl,
    imageUrl: '', // 配图由用户手动导入
    definitions: chineseDefinitions,
    source: 'glm-translated'
  };
}

/**
 * 使用 GLM-4.7 API 翻译英文释义
 * @param {Array} definitions - 英文释义数组
 * @param {string} word - 单词（用于上下文）
 * @returns {Promise<Array>} 翻译后的释义数组
 */
async function translateWithGLM(definitions, word) {
  try {
    // 从 localStorage 读取 API Key
    const configStr = localStorage.getItem('wordlog_config');
    if (!configStr) {
      console.warn('未配置 GLM API Key，使用降级翻译');
      return fallbackTranslate(definitions);
    }

    const config = JSON.parse(configStr);
    const apiKey = config.glmApiKey;

    if (!apiKey) {
      console.warn('GLM API Key 为空，使用降级翻译');
      return fallbackTranslate(definitions);
    }

    // 构建翻译提示词
    const systemPrompt = `You are a professional translator and an EdTech Product Manager.

Translate content into fluent Chinese. For web novels (BG/Romance), ensure the tone is elegant and vivid.

For professional documents, keep terms like PTE, IGCSE, A-Level in English and provide precise definitions in brackets.

Avoid literal translation; focus on natural phrasing that suits a native speaker.

Do not output anything other than the translated text.`;

    const userPrompt = `请将以下英文单词的释义翻译成简洁准确的中文，格式要求：
1. 只返回翻译结果，不要解释
2. 保持原有顺序，第一个释义是最常用的
3. 多个义项用分号；分隔
4. 例句也要翻译

单词：${word}

${definitions.map((def, i) => `
${i + 1}. [${def.partOfSpeech}] ${def.definition}
${def.example ? `例句：${def.example}` : ''}
`).join('\n')}

注意：第一个释义是该单词最常用的含义，请确保排在第一位。

翻译格式（严格按此格式返回）：
[词性] 中文释义；其他释义
例句翻译`;

    // 调用 GLM-4.7 API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('GLM API 调用失败:', response.status);
      return fallbackTranslate(definitions);
    }

    const result = await response.json();
    const translatedText = result.choices[0].message.content;

    // 解析翻译结果
    return parseGLMTranslation(translatedText, definitions);

  } catch (error) {
    console.error('GLM 翻译失败:', error);
    return fallbackTranslate(definitions);
  }
}

/**
 * 解析 GLM 翻译结果
 * @param {string} text - GLM 返回的翻译文本
 * @param {Array} originalDefs - 原始英文释义
 * @returns {Array} 解析后的释义数组
 */
function parseGLMTranslation(text, originalDefs) {
  const results = [];
  const lines = text.split('\n').filter(l => l.trim());

  let currentDef = null;
  let defIndex = 0;

  for (const line of lines) {
    // 匹配词性：[动词]、[名词] 等
    const posMatch = line.match(/\[(.+?)\]\s*(.+)/);
    if (posMatch) {
      // 保存上一个定义
      if (currentDef) {
        results.push(currentDef);
        defIndex++;
      }

      // 使用原始英文释义中的 example（保留英文例句）
      const originalExample = originalDefs[defIndex]?.example || '';
      currentDef = {
        partOfSpeech: posMatch[1].trim(),
        definition: posMatch[2].trim(),
        example: originalExample,  // 保留原始英文例句
        exampleTranslation: ''     // 等待解析中文翻译
      };
    } else if (line.includes('例句')) {
      if (currentDef) {
        const parts = line.split(/例句[：:]\s*/);
        if (parts.length > 1) {
          // GLM 返回的是翻译后的中文例句，应该放在 exampleTranslation
          currentDef.exampleTranslation = parts[1].trim();
        }
      }
    } else if (line.includes('译文') || line.includes('翻译')) {
      if (currentDef) {
        const parts = line.split(/[：:]\s*/);
        if (parts.length > 1) {
          currentDef.exampleTranslation = parts[1].trim();
        }
      }
    } else if (currentDef && !line.match(/^\[.*\]/)) {
      // 如果不是词性行，可能是释义的延续内容
      // 忽略这些行，避免解析错误
    }
  }

  // 保存最后一个定义
  if (currentDef) {
    results.push(currentDef);
  }

  // 验证解析结果：每个定义必须有词性和释义
  const validResults = results.filter(def => {
    return def.partOfSpeech &&
           def.definition &&
           def.partOfSpeech !== '未知' &&
           def.definition.length > 0;
  });

  // 如果解析出有效结果，返回
  if (validResults.length > 0) {
    return validResults;
  }

  // 如果解析失败，返回占位符而不是错误的翻译
  return [{
    partOfSpeech: '未知',
    definition: '释义查询中，可稍后刷新或手动添加',
    example: '',
    exampleTranslation: ''
  }];
}

/**
 * 降级翻译（使用简单翻译）
 * @param {Array} definitions - 英文释义
 * @returns {Array} 翻译后的释义
 */
function fallbackTranslate(definitions) {
  return definitions.map(def => ({
    partOfSpeech: def.partOfSpeech,
    definition: simpleTranslate(def.definition),
    example: def.example,
    exampleTranslation: ''
  }));
}

/**
 * 简单的英文释义翻译（基础词汇映射）
 * @param {string} englishDef - 英文释义
 * @returns {string} 中文释义
 */
function simpleTranslate(englishDef) {
  // 扩展的词汇翻译映射
  const translations = {
    // 代词/冠词
    'a': '一个', 'an': '一个', 'the': '这个/那个',
    // 动词
    'is': '是', 'are': '是', 'was': '是', 'were': '是',
    'have': '有', 'has': '有', 'had': '有', 'having': '有',
    'can': '能够', 'could': '能够', 'will': '将', 'would': '会',
    'should': '应该', 'must': '必须', 'may': '可能',
    'make': '使', 'get': '得到', 'take': '拿', 'give': '给',
    'see': '看见', 'look': '看', 'find': '找到', 'watch': '观看',
    'use': '使用', 'help': '帮助', 'show': '展示', 'tell': '告诉',
    'want': '想要', 'need': '需要', 'like': '喜欢', 'love': '爱',
    'know': '知道', 'think': '认为', 'believe': '相信', 'understand': '理解',
    // 形容词
    'good': '好的', 'bad': '坏的', 'new': '新的', 'old': '旧的',
    'big': '大的', 'small': '小的', 'large': '巨大的', 'little': '小的',
    'high': '高的', 'low': '低的', 'long': '长的', 'short': '短的',
    'great': '伟大的', 'important': '重要的', 'different': '不同的',
    'same': '相同的', 'first': '第一', 'last': '最后', 'other': '其他的',
    'able': '能干的', 'available': '可用的', 'possible': '可能的',
    'real': '真实的', 'true': '真的', 'false': '假的',
    // 名词
    'people': '人', 'person': '人', 'thing': '事情', 'things': '事情',
    'way': '方式', 'ways': '方式', 'time': '时间', 'times': '时间',
    'state': '状态', 'states': '状态', 'place': '地方', 'places': '地方',
    'case': '情况', 'cases': '情况', 'part': '部分', 'parts': '部分',
    'problem': '问题', 'problems': '问题', 'question': '问题',
    'example': '例子', 'result': '结果', 'results': '结果',
    'kind': '种类', 'type': '类型', 'sort': '种类',
    'man': '男人', 'men': '男人们', 'woman': '女人', 'women': '女人们',
    'child': '孩子', 'children': '孩子们', 'person': '人', 'persons': '人们',
    'family': '家庭', 'friend': '朋友', 'friends': '朋友',
    'work': '工作', 'job': '工作', 'business': '生意',
    'school': '学校', 'home': '家', 'house': '房子',
    'world': '世界', 'life': '生活', 'hand': '手',
    'day': '天', 'night': '夜', 'week': '周', 'month': '月', 'year': '年',
    // 动词扩展
    'act': '行动', 'action': '行动', 'add': '添加', 'ask': '询问',
    'answer': '回答', 'call': '呼叫', 'change': '改变', 'check': '检查',
    'close': '关闭', 'open': '打开', 'create': '创造', 'describe': '描述',
    'develop': '发展', 'do': '做', 'does': '做', 'done': '做',
    'follow': '跟随', 'go': '去', 'goes': '去', 'went': '去', 'gone': '去',
    'happen': '发生', 'keep': '保持', 'keeps': '保持', 'lead': '领导',
    'leads': '领导', 'let': '让', 'live': '居住', 'lives': '居住',
    'move': '移动', 'moves': '移动', 'play': '玩', 'plays': '玩',
    'point': '指向', 'points': '指向', 'put': '放', 'puts': '放',
    'run': '跑', 'runs': '跑', 'ran': '跑', 'run': '跑',
    'say': '说', 'says': '说', 'said': '说',
    'start': '开始', 'starts': '开始', 'stop': '停止', 'stops': '停止',
    'talk': '谈话', 'talks': '谈话', 'tell': '告诉', 'tells': '告诉',
    'try': '尝试', 'tries': '尝试', 'turn': '转动', 'turns': '转动',
    'work': '工作', 'works': '工作', 'write': '写', 'writes': '写',
    // 介词/连词
    'in': '在...里面', 'on': '在...上面', 'at': '在',
    'to': '到', 'for': '为了', 'of': '的', 'with': '和...一起',
    'from': '来自', 'about': '关于', 'into': '进入',
    'through': '通过', 'during': '在...期间', 'under': '在...下面',
    'over': '在...上方', 'above': '在...之上', 'below': '在...之下',
    'between': '在...之间', 'among': '在...之中',
    'and': '和', 'or': '或者', 'but': '但是', 'because': '因为',
    'if': '如果', 'when': '当...时', 'while': '当...时',
    'before': '在...之前', 'after': '在...之后', 'since': '自从',
    // 常见短语
    'provide': '提供', 'refer': '指代', 'relate': '相关',
    'cause': '导致', 'characterize': '具有...特征',
    'consist': '组成', 'constitute': '构成', 'contain': '包含',
    'express': '表达', 'include': '包括', 'including': '包括',
    'involve': '涉及', 'mean': '意味着', 'means': '意味着',
    'produce': '产生', 'represent': '代表', 'seem': '似乎', 'tend': '倾向于',
    'become': '成为', 'becomes': '成为', 'remains': '保持',
    'allow': '允许', 'enable': '使能够', 'cause': '导致',
    'consider': '考虑', 'create': '创造', 'define': '定义',
    'describe': '描述', 'determine': '决定', 'ensure': '确保',
    'follow': '跟随', 'handle': '处理', 'identify': '识别',
    'improve': '改善', 'increase': '增加', 'indicate': '表明',
    'maintain': '维持', 'occur': '发生', 'appear': '出现',
    'achieve': '实现', 'acquire': '获得', 'adapt': '适应',
    'apply': '应用', 'approach': '接近', 'avoid': '避免',
    'believe': '相信', 'bring': '带来', 'build': '建造',
    'carry': '携带', 'catch': '抓住', 'cause': '导致',
    'choose': '选择', 'claim': '声称', 'clean': '清洁',
    'clear': '清除', 'collect': '收集', 'combine': '结合',
    'come': '来', 'comes': '来', 'compare': '比较',
    'decide': '决定', 'decline': '下降', 'describe': '描述',
    'desire': '渴望', 'destroy': '破坏', 'develop': '发展',
    'die': '死', 'draw': '画', 'drive': '驾驶', 'drop': '掉落',
    'earn': '赚取', 'eat': '吃', 'eat': '吃', 'fall': '落下',
    'feel': '感觉', 'feels': '感觉', 'fight': '战斗', 'fill': '填充',
    'find': '发现', 'fly': '飞', 'forget': '忘记', 'forgive': '原谅',
    'grow': '生长', 'grow': '长大', 'guess': '猜', 'hear': '听见',
    'hide': '隐藏', 'hold': '持有', 'hope': '希望', 'jump': '跳',
    'kill': '杀死', 'kiss': '亲吻', 'laugh': '笑', 'learn': '学习',
    'leave': '离开', 'lie': '躺', 'listen': '听', 'live': '居住',
    'lose': '丢失', 'lose': '输', 'love': '爱', 'meet': '遇见',
    'pay': '支付', 'pull': '拉', 'push': '推', 'read': '阅读',
    'rise': '上升', 'save': '保存', 'say': '说', 'sell': '卖',
    'send': '发送', 'sit': '坐', 'sleep': '睡觉', 'speak': '说',
    'stand': '站立', 'stay': '停留', 'swim': '游泳', 'teach': '教',
    'think': '思考', 'think': '想', 'throw': '扔', 'wait': '等待',
    'wake': '醒来', 'walk': '走', 'win': '赢', 'win': '赢',
    'wish': '希望', 'wonder': '想知道', 'worry': '担心',
    'write': '写', 'writes': '写'
  };

  // 尝试翻译简单句子
  let result = englishDef.toLowerCase();

  // 先替换单词
  for (const [en, zh] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    result = result.replace(regex, zh);
  }

  // 简单的句式调整
  result = result
    .replace(/to (\w+) /g, '去$1')  // to + 动词
    .replace(/(\w+) or (\w+) /g, '$1或$2')  // or
    .replace(/(\w+) and (\w+) /g, '$1和$2')  // and
    .replace(/(\w+) with (\w+) /g, '$1和$2一起')  // with
    .replace(/for (\w+) /g, '为了$1')  // for
    .replace(/of (\w+) /g, '$1的')  // of
    .replace(/in (\w+) /g, '在$1里')  // in
    .replace(/on (\w+) /g, '在$1上')  // on
    .replace(/at (\w+) /g, '在$1')  // at
    .replace(/from (\w+) /g, '来自$1')  // from
    .replace(/by (\w+) /g, '被$1')  // by
    .replace(/with (\w+) /g, '用$1')  // with
    .replace(/(\w+) (\w+) /g, '$1的$2');  // 名词修饰名词

  // 如果翻译结果和原文差不多（都是英文），返回提示
  const englishWordCount = (englishDef.match(/[a-zA-Z]+/g) || []).length;
  const resultWordCount = (result.match(/[a-zA-Z]+/g) || []).length;

  // 更严格的检查：如果超过30%还是英文，说明翻译失败
  if (resultWordCount > englishWordCount * 0.3) {
    // 还是有太多英文，返回占位符
    return `释义查询中，可稍后刷新或手动添加`;
  }

  return result;
}

/**
 * 解析 Free Dictionary API 的返回数据
 * @param {Array} data - API 返回的原始数据
 * @param {string} word - 单词
 * @returns {Object} 解析后的单词对象
 */
function parseDictionaryData(data, word) {
  const entry = data[0]; // 取第一条结果

  // 提取音标（优先使用 IPA 音标）
  let pronunciation = '';
  const phoneticText = entry.phonetic ||
                       entry.phonetics?.find(p => p.text)?.text ||
                       entry.phonetics?.find(p => p.audio)?.text ||
                       '';

  if (phoneticText) {
    pronunciation = phoneticText;
  } else {
    // 如果没有音标，生成一个占位符
    pronunciation = `/${word}/`;
  }

  // 提取真实音频 URL
  let audioUrl = '';
  const phoneticWithAudio = entry.phonetics?.find(p => p.audio && p.audio.length > 0);
  if (phoneticWithAudio) {
    audioUrl = phoneticWithAudio.audio;
  }

  // 提取释义和例句
  const definitions = [];

  for (const meaning of entry.meanings || []) {
    const partOfSpeech = translatePartOfSpeech(meaning.partOfSpeech);

    // 取前3个释义
    for (const def of meaning.definitions.slice(0, 3)) {
      definitions.push({
        partOfSpeech: partOfSpeech,
        definition: def.definition || '',
        example: def.example || '',
        exampleTranslation: '' // API 不提供中文翻译，留空
      });
    }
  }

  return {
    word: word,
    wordLower: word.toLowerCase(),
    pronunciation: pronunciation,
    audioUrl: audioUrl,
    imageUrl: '',
    definitions: definitions,
    source: 'dictionary-api'
  };
}

/**
 * 翻译词性为中文
 * @param {string} pos - 英文词性
 * @returns {string} 中文词性
 */
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

/**
 * 获取占位符单词数据（当API查询失败时使用）
 * @param {string} word - 单词
 * @returns {Object} 占位符单词对象
 */
function getPlaceholderWord(word) {
  return {
    word: word,
    wordLower: word.toLowerCase(),
    pronunciation: `/${word}/`,
    audioUrl: '',
    imageUrl: '',
    definitions: [{
      partOfSpeech: '未知',
      definition: '释义暂不可用，请稍后在设置中刷新释义',
      example: '',
      exampleTranslation: ''
    }],
    source: 'placeholder'
  };
}

/** 批量刷新时最大并发请求数，避免触发 API 限流 */
const BATCH_FETCH_CONCURRENCY = 3;

/**
 * 限流执行：最多 concurrency 个任务同时执行，保持结果顺序
 * @param {Array<() => Promise<any>>} tasks - 返回 Promise 的函数数组
 * @param {number} concurrency - 并发数
 * @returns {Promise<Array>} 与 tasks 同序的结果数组
 */
async function runWithConcurrency(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

/**
 * 批量获取单词释义（用于修复占位符数据），并发请求以缩短总耗时
 * @param {Array} words - 需要查询的单词数组
 * @returns {Promise<Array>} 更新后的单词数组
 */
export async function batchFetchDefinitions(words) {
  const processOne = (word) => async () => {
    const wordLower = (word.word || '').toLowerCase().trim();

    if (CHINESE_DEFINITIONS[wordLower]) {
      const builtin = CHINESE_DEFINITIONS[wordLower];
      return {
        ...word,
        word: word.word,
        wordLower: wordLower,
        pronunciation: builtin.pronunciation,
        audioUrl: '',
        imageUrl: word.imageUrl || '',
        definitions: [{
          partOfSpeech: builtin.partOfSpeech,
          definition: builtin.definition,
          example: builtin.example,
          exampleTranslation: builtin.exampleTranslation
        }],
        source: 'builtin',
        id: word.id,
        createdAt: word.createdAt,
        updatedAt: Date.now()
      };
    }

    const hasValidDef = word.definitions &&
                        word.definitions.length > 0 &&
                        word.definitions[0] &&
                        word.definitions[0].partOfSpeech &&
                        word.definitions[0].definition &&
                        word.definitions[0].definition !== '释义暂不可用，可稍后手动补充' &&
                        word.definitions[0].definition !== '测试释义' &&
                        word.definitions[0].definition !== '释义暂不可用，请稍后在设置中刷新释义' &&
                        word.definitions[0].definition !== '释义查询中，可稍后刷新或手动添加' &&
                        word.definitions[0].definition !== '未知' &&
                        word.definitions[0].example !== 'Test example' &&
                        !word.definitions[0].partOfSpeech.startsWith('unknown') &&
                        !word.definitions[0].partOfSpeech.match(/^[a-z]/) &&
                        !isMostlyEnglish(word.definitions[0].definition) &&
                        word.pronunciation &&
                        word.pronunciation !== `/${word.word}/`;

    if (hasValidDef && word.pronunciation) {
      return word;
    }

    try {
      const fetched = await fetchWordDefinition(word.word);
      const hasValidFetchedDef =
        fetched &&
        fetched.definitions &&
        fetched.definitions.length > 0 &&
        fetched.definitions[0].partOfSpeech &&
        fetched.definitions[0].definition &&
        fetched.definitions[0].partOfSpeech !== '未知' &&
        fetched.definitions[0].definition !== '释义查询中，可稍后刷新或手动添加' &&
        !isMostlyEnglish(fetched.definitions[0].definition);

      if (hasValidFetchedDef) {
        return {
          ...word,
          ...fetched,
          imageUrl: word.imageUrl || fetched.imageUrl || '',
          id: word.id,
          createdAt: word.createdAt,
          updatedAt: Date.now()
        };
      }
      console.log(`⚠️ ${word.word} 查询到的释义无效，保留原有释义`);
      return word;
    } catch (error) {
      console.error(`❌ ${word.word} 查询释义失败:`, error);
      return word;
    }
  };

  const tasks = words.map((word) => processOne(word));
  const results = await runWithConcurrency(tasks, BATCH_FETCH_CONCURRENCY);
  return results;
}

/**
 * 检查文本是否主要由英文组成
 * @param {string} text - 要检查的文本
 * @returns {boolean} 是否主要是英文
 */
function isMostlyEnglish(text) {
  if (!text || typeof text !== 'string') return false;

  // 移除所有标点符号和空格，只保留字母
  const cleanText = text.replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ');

  // 统计英文单词
  const words = cleanText.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return false;

  // 检查是否主要由英文字母组成
  let englishCharCount = 0;
  let totalCharCount = 0;

  words.forEach(word => {
    for (const char of word) {
      if (/[a-zA-Z]/.test(char)) {
        englishCharCount++;
      }
      totalCharCount++;
    }
  });

  // 如果超过60%的字符是英文字母，认为是英文
  return totalCharCount > 0 && (englishCharCount / totalCharCount) > 0.6;
}

/**
 * 检查释义是否包含英文定义
 * @param {string} definition - 释义文本
 * @returns {boolean} 是否包含英文定义
 */
function containsEnglishDefinition(definition) {
  if (!definition) return false;

  // 检查是否包含常见的英文定义句式
  const englishPatterns = [
    /\bto \w+\b/i,           // to + 动词
    /\b\w+ing\b/g,           // -ing 结尾的词
    /\b\w+s\b/g,             // -s 结尾的词
    /\b\w+ed\b/g,            // -ed 结尾的词
    /\bthat \w+\b/i,         // that + 词
    /\bwhich \w+\b/i,        // which + 词
    /\bfrom \w+\b/i,         // from + 词
    /\bwith \w+\b/i,         // with + 词
    /\bfor \w+\b/i,          // for + 词
    /\bby \w+\b/i,           // by + 词
    /\bof \w+\b/i,           // of + 词
    /\bin \w+\b/i,           // in + 词
    /\bon \w+\b/i,           // on + 词
    /\bat \w+\b/i,           // at + 词
  ];

  // 如果释义很短且是英文，很可能是英文定义
  if (definition.length < 100) {
    const englishWordCount = (definition.match(/[a-zA-Z]+/g) || []).length;
    const totalWords = definition.split(/\s+/).length;

    // 如果英文单词占比超过50%，认为是英文定义
    if (englishWordCount > totalWords * 0.5) {
      return true;
    }
  }

  return false;
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 直接解析 DictionaryAPI 的英文结果（不翻译）
 */
async function parseDictionaryAPI(data, word) {
  const entry = data[0];

  // 提取音标
  let pronunciation = '';
  const phoneticText = entry.phonetic ||
                       entry.phonetics?.find(p => p.text)?.text ||
                       entry.phonetics?.find(p => p.audio)?.text ||
                       '';
  if (phoneticText) {
    pronunciation = phoneticText;
  } else {
    pronunciation = `/${word}/`;
  }

  // 提取音频
  let audioUrl = '';
  const phoneticWithAudio = entry.phonetics?.find(p => p.audio && p.audio.length > 0);
  if (phoneticWithAudio) {
    audioUrl = phoneticWithAudio.audio;
  }

  // 解析释义
  const definitions = [];
  for (const meaning of entry.meanings || []) {
    const partOfSpeech = meaning.partOfSpeech;

    for (const def of meaning.definitions.slice(0, 3)) {
      definitions.push({
        partOfSpeech: partOfSpeech,
        definition: def.definition || '',
        example: def.example || '',
        exampleTranslation: '' // 不翻译例句
      });
    }

    if (definitions.length >= 3) break;
  }

  if (definitions.length === 0) {
    return getPlaceholderWord(word);
  }

  return {
    word: word,
    wordLower: word.toLowerCase(),
    pronunciation: pronunciation,
    audioUrl: audioUrl,
    imageUrl: '',
    definitions: definitions,
    source: 'dictionary-api'
  };
}

/**
 * 从 localStorage 读取 API 配置（与 config 页面一致）
 */
function getApiConfig() {
  try {
    const configStr = localStorage.getItem('wordlog_config');
    if (!configStr) return {};
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

/**
 * 使用 MiniMax API 获取中文释义（需在 config 中配置 minimaxApiKey）
 */
async function fetchFromMiniMax(word) {
  const config = getApiConfig();
  const apiKey = config.minimaxApiKey;
  if (!apiKey) {
    return null;
  }

  const API_ENDPOINT = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

  const userPrompt = `Provide the Chinese definition for the English word "${word}". Return ONLY a JSON object:
{"definitions":[{"partOfSpeech":"part of speech in Chinese","definition":"Chinese definition","example":"English example sentence","exampleTranslation":"Chinese translation"}]}
Only return JSON, nothing else.`;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides Chinese definitions for English words in JSON format.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.messages[0]?.text || '';

      // 提取 JSON
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*"definitions"[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.definitions && parsed.definitions.length > 0) {
          return {
            word: word,
            wordLower: word.toLowerCase(),
            pronunciation: `/${word}/`,
            audioUrl: '',
            imageUrl: '',
            definitions: parsed.definitions,
            source: 'minimax'
          };
        }
      } catch (e) {
        console.log('MiniMax JSON 解析失败:', e.message);
      }
    }

    return null;
  } catch (error) {
    console.log('MiniMax API 调用失败:', error.message);
    return null;
  }
}

/**
 * 使用 GLM-4 API 获取中文释义（需在 config 中配置 glmApiKey）
 */
async function fetchFromGLM(word) {
  const config = getApiConfig();
  const apiKey = config.glmApiKey;
  if (!apiKey) {
    return null;
  }

  const API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  const userPrompt = `Provide the Chinese definition for the English word "${word}". Return ONLY a JSON object:
{"definitions":[{"partOfSpeech":"part of speech in Chinese","definition":"Chinese definition","example":"English example sentence","exampleTranslation":"Chinese translation"}]}
Only return JSON, nothing else.`;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides Chinese definitions for English words in JSON format.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // 提取 JSON
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*"definitions"[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.definitions && parsed.definitions.length > 0) {
          console.log(`[GLM-4] 成功获取 "${word}" 的释义`);
          return {
            word: word,
            wordLower: word.toLowerCase(),
            pronunciation: `/${word}/`,
            audioUrl: '',
            imageUrl: '',
            definitions: parsed.definitions,
            source: 'glm-4'
          };
        }
      } catch (e) {
        console.log('[GLM-4] JSON 解析失败:', e.message);
      }
    } else {
      console.error('[GLM-4] API 错误:', response.status);
    }

    return null;
  } catch (error) {
    console.error('[GLM-4] 查询失败:', error.message);
    return null;
  }
}
