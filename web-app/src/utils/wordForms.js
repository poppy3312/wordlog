/**
 * 单词时态识别工具
 * 识别单词的原形、时态和形态变化
 */

/**
 * 常见不规则动词映射表
 */
const irregularVerbs = {
  // be 动词
  'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be',
  'being': 'be', 'been': 'be',

  // have 动词
  'has': 'have', 'had': 'have', 'having': 'have',

  // do 动词
  'does': 'do', 'did': 'do', 'doing': 'do', 'done': 'do',

  // go 动词
  'goes': 'go', 'went': 'go', 'gone': 'go', 'going': 'go',

  // scare 动词（防止 scared → scar）
  'scared': 'scare', 'scares': 'scare', 'scaring': 'scare',

  // 常见不规则动词
  'became': 'become', 'become': 'become', 'becomes': 'become', 'becoming': 'become',
  'began': 'begin', 'begun': 'begin', 'begins': 'begin', 'beginning': 'begin',
  'bit': 'bite', 'bites': 'bite', 'biting': 'bite', 'bitten': 'bite',
  'blew': 'blow', 'blown': 'blow', 'blows': 'blow', 'blowing': 'blow',
  'broke': 'break', 'broken': 'break', 'breaks': 'break', 'breaking': 'break',
  'brought': 'bring', 'brings': 'bring', 'bringing': 'bring',
  'built': 'build', 'builds': 'build', 'building': 'build',
  'bought': 'buy', 'buys': 'buy', 'buying': 'buy',
  'caught': 'catch', 'catches': 'catch', 'catching': 'catch',
  'chose': 'choose', 'chosen': 'choose', 'chooses': 'choose', 'choosing': 'choose',
  'came': 'come', 'comes': 'come', 'coming': 'come',
  'cost': 'cost', 'costs': 'cost', 'costing': 'cost',
  'cut': 'cut', 'cuts': 'cut', 'cutting': 'cut',
  'did': 'do', 'does': 'do', 'done': 'do', 'doing': 'do',
  'drew': 'draw', 'drawn': 'draw', 'draws': 'draw', 'drawing': 'draw',
  'drank': 'drink', 'drunk': 'drink', 'drinks': 'drink', 'drinking': 'drink',
  'drove': 'drive', 'driven': 'drive', 'drives': 'drive', 'driving': 'drive',
  'ate': 'eat', 'eaten': 'eat', 'eats': 'eat', 'eating': 'eat',
  'fell': 'fall', 'fallen': 'fall', 'falls': 'fall', 'falling': 'fall',
  'fed': 'feed', 'feeds': 'feed', 'feeding': 'feed',
  'felt': 'feel', 'feels': 'feel', 'feeling': 'feel',
  'fought': 'fight', 'fights': 'fight', 'fighting': 'fight',
  'found': 'find', 'finds': 'find', 'finding': 'find',
  'flew': 'fly', 'flown': 'fly', 'flies': 'fly', 'flying': 'fly',
  'forbid': 'forbid', 'forbade': 'forbid', 'forbidden': 'forbid', 'forbids': 'forbid', 'forbidding': 'forbid',
  'forgot': 'forget', 'forgotten': 'forget', 'forgets': 'forget', 'forgetting': 'forget',
  'froze': 'freeze', 'frozen': 'freeze', 'freezes': 'freeze', 'freezing': 'freeze',
  'got': 'get', 'gotten': 'get', 'gets': 'get', 'getting': 'get',
  'gave': 'give', 'given': 'give', 'gives': 'give', 'giving': 'give',
  'went': 'go', 'gone': 'go', 'goes': 'go', 'going': 'go',
  'grew': 'grow', 'grown': 'grow', 'grows': 'grow', 'growing': 'grow',
  'hung': 'hang', 'hangs': 'hang', 'hanging': 'hang',
  'had': 'have', 'has': 'have', 'having': 'have',
  'heard': 'hear', 'hears': 'hear', 'hearing': 'hear',
  'hid': 'hide', 'hidden': 'hide', 'hides': 'hide', 'hiding': 'hide',
  'hit': 'hit', 'hits': 'hit', 'hitting': 'hit',
  'held': 'hold', 'holds': 'hold', 'holding': 'hold',
  'hurt': 'hurt', 'hurts': 'hurt', 'hurting': 'hurt',
  'kept': 'keep', 'keeps': 'keep', 'keeping': 'keep',
  'knew': 'know', 'known': 'know', 'knows': 'know', 'knowing': 'know',
  'laid': 'lay', 'lays': 'lay', 'laying': 'lay',
  'led': 'lead', 'leads': 'lead', 'leading': 'lead',
  'left': 'leave', 'leaves': 'leave', 'leaving': 'leave',
  'lent': 'lend', 'lends': 'lend', 'lending': 'lend',
  'lay': 'lie', 'lain': 'lie', 'lies': 'lie', 'lying': 'lie',
  'lit': 'light', 'lights': 'light', 'lighting': 'light',
  'lost': 'lose', 'loses': 'lose', 'losing': 'lose',
  'made': 'make', 'makes': 'make', 'making': 'make',
  'meant': 'mean', 'means': 'mean', 'meaning': 'mean',
  'met': 'meet', 'meets': 'meet', 'meeting': 'meet',
  'paid': 'pay', 'pays': 'pay', 'paying': 'pay',
  'put': 'put', 'puts': 'put', 'putting': 'put',
  'read': 'read', 'reads': 'read', 'reading': 'read',
  'rode': 'ride', 'ridden': 'ride', 'rides': 'ride', 'riding': 'ride',
  'rang': 'ring', 'rung': 'ring', 'rings': 'ring', 'ringing': 'ring',
  'rose': 'rise', 'risen': 'rise', 'rises': 'rise', 'rising': 'rise',
  'ran': 'run', 'runs': 'run', 'running': 'run',
  'said': 'say', 'says': 'say', 'saying': 'say',
  'saw': 'see', 'seen': 'see', 'sees': 'see', 'seeing': 'see',
  'sold': 'sell', 'sells': 'sell', 'selling': 'sell',
  'sent': 'send', 'sends': 'send', 'sending': 'send',
  'set': 'set', 'sets': 'set', 'setting': 'set',
  'shook': 'shake', 'shaken': 'shake', 'shakes': 'shake', 'shaking': 'shake',
  'shot': 'shoot', 'shoots': 'shoot', 'shooting': 'shoot',
  'showed': 'show', 'shown': 'show', 'shows': 'show', 'showing': 'show',
  'shut': 'shut', 'shuts': 'shut', 'shutting': 'shut',
  'sang': 'sing', 'sung': 'sing', 'sings': 'sing', 'singing': 'sing',
  'sat': 'sit', 'sits': 'sit', 'sitting': 'sit',
  'slept': 'sleep', 'sleeps': 'sleep', 'sleeping': 'sleep',
  'slid': 'slide', 'slides': 'slide', 'sliding': 'slide',
  'smelt': 'smell', 'smells': 'smell', 'smelling': 'smell',
  'spoke': 'speak', 'spoken': 'speak', 'speaks': 'speak', 'speaking': 'speak',
  'spent': 'spend', 'spends': 'spend', 'spending': 'spend',
  'spilled': 'spill', 'spills': 'spill', 'spilling': 'spill',
  'spat': 'spit', 'spits': 'spit', 'spitting': 'spit',
  'split': 'split', 'splits': 'split', 'splitting': 'split',
  'spread': 'spread', 'spreads': 'spread', 'spreading': 'spread',
  'stood': 'stand', 'stands': 'stand', 'standing': 'stand',
  'stole': 'steal', 'stolen': 'steal', 'steals': 'steal', 'stealing': 'steal',
  'stuck': 'stick', 'sticks': 'stick', 'sticking': 'stick',
  'stung': 'sting', 'stings': 'sting', 'stinging': 'sting',
  'strode': 'stride', 'stridden': 'stride', 'strides': 'stride', 'striding': 'stride',
  'struck': 'strike', 'strikes': 'strike', 'striking': 'strike', 'struck': 'strike', 'stricken': 'strike',
  'swore': 'swear', 'sworn': 'swear', 'swears': 'swear', 'swearing': 'swear',
  'swept': 'sweep', 'sweeps': 'sweep', 'sweeping': 'sweep',
  'swam': 'swim', 'swum': 'swim', 'swims': 'swim', 'swimming': 'swim',
  'swung': 'swing', 'swings': 'swing', 'swinging': 'swing',
  'took': 'take', 'taken': 'take', 'takes': 'take', 'taking': 'take',
  'taught': 'teach', 'teaches': 'teach', 'teaching': 'teach',
  'tore': 'tear', 'torn': 'tear', 'tears': 'tear', 'tearing': 'tear',
  'told': 'tell', 'tells': 'tell', 'telling': 'tell',
  'thought': 'think', 'thinks': 'think', 'thinking': 'think',
  'threw': 'throw', 'thrown': 'throw', 'throws': 'throw', 'throwing': 'throw',
  'tide': 'tie', 'ties': 'tie', 'tying': 'tie', 'tied': 'tie',
  'understood': 'understand', 'understands': 'understand', 'understanding': 'understand',
  'woke': 'wake', 'woken': 'wake', 'wakes': 'wake', 'waking': 'wake',
  'wore': 'wear', 'worn': 'wear', 'wears': 'wear', 'wearing': 'wear',
  'won': 'win', 'wins': 'win', 'winning': 'win',
  'wrote': 'write', 'written': 'write', 'writes': 'write', 'writing': 'write',
  'wrapped': 'wrap', 'wraps': 'wrap', 'wrapping': 'wrap',
};

