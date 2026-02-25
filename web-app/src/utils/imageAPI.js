// 单词配图生成服务 v2.1
// 优先使用 MiniMax 文生图（image-01），未配置时回退智谱 CogView
// 支持风格：REAL/CLAY/PENGUIN/INK/MINI/FLAT/RETRO 等
// v2.1: 生成后自动下载转 Base64，避免 CDN 链接过期

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
 * 下载图片 URL 并转换为 Base64 Data URL
 * @param {string} imageUrl - 图片 URL
 * @param {number} maxSize - 最大尺寸（默认 600px）
 * @param {number} quality - 压缩质量（默认 0.75）
 * @returns {Promise<string|null>} Base64 Data URL 或 null（失败时）
 */
async function downloadImageAsBase64(imageUrl, maxSize = 600, quality = 0.75) {
  if (!imageUrl) return null;

  try {
    // 尝试通过 fetch 下载图片
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      console.warn(`[图片下载] HTTP 错误: ${response.status}`);
      return null;
    }

    const blob = await response.blob();

    // 使用 Canvas 压缩图片
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 计算缩放比例
            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 转换为压缩后的 Data URL
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            console.log(`[图片下载] 成功转换为 Base64，原始尺寸: ${img.width}x${img.height}，压缩后: ${width}x${height}`);
            resolve(dataUrl);
          } catch (err) {
            console.warn('[图片下载] Canvas 处理失败:', err);
            resolve(null);
          }
        };
        img.onerror = () => {
          console.warn('[图片下载] 图片加载失败');
          resolve(null);
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        console.warn('[图片下载] FileReader 失败');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // CORS 错误或其他网络错误
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.warn('[图片下载] CORS 限制，无法下载图片，将保留原始 URL');
    } else {
      console.warn('[图片下载] 下载失败:', error.message);
    }
    return null;
  }
}

/**
 * 检查 URL 是否为 Base64 Data URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
function isBase64Url(url) {
  return url && url.startsWith('data:image');
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
 * v2.1: 生成后自动下载转 Base64，避免 CDN 链接过期
 * @param {string} word - 单词
 * @param {string} partOfSpeech - 词性
 * @param {string} definition - 释义
 * @param {number} maxRetries - 最大重试次数（默认3次）
 * @returns {Promise<string|null>} 图片URL（优先返回 Base64，失败时返回原始 URL）
 */
export async function generateWordImage(word, partOfSpeech, definition, maxRetries = 3) {
  const config = getImageApiConfig();
  const minimaxKey = config.minimaxApiKey;

  let imageUrl = null;

  if (minimaxKey) {
    console.log(`🎨 为 ${word} 生成配图（MiniMax image-01）`);
    imageUrl = await generateWordImageMiniMax(word, partOfSpeech, definition, minimaxKey);
    if (imageUrl) {
      console.log(`✅ 已生成 ${word} 的配图 URL`);
    } else {
      console.warn('MiniMax 生图未返回，回退智谱');
    }
  }

  if (!imageUrl) {
    console.log(`🎨 为 ${word} 生成配图（智谱 CogView）`);
    imageUrl = await generateWordImageGLM(word, partOfSpeech, definition, maxRetries);
  }

  if (!imageUrl) {
    return null;
  }

  // 尝试下载并转换为 Base64（避免 CDN 链接过期）
  console.log(`📥 正在下载图片并转换为 Base64...`);
  const base64Url = await downloadImageAsBase64(imageUrl);

  if (base64Url) {
    console.log(`✅ 图片已转换为 Base64，永久保存`);
    return base64Url;
  }

  // 转换失败，返回原始 URL（兼容旧逻辑）
  console.log(`⚠️ Base64 转换失败，使用原始 CDN URL`);
  return imageUrl;
}

/**
 * 批量为单词生成配图
 * @param {Array} words - 单词数组
 * @param {Function} onProgress - 进度回调函数 (current, total, currentWord)
 * @param {Boolean} forceRegenerate - 是否强制重新生成所有配图（包括已有配图的）
 * @returns {Promise<{ words: Array, successCount: number, failCount: number }>} 更新后的单词数组与成功/失败数
 */
