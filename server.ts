import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { synthesizeGeminiJapaneseSpeech } from "./src/geminiTts";

// Ensure environment variables are loaded
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const cloudSpeechCache = new Map<string, { audioContent: string; createdAt: number }>();
  const cloudSpeechRateWindows = new Map<string, { startedAt: number; count: number }>();

  // Support high-resolution drawing submissions
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API: Gemini Japanese TTS. The Gemini credential remains server-side; the
  // browser only receives generated audio bytes.
  app.post("/api/synthesize-speech", async (req, res) => {
    try {
      const { text, voiceId, speakingRate } = req.body ?? {};
      const cleanText = typeof text === "string" ? text.trim() : "";

      if (!cleanText || cleanText.length > 240) {
        return res.status(400).json({ error: "Speech text must contain between 1 and 240 characters." });
      }

      const parsedRate = typeof speakingRate === "number" ? speakingRate : 0.8;
      const clientAddress = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
        .split(",")[0]
        .trim();
      const now = Date.now();
      const rateWindow = cloudSpeechRateWindows.get(clientAddress);
      if (!rateWindow || now - rateWindow.startedAt >= 60_000) {
        cloudSpeechRateWindows.set(clientAddress, { startedAt: now, count: 1 });
      } else if (rateWindow.count >= 30) {
        return res.status(429).json({ error: "Astra's Gemini voice is resting briefly. Try again in a moment." });
      } else {
        rateWindow.count += 1;
      }

      const cacheKey = `${voiceId}|${cleanText}|${parsedRate}`;
      const cached = cloudSpeechCache.get(cacheKey);
      if (cached) {
        return res.json({
          audioContent: cached.audioContent,
          mimeType: "audio/wav",
          voiceId,
          cached: true,
        });
      }

      const result = await synthesizeGeminiJapaneseSpeech({
        text: cleanText,
        voiceId: typeof voiceId === "string" ? voiceId : "",
        speakingRate: parsedRate,
      });

      if (cloudSpeechCache.size >= 500) {
        const oldestKey = cloudSpeechCache.keys().next().value;
        if (oldestKey) cloudSpeechCache.delete(oldestKey);
      }
      cloudSpeechCache.set(cacheKey, { audioContent: result.audioContent, createdAt: now });

      return res.json({
        audioContent: result.audioContent,
        mimeType: result.mimeType,
        voiceId: result.voiceId,
        model: result.model,
      });
    } catch (err: any) {
      console.error("[synthesize-speech] Gemini TTS error:", err);
      return res.status(err?.statusCode || 502).json({
        error: err.message || "Astra could not reach Gemini's voice service.",
      });
    }
  });

  // API: Analyze Kanji Drawing using Google Gemini 3.1 Flash Lite
  app.post("/api/analyze-kanji", async (req, res) => {
    try {
      const { kanji, meaning, imageData } = req.body;

      if (!kanji || !imageData) {
        return res.status(400).json({
          error: "Missing parameters. Both 'kanji' and 'imageData' are required.",
        });
      }

      // Check key presence first
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error:
            "Oh no! Astra-chan's magical analysis core couldn't find her special secret talisman energy (missing GEMINI_API_KEY environment variable). Please add your Gemini API Key in your .env file, then try again!"
        });
      }

      const styles = [
        "Be warm and sisterly, like a tutor cheering on a younger student.",
        "Be playful and magical, like a witch casting a learning spell.",
        "Be precise and focused, like a sensei giving a lesson.",
        "Be enthusiastic and celebratory, like a fan cheering at a match.",
      ];
      const style = styles[Math.floor(Math.random() * styles.length)];

      const prompt =
        `You are Astra-chan (アストラちゃん), an enthusiastic and cute magical-girl mascot who guides students through learning Japanese.\n` +
        `Tone: ${style}\n\n` +
        `Analyze the user's handwritten/drawn attempt for the Kanji character "${kanji}" (meaning: "${meaning || "unknown"}").\n\n` +
        `Compare their drawing to the official structural strokes, proportions, balancing, and intersections of correct "${kanji}".\n` +
        `Score from 0 to 100:\n` +
        `90-100 = excellent, matches "${kanji}" very closely\n` +
        `70-89 = good effort, small issues with strokes or proportions\n` +
        `50-69 = recognisable but needs work on specific parts\n` +
        `below 50 = significant issues, needs more practice\n\n` +
        `Write 5-6 sentences of specific feedback. Mention actual parts of the kanji that look good or need fixing. ` +
        `End with one specific actionable tip for improvement.\n` +
        `Add a cute energetic summary title in "feedbackTitle" like "Wonderful Stroke Work!", "Terrific Effort!", or "A Tiny Bit Off-Balance!".\n\n` +
        `Reply with ONLY this JSON and nothing else:\n` +
        `{"score":<integer 0-100>,"feedbackTitle":"<title under 35 chars>","advice":"<your 5-6 sentence feedback>"}`;

      // Strip data URL prefix, keep raw base64
      const base64Data = imageData.startsWith("data:")
        ? imageData.split(",")[1]
        : imageData;

      const mimeType = imageData.startsWith("data:")
        ? imageData.split(";")[0].split(":")[1]
        : "image/png";

      // Call Gemini 3.1 Flash Lite
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 600,
              temperature: 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API returned status ${response.status}`);
      }

      const responseData = await response.json();
      const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!replyText) {
        throw new Error("Empty response received from Gemini API.");
      }

      const cleaned = replyText.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "");
      const resultObj = JSON.parse(cleaned);

      return res.json(resultObj);
    } catch (err: any) {
      console.error("[analyze-kanji] Gemini API error:", err);
      const errMsg = err.message || "An unexpected error occurred during Astra-chan's drawing evaluation.";
      return res.status(500).json({ error: errMsg });
    }
  });

  // Serve Vite or Static files depending on mode (Untouched)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
