import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Cache TTS instance to avoid re-creating for each request
let ttsInstance = null;
let currentVoice = null;

async function getTTS(voice) {
  if (!ttsInstance || currentVoice !== voice) {
    ttsInstance = new MsEdgeTTS();
    await ttsInstance.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    currentVoice = voice;
  }
  return ttsInstance;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { text, voice = "en-US-AriaNeural" } = req.query;

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' parameter" });
  }

  if (text.length > 1000) {
    return res.status(400).json({ error: "Text too long (max 1000 chars)" });
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);

    // Collect all audio chunks
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("Edge TTS error:", error);
    return res.status(500).json({ error: "TTS generation failed", details: error.message });
  }
}
