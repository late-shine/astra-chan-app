import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Ensure environment variables are loaded
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support high-resolution drawing submissions
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

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