/**
 * Vercel Serverless Function — POST /api/synthesize-speech
 *
 * Generates short Japanese pronunciation audio through Gemini TTS. The Gemini
 * API key stays on the server and is never sent to the browser.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { synthesizeGeminiJapaneseSpeech } from "../src/geminiTts";

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
    const result = await synthesizeGeminiJapaneseSpeech({
      text: cleanText,
      voiceId: typeof voiceId === "string" ? voiceId : "",
      speakingRate: parsedRate,
    });

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