/**
 * 不应被拆分的完整单词白名单
 * 这些单词看起来像是变形，但实际上是独立的完整单词
 * 例如：butter（黄油）不是 butt（臀部）的比较级
 */
const shouldNotSplit = new Set([
  'butter', 'mother', 'father', 'brother', 'sister',
  'water', 'paper', 'letter', 'number', 'winter',
  'summer', 'doctor', 'actor', 'author', 'corner',
  'danger', 'finger', 'hammer', 'master', 'tower',
  'flower', 'power', 'silver', 'sugar', 'tiger',
  'laser', 'radar', 'scar', 'star', 'bar', 'car',
  'apple', 'table', 'able', 'simple', 'people',
  'gentle', 'little', 'middle', 'noble', 'subtle',
  'title', 'bottle', 'candle', 'handle', 'castle',
]);

/**
 * 规则动词后缀模式
 */
const suffixPatterns = [
  // 过去式 (-ed)
  { suffix: 'ed', type: '过去式', removeSuffix: 'ed' },
  // 现在分词 (-ing)
  { suffix: 'ing', type: '现在分词', removeSuffix: 'ing' },
  // 第三人称单数 (-s/-es)
  { suffix: 'es', type: '第三人称单数', removeSuffix: 'es', specialEndings: ['s', 'x', 'z', 'ch', 'sh'] },
  { suffix: 'ies', type: '第三人称单数', removeSuffix: 'ies', replaceWith: 'y' },
  { suffix: 's', type: '第三人称单数', removeSuffix: 's' },
  // 形容词后缀
  { suffix: 'er', type: '比较级', removeSuffix: 'er' },
  { suffix: 'est', type: '最高级', removeSuffix: 'est' },
  { suffix: 'ful', type: '形容词（ful后缀）', removeSuffix: 'ful' },
  { suffix: 'less', type: '形容词（less后缀）', removeSuffix: 'less' },
  { suffix: 'able', type: '形容词（able后缀）', removeSuffix: 'able' },
  { suffix: 'ible', type: '形容词（ible后缀）', removeSuffix: 'ible' },
  { suffix: 'ous', type: '形容词（ous后缀）', removeSuffix: 'ous' },
  { suffix: 'ive', type: '形容词（ive后缀）', removeSuffix: 'ive' },
  { suffix: 'al', type: '形容词（al后缀）', removeSuffix: 'al' },
  { suffix: 'ly', type: '副词（ly后缀）', removeSuffix: 'ly' },
  { suffix: 'ment', type: '名词（ment后缀）', removeSuffix: 'ment' },
  { suffix: 'ness', type: '名词（ness后缀）', removeSuffix: 'ness' },
  { suffix: 'tion', type: '名词（tion后缀）', removeSuffix: 'tion' },
  { suffix: 'sion', type: '名词（sion后缀）', removeSuffix: 'sion' },
  { suffix: 'ity', type: '名词（ity后缀）', removeSuffix: 'ity' },
  { suffix: 'ance', type: '名词（ance后缀）', removeSuffix: 'ance' },
  { suffix: 'ence', type: '名词（ence后缀）', removeSuffix: 'ence' },
  { suffix: 'dom', type: '名词（dom后缀）', removeSuffix: 'dom' },
  { suffix: 'ship', type: '名词（ship后缀）', removeSuffix: 'ship' },
];

