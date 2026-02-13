// 单词配图生成服务 v2.0
// 优先使用 MiniMax 文生图（image-01），未配置时回退智谱 CogView
// 支持风格：REAL/CLAY/PENGUIN/INK/MINI/FLAT/RETRO 等

/** 智谱 CogView Key：仅在没有配置 MiniMax 时使用 */
const GLM_IMAGE_API_KEY = '8dac85c3e1764785b751b10f375b67de.cp2kBrj5Ua0JysG7';

function getImageApiConfig() {
  try {
    const raw = localStorage.getItem('wordlog_config');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * 风格推荐系统（基于v2.0风格系统）
 * 名词→CLAY；动词/形容词等→人物+辅助物品，更直观
 * @param {string} word - 单词
 * @param {string} partOfSpeech - 词性
 * @returns {string} 推荐的风格代码
 */
function recommendStyle(word, partOfSpeech) {
  const pos = (partOfSpeech || '').toLowerCase();

  // 名词 - 使用3D黏土风格（物体本身即可表达）
  if (pos.includes('名词') || pos.includes('noun')) {
    return 'CLAY';
  }

  // 动词 - 人物+道具表现动作，直观易懂
  if (pos.includes('动词') || pos.includes('verb')) {
    return 'PERSON_ACTION';
  }

  // 形容词 - 人物或场景+辅助物品体现含义
  if (pos.includes('形容词') || pos.includes('adjective') || pos.includes('adj')) {
    return 'PERSON_CONCEPT';
  }

  // 副词等 - 用人物+场景表现
  if (pos.includes('副词') || pos.includes('adverb')) {
    return 'PERSON_CONCEPT';
  }

  // 抽象概念 - 人物+象征物
  const abstractConcepts = ['freedom', 'love', 'peace', 'harmony', 'success', 'balance', 'serendipity', 'innovation', 'creativity', 'wisdom', 'hope', 'dream', 'courage', 'justice', 'truth'];
  if (abstractConcepts.includes(word.toLowerCase())) {
    return 'PERSON_CONCEPT';
  }

  // 默认：未知词性用人物+道具更稳妥
  return 'PERSON_CONCEPT';
}

/**
 * 生成配图提示词（基于v2.0风格系统）
 * @param {string} word - 单词
 * @param {string} style - 风格代码
 * @param {string} definition - 释义
 * @returns {string} 图片生成提示词
 */
function generateImagePrompt(word, style, definition) {
  const baseParams = ', 1:1 aspect ratio, centered, no text, no watermark, high quality';

  switch(style) {
    case 'REAL':
      return `Professional product photography of ${word}, ${definition || ''}, sharp focus, studio lighting, soft shadows, pure white background, 8k resolution${baseParams}`;

    case 'CLAY':
      return `${word} as a 3D claymation style figure, ${definition || ''}, plasticine clay texture, handmade clay art, soft matte finish, clay material with visible finger marks, cute character design, clean white background, studio lighting${baseParams}`;

    case 'FLAT':
      return `${word}, modern flat illustration style, vector art, vibrant colors, clean shapes, subtle gradients, white background${baseParams}`;

    case '3D':
      return `${word}, clean modern flat illustration style, geometric shapes, minimalist design, vector art, soft gradient colors, white background${baseParams}`;

    case 'PERSON_ACTION':
      return `One 3D illustrated person (realistic cartoon style, diverse appearance) clearly performing the action "${word}", ${definition || ''}. The person must hold or interact with relevant props or objects that show the meaning at a glance (e.g. tools, items, environment). Full body or upper body, dynamic pose, clean white background, soft lighting, no text${baseParams}`;

    case 'PERSON_CONCEPT':
      return `One 3D illustrated scene with a person (realistic cartoon style) and supporting props or objects that together show the meaning of "${word}", ${definition || ''}. Use character expression, pose, and clear visual props to make the concept obvious. Clean white background, soft lighting, no text${baseParams}`;

    case 'PENGUIN':
      return `One single 3D claymation penguin character performing the action "${word}", ${definition || ''}, focus on close-up action shot with the penguin holding or interacting with relevant clay props to clearly show the meaning, choose ONE character type: baby penguin OR penguin mother OR penguin father OR penguin sister, with chubby or slim body type, plasticine clay texture, expressive dynamic pose emphasizing the action, soft matte finish, clean white background, studio lighting${baseParams}`;

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

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 使用 MiniMax 文生图（image-01）
 * @param {string} word - 单词
 * @param {string} partOfSpeech - 词性
 * @param {string} definition - 释义
 * @param {string} apiKey - MiniMax API Key
 * @returns {Promise<string|null>} 图片 URL
 */
async function generateWordImageMiniMax(word, partOfSpeech, definition, apiKey) {
  const style = recommendStyle(word, partOfSpeech);
  const prompt = generateImagePrompt(word, style, definition);

  const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt: prompt,
      aspect_ratio: '1:1',
      response_format: 'url',
      n: 1,
      prompt_optimizer: false
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn('MiniMax 生图 HTTP 错误:', res.status, errText);
    return null;
  }

  const data = await res.json();
  if (data.base_resp?.status_code !== 0) {
    console.warn('MiniMax 生图业务错误:', data.base_resp?.status_msg);
    return null;
  }

  const url = data.data?.image_urls?.[0];
  return url || null;
}

/**
 * 调用智谱 CogView 生成单词配图（MiniMax 未配置或失败时回退）
 */
async function generateWordImageGLM(word, partOfSpeech, definition, maxRetries = 3) {
  let lastError = null;
  const style = recommendStyle(word, partOfSpeech);
  const prompt = generateImagePrompt(word, style, definition);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_IMAGE_API_KEY}`
        },
        body: JSON.stringify({
          model: 'cogview-3-plus',
          prompt: prompt
        })
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        if (attempt < maxRetries) {
          await sleep(waitTime);
          continue;
        }
        return null;
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        if (attempt < maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }
        return null;
      }

      const result = await response.json();
      const imageUrl = result.data?.[0]?.url;
      if (imageUrl) return imageUrl;
      return null;
    } catch (error) {
      lastError = error.message;
      if (attempt < maxRetries) await sleep(1000 * attempt);
    }
  }
  return null;
}

/**
 * 生成单词配图：优先 MiniMax（需在配置页填 MiniMax API Key），否则用智谱
 * @param {string} word - 单词
 * @param {string} partOfSpeech - 词性
 * @param {string} definition - 释义
 * @param {number} maxRetries - 最大重试次数（默认3次）
 * @returns {Promise<string|null>} 图片URL
 */
export async function generateWordImage(word, partOfSpeech, definition, maxRetries = 3) {
  const config = getImageApiConfig();
  const minimaxKey = config.minimaxApiKey;

  if (minimaxKey) {
    console.log(`🎨 为 ${word} 生成配图（MiniMax image-01）`);
    const url = await generateWordImageMiniMax(word, partOfSpeech, definition, minimaxKey);
    if (url) {
      console.log(`✅ 已生成 ${word} 的配图`);
      return url;
    }
    console.warn('MiniMax 生图未返回，回退智谱');
  }

  console.log(`🎨 为 ${word} 生成配图（智谱 CogView）`);
  return generateWordImageGLM(word, partOfSpeech, definition, maxRetries);
}

/**
 * 批量为单词生成配图
 * @param {Array} words - 单词数组
 * @param {Function} onProgress - 进度回调函数 (current, total, currentWord)
 * @param {Boolean} forceRegenerate - 是否强制重新生成所有配图（包括已有配图的）
 * @returns {Promise<Array>} 更新后的单词数组
 */
export async function batchGenerateImages(words, onProgress, forceRegenerate = false) {
  const results = [];

  // 【修改】现在总是处理所有单词，每次都替换为最新的一版配图
  // 如果是 forceRegenerate=true，强制重新生成；否则只生成没有配图的单词
  const wordsToProcess = forceRegenerate ? words : words.filter(w => !w.imageUrl || w.imageUrl.length === 0);

  let current = 0;

  for (const word of words) {
    // 如果不是强制重新生成，跳过已有图片的单词
    if (!forceRegenerate && word.imageUrl && word.imageUrl.length > 0) {
      results.push(word);
      continue;
    }

    // 获取主要词性和释义
    const primaryDef = word.definitions?.[0];
    if (!primaryDef) {
      results.push(word);
      continue;
    }

    // 更新进度
    current++;
    if (onProgress) {
      onProgress(current, wordsToProcess.length, word.word);
    }

    try {
      const imageUrl = await generateWordImage(
        word.word,
        primaryDef.partOfSpeech,
        primaryDef.definition
      );

      // 【修改】只保留最新的一版配图，使用单元素数组
      results.push({
        ...word,
        imageUrl: imageUrl ? [imageUrl] : []
      });

      // 避免请求过快（每个单词间隔2秒）
      await sleep(2000);
    } catch (error) {
      console.error(`生成 ${word.word} 配图失败:`, error);
      results.push(word);
    }
  }

  return results;
}