export async function batchGenerateImages(words, onProgress, forceRegenerate = false) {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  const wordsToProcess = forceRegenerate ? words : words.filter(w => !w.imageUrl || w.imageUrl.length === 0);
  let current = 0;

  for (const word of words) {
    if (!forceRegenerate && word.imageUrl && word.imageUrl.length > 0) {
      results.push(word);
      continue;
    }

    const primaryDef = word.definitions?.[0];
    if (!primaryDef) {
      results.push(word);
      continue;
    }

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
      results.push({
        ...word,
        imageUrl: imageUrl ? [imageUrl] : []
      });
      if (imageUrl) successCount++;
      else failCount++;
      await sleep(2000);
    } catch (error) {
      console.error(`生成 ${word.word} 配图失败:`, error);
      results.push(word);
      failCount++;
    }
  }

  return { words: results, successCount, failCount };
}

/**
 * 批量将 CDN URL 图片转换为 Base64（修复已失效的图片）
 * @param {Array} words - 单词数组
 * @param {Function} onProgress - 进度回调函数 (current, total, currentWord)
 * @returns {Promise<{ words: Array, convertedCount: number, failedCount: number }>}
 */
export async function batchConvertImagesToBase64(words, onProgress) {
  const results = [];
  let convertedCount = 0;
  let failedCount = 0;

  // 只处理 CDN URL 图片（非 Base64）
  const wordsWithCdnImages = words.filter(w => {
    if (!w.imageUrl || w.imageUrl.length === 0) return false;
    // 检查是否有非 Base64 的图片 URL
    return w.imageUrl.some(url => url && !isBase64Url(url));
  });

  console.log(`[批量转换] 发现 ${wordsWithCdnImages.length} 个单词需要转换 CDN 图片`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (onProgress) {
      onProgress(i + 1, words.length, word.word);
    }

    // 如果没有图片或已经是 Base64，直接保留
    if (!word.imageUrl || word.imageUrl.length === 0) {
      results.push(word);
      continue;
    }

    // 检查是否需要转换
    const needsConversion = word.imageUrl.some(url => url && !isBase64Url(url));

    if (!needsConversion) {
      results.push(word);
      continue;
    }

    // 尝试转换每个图片 URL
    const convertedImages = [];
    let wordConverted = false;
    let wordFailed = false;

    for (const imageUrl of word.imageUrl) {
      if (!imageUrl) continue;

      if (isBase64Url(imageUrl)) {
        // 已经是 Base64，保留
        convertedImages.push(imageUrl);
      } else {
        // 尝试下载并转换
        const base64Url = await downloadImageAsBase64(imageUrl);
        if (base64Url) {
          convertedImages.push(base64Url);
          wordConverted = true;
          console.log(`✅ [${word.word}] 图片已转换为 Base64`);
        } else {
          // 转换失败，保留原始 URL（可能会失效）
          convertedImages.push(imageUrl);
          wordFailed = true;
          console.warn(`⚠️ [${word.word}] 图片转换失败，保留原始 URL`);
        }
      }
    }

    results.push({
      ...word,
      imageUrl: convertedImages
    });

    if (wordConverted) convertedCount++;
    if (wordFailed) failedCount++;

    // 添加短暂延迟，避免请求过快
    await sleep(300);
  }

  console.log(`[批量转换] 完成：成功 ${convertedCount}，失败 ${failedCount}`);
  return { words: results, convertedCount, failedCount };
}

/**
 * 检查单词的图片是否为 CDN URL（可能失效）
 * @param {Object} word - 单词对象
 * @returns {boolean} 是否包含 CDN URL 图片
 */
export function hasCdnImage(word) {
  if (!word.imageUrl || word.imageUrl.length === 0) return false;
  return word.imageUrl.some(url => url && !isBase64Url(url));
}

/**
 * 统计词本中 CDN URL 图片的数量
 * @param {Array} words - 单词数组
 * @returns {{ total: number, cdnCount: number, base64Count: number }}
 */
export function analyzeImageStorage(words) {
  let cdnCount = 0;
  let base64Count = 0;

  for (const word of words) {
    if (!word.imageUrl || word.imageUrl.length === 0) continue;
    for (const url of word.imageUrl) {
      if (!url) continue;
      if (isBase64Url(url)) {
        base64Count++;
      } else {
        cdnCount++;
      }
    }
  }

  return {
    total: cdnCount + base64Count,
    cdnCount,
    base64Count
  };
}
