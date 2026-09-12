/**
 * Vercel Serverless Function — POST /api/synthesize-speech
 *
 * Generates short Japanese pronunciation audio through Gemini TTS. The Gemini
 * API key stays on the server and is never sent to the browser.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Buffer } from "node:buffer";

const DEFAULT_MODEL = "gemini-2.5-flash-preview-tts";
const VOICES: Record<string, { id: string; geminiVoice: string }> = {
  "ja-JP-Chirp3-HD-Sulafat": { id: "ja-JP-Chirp3-HD-Sulafat", geminiVoice: "Sulafat" },
  "ja-JP-Chirp3-HD-Achernar": { id: "ja-JP-Chirp3-HD-Achernar", geminiVoice: "Achernar" },
  "ja-JP-Chirp3-HD-Achird": { id: "ja-JP-Chirp3-HD-Achird", geminiVoice: "Achird" },
  "gemini-Kore": { id: "gemini-Kore", geminiVoice: "Kore" },
  "gemini-Leda": { id: "gemini-Leda", geminiVoice: "Leda" },
  "gemini-Puck": { id: "gemini-Puck", geminiVoice: "Puck" },
  "gemini-Aoede": { id: "gemini-Aoede", geminiVoice: "Aoede" },
};

function toWavBase64(pcmBase64: string, sampleRate = 24_000): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

async function synthesize(text: string, voiceId: string, speakingRate: number) {
  const voice = VOICES[voiceId];
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TTS_MODEL || DEFAULT_MODEL;
  const pace = speakingRate <= 0.85
    ? "at a slightly deliberate, learner-friendly pace"
    : speakingRate >= 1.15
      ? "at a lively but clearly understandable pace"
      : "at a natural conversational pace";

  if (!voice) {
    const error = new Error("That Gemini Japanese voice is not available.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (!apiKey) {
    const error = new Error("Gemini Japanese voices are not configured yet.");
    (error as Error & { statusCode?: number }).statusCode = 503;
    throw error;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model,
      input: `Say in Japanese ${pace}. Speak exactly this transcript and do not translate or add words:\n${text}`,
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: voice.geminiVoice }] },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `Gemini TTS returned status ${response.status}`);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  const payload = await response.json();
  const audioPart = payload.output_audio
    ?? payload.steps?.flatMap((step: { content?: Array<{ type?: string }> }) => step.content || [])
      .find((part: { type?: string }) => part.type === "audio");
  if (!audioPart?.data) throw new Error("Gemini TTS returned no audio data.");

  return {
    audioContent: toWavBase64(audioPart.data, Number(audioPart.sample_rate) || 24_000),
    mimeType: "audio/wav",
    voiceId: voice.id,
    model,
  };
}

const speechCache = new Map<string, { audioContent: string; createdAt: number }>();
const rateWindows = new Map<string, { startedAt: number; count: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { text, voiceId, speakingRate } = req.body ?? {};
  const cleanText = typeof text === "string" ? text.trim() : "";
  const parsedRate = typeof speakingRate === "number" ? speakingRate : 0.8;

  if (!cleanText || cleanText.length > 240) {
    return res.status(400).json({ error: "Speech text must contain between 1 and 240 characters." });
  }

  const clientAddress = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  const now = Date.now();
  const rateWindow = rateWindows.get(clientAddress);
  if (!rateWindow || now - rateWindow.startedAt >= 60_000) {
    rateWindows.set(clientAddress, { startedAt: now, count: 1 });
  } else if (rateWindow.count >= 30) {
    return res.status(429).json({ error: "Astra's Gemini voice is resting briefly. Try again in a moment." });
  } else {
    rateWindow.count += 1;
  }

  const cacheKey = `${voiceId}|${cleanText}|${parsedRate}`;
  const cached = speechCache.get(cacheKey);
  if (cached) {
    return res.json({ audioContent: cached.audioContent, mimeType: "audio/wav", voiceId, cached: true });
  }

  try {
    const result = await synthesize(cleanText, typeof voiceId === "string" ? voiceId : "", parsedRate);

    if (speechCache.size >= 500) {
      const oldestKey = speechCache.keys().next().value;
      if (oldestKey) speechCache.delete(oldestKey);
    }
    speechCache.set(cacheKey, { audioContent: result.audioContent, createdAt: now });

    return res.json({
      audioContent: result.audioContent,
      mimeType: result.mimeType,
      voiceId: result.voiceId,
      model: result.model,
    });
  } catch (err: unknown) {
    console.error("[synthesize-speech] Gemini TTS error:", err);
    const error = err as Error & { statusCode?: number };
    return res.status(error.statusCode || 502).json({
      error: error.message || "Astra could not reach Gemini's voice service.",
    });
  }
}