/**
 * 判断是否可能是有效的英文单词
 * 简单的启发式判断，基于常见的英语音节模式
 */
function isLikelyValidWord(word) {
  if (!word || word.length < 2) return false;

  const lower = word.toLowerCase();

  // 常见的无效模式
  // 1. 连续三个以上辅音（除了一些特殊情况）
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(lower)) return false;

  // 2. 所有辅音没有元音
  if (!/[aeiouy]/.test(lower)) return false;

  // 通过基本检查
  return true;
}

/**
 * 智能判断移除 -ed 后是否合理
 * 例如：scared 应该变成 scare（保留e），而不是 scar
 */
function shouldKeepEWhenRemovingED(word, withoutEd) {
  // 如果原单词以 e 结尾，直接移除 d 得到原形（如 agreed → agree）
  if (word.endsWith('eed')) {
    return true;
  }

  // 如果去 ed 后以辅音结尾，且原单词较长，可能需要保留 e
  // scared → scare（正确），而不是 scar
  if (!withoutEd.endsWith('e') && withoutEd.endsWith('a')) {
    // 检查原单词长度和结构
    if (word.length >= 5 && word.endsWith('red')) {
      // 可能是 scared → scare 类型的单词
      return true;
    }
  }

  return false;
}

/**
 * 分析单词的原形和时态
 * @param {string} word - 要分析的单词
 * @returns {Object} { original, type } - original 是原形，type 是时态类型
 */
