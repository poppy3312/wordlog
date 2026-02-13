/**
 * 服务端查词 API：用环境变量中的 Key 调 GLM/MiniMax，Key 不暴露给前端
 * 环境变量：GLM_API_KEY（必填其一）、MINIMAX_API_KEY（可选）
 * 限流：同一 IP 每分钟最多 30 次
 */

// 简单内存限流：IP -> { count, resetAt }，每分钟重置
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_IP = 30;

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (now >= entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_WINDOW_MS;
    return true;
  }
  entry.count++;
  if (entry.count > RATE_MAX_PER_IP) return false;
  return true;
}

/** 只允许字母和连字符，长度 1～50 */
function isValidWord(word) {
  if (!word || typeof word !== "string") return false;
  const trimmed = word.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  return /^[a-z]+(-[a-z]+)*$/.test(trimmed);
}

async function fetchFromGLM(word, apiKey) {
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that provides Chinese definitions for English words in JSON format.",
        },
        {
          role: "user",
          content: `Provide the Chinese definition for the English word "${word}". Return ONLY a JSON object:
{"definitions":[{"partOfSpeech":"part of speech in Chinese","definition":"Chinese definition","example":"English example sentence","exampleTranslation":"Chinese translation"}]}
Only return JSON, nothing else.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*"definitions"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.definitions?.length > 0) {
      return {
        word,
        wordLower: word.toLowerCase(),
        pronunciation: `/${word}/`,
        audioUrl: "",
        imageUrl: "",
        definitions: parsed.definitions,
        source: "glm-4",
      };
    }
  } catch (_) {}
  return null;
}

async function fetchFromMiniMax(word, apiKey) {
  const res = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "abab6.5s-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that provides Chinese definitions for English words in JSON format.",
        },
        {
          role: "user",
          content: `Provide the Chinese definition for the English word "${word}". Return ONLY a JSON object:
{"definitions":[{"partOfSpeech":"part of speech in Chinese","definition":"Chinese definition","example":"English example sentence","exampleTranslation":"Chinese translation"}]}
Only return JSON, nothing else.`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const content = data.choices?.[0]?.messages?.[0]?.text || "";
  const jsonMatch = content.match(/\{[\s\S]*"definitions"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.definitions?.length > 0) {
      return {
        word,
        wordLower: word.toLowerCase(),
        pronunciation: `/${word}/`,
        audioUrl: "",
        imageUrl: "",
        definitions: parsed.definitions,
        source: "minimax",
      };
    }
  } catch (_) {}
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let word =
    req.method === "GET"
      ? req.query?.word
      : typeof req.body?.word === "string"
        ? req.body.word
        : null;
  if (!word) {
    return res.status(400).json({ error: "Missing 'word' parameter" });
  }
  word = word.trim().toLowerCase();

  if (!isValidWord(word)) {
    return res.status(400).json({
      error: "Invalid word: only letters and hyphens, 1-50 characters",
    });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "Too many requests. Please try again in a minute.",
    });
  }

  const glmKey = process.env.GLM_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;

  if (!glmKey && !minimaxKey) {
    return res.status(503).json({
      error: "Definition service not configured (missing API keys)",
    });
  }

  try {
    if (glmKey) {
      const result = await fetchFromGLM(word, glmKey);
      if (result) return res.status(200).json(result);
    }
    if (minimaxKey) {
      const result = await fetchFromMiniMax(word, minimaxKey);
      if (result) return res.status(200).json(result);
    }
  } catch (err) {
    console.error("Definition API error:", err);
    return res.status(500).json({
      error: "Definition lookup failed",
      details: err.message,
    });
  }

  return res.status(404).json({
    error: "No definition found",
    word,
  });
}