export function analyzeWordForm(word) {
  if (!word || typeof word !== 'string') {
    return { original: word, type: null };
  }

  const lowerWord = word.toLowerCase();

  // 1. 检查不规则动词表
  if (irregularVerbs[lowerWord]) {
    const original = irregularVerbs[lowerWord];

    // 识别时态类型
    let type = null;
    if (lowerWord === original) {
      type = null; // 原形
    } else if (lowerWord.endsWith('ing')) {
      type = '现在分词';
    } else if (lowerWord.endsWith('s') && !lowerWord.endsWith('ss')) {
      type = '第三人称单数';
    } else if (lowerWord.endsWith('ed')) {
      // 可能是过去式或过去分词
      type = '过去式/过去分词';
    } else {
      // 不规则变化
      type = getIrregularFormType(lowerWord, original);
    }

    return { original, type };
  }

  // 2. 检查规则变化
  for (const pattern of suffixPatterns) {
    if (lowerWord.endsWith(pattern.suffix)) {
      // 【优先检查】如果原单词在白名单中，说明它是完整单词，不应该被拆分
      if (shouldNotSplit.has(lowerWord)) {
        continue; // 跳过后缀处理，保持原单词不变
      }

      // 检查单词长度，避免太短的单词
      if (lowerWord.length <= pattern.suffix.length + 2) {
        continue;
      }

      // 特殊检查：es 结尾需要特定结尾
      if (pattern.specialEndings) {
        const baseWord = lowerWord.slice(0, -pattern.suffix.length);
        const endsWithSpecial = pattern.specialEndings.some(ending =>
          baseWord.endsWith(ending)
        );
        if (!endsWithSpecial) {
          continue;
        }
      }

      let original;
      if (pattern.replaceWith) {
        original = lowerWord.slice(0, -pattern.suffix.length) + pattern.replaceWith;
      } else {
        original = lowerWord.slice(0, -pattern.suffix.length);
      }

      // 检查原形是否有效（至少3个字母）
      if (original.length < 3) {
        continue;
      }

      // 对于移除后缀后的结果，也检查是否在白名单中
      // 例如：scar 在白名单中，所以 scared 不应该被拆分成 scar
      if (shouldNotSplit.has(original)) {
        continue;
      }

      // 【新增】对于 -ed 后缀的额外验证
      // 检查是否可能是原形以 e 结尾（如 scared → scare，而不是 scar）
      if (pattern.suffix === 'ed') {
        // 检查是否应该保留 e（使用智能判断函数）
        if (shouldKeepEWhenRemovingED(lowerWord, original)) {
          const withE = original + 'e';
          // 使用加 e 的版本作为原形
          return { original: withE, type: pattern.type };
        }
      }

      return { original, type: pattern.type };
    }
  }

  // 3. 没有识别出变化，返回原单词
  return { original: word, type: null };
}

/**
 * 获取不规则动词的时态类型
 */
function getIrregularFormType(form, base) {
  // be 动词特殊处理
  if (base === 'be') {
    if (['am', 'is', 'are'].includes(form)) return '现在时';
    if (['was', 'were'].includes(form)) return '过去式';
    if (form === 'being') return '现在分词';
    if (form === 'been') return '过去分词';
  }

  // 其他不规则动词
  if (form.endsWith('ing')) return '现在分词';
  if (form.endsWith('s') && form !== base + 's') return '第三人称单数';
  if (form.endsWith('ed')) return '过去式/过去分词';

  // 过去式 vs 过去分词（通常需要字典支持，这里简化处理）
  const commonPastParticiples = ['done', 'gone', 'seen', 'been', 'won', 'given', 'taken', 'written', 'spoken'];
  if (commonPastParticiples.includes(form)) {
    return '过去分词';
  }

  return '过去式';
}

/**
 * 获取单词的所有可能形式
 * @param {string} word - 原形单词
 * @returns {Object} 各种时态形式
 */
export function getWordForms(word) {
  if (!word) return null;

  const lowerWord = word.toLowerCase();
  const forms = {
    base: lowerWord,
    past: null,
    pastParticiple: null,
    presentParticiple: null,
    thirdPerson: null,
  };

  // 检查是否是不规则动词
  const isIrregular = Object.values(irregularVerbs).includes(lowerWord);

  if (isIrregular) {
    // 查找该动词的所有形式
    for (const [form, base] of Object.entries(irregularVerbs)) {
      if (base === lowerWord) {
        if (form.endsWith('ed') && !form.endsWith('ing')) {
          if (!forms.past) forms.past = form;
          if (['done', 'gone', 'seen', 'been'].includes(form)) {
            forms.pastParticiple = form;
          }
        } else if (form.endsWith('ing')) {
          forms.presentParticiple = form;
        } else if (form.endsWith('s') && !form.endsWith('es') && form !== lowerWord + 's') {
          forms.thirdPerson = form;
        } else if (form === lowerWord + 'ed') {
          forms.past = form;
        }
      }
    }
  }

  // 规则动词形式
  if (!forms.past) {
    forms.past = lowerWord + 'ed';
  }
  if (!forms.pastParticiple) {
    forms.pastParticiple = forms.past;
  }
  if (!forms.presentParticiple) {
    if (lowerWord.endsWith('e')) {
      forms.presentParticiple = lowerWord + 'ing';
    } else {
      forms.presentParticiple = lowerWord + 'ing';
    }
  }
  if (!forms.thirdPerson) {
    if (lowerWord.endsWith('y') && /[bcdfghjklmnpqrstvwxyz]/.test(lowerWord.slice(-2, -1))) {
      forms.thirdPerson = lowerWord.slice(0, -1) + 'ies';
    } else if (lowerWord.endsWith('s') || lowerWord.endsWith('x') || lowerWord.endsWith('ch') || lowerWord.endsWith('sh') || lowerWord.endsWith('z')) {
      forms.thirdPerson = lowerWord + 'es';
    } else {
      forms.thirdPerson = lowerWord + 's';
    }
  }

  return forms;
}

export default { analyzeWordForm, getWordForms };
