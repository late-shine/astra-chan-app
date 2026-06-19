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

  // API: Analyze Kanji Drawing using OpenRouter (Gemini 2.0 Flash)
  app.post("/api/analyze-kanji", async (req, res) => {
    try {
      const { kanji, meaning, imageData } = req.body;

      if (!kanji || !imageData) {
        return res.status(400).json({
          error: "Missing parameters. Both 'kanji' and 'imageData' are required.",
        });
      }

      // Check key presence first
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error:
            "Oh no! Astra-chan's magical analysis core couldn't find her special secret talisman energy (missing OPENROUTER_API_KEY environment variable). Please add your OpenRouter API Key in your .env file, then try again!"
        });
      }

      const prompt = `You are Astra-chan (アストラちゃん), an enthusiastic and cute magical-girl mascot who guides students through learning Japanese.
Analyze the user's handwritten/drawn attempt for the Kanji character "${kanji}" (which represents translation meaning: "${meaning || "unknown"}").

Compare their drawing (provided as an image) to the official structural strokes, proportions, balancing, and intersections of correct "${kanji}".
Determine an accuracy percentage score from 0 to 100. Be fair but encouraging! (e.g. if details are slightly wavy but trace the outline, give 75-85%; if it's exceptionally drawn give 90-98%; if it's just a scribble or wrong character, give a low score).

Provide detailed critique and tips (e.g., checking proportions, line lengths, brush intersections, or order) inside "advice".
Add a cute energetic summary title in "feedbackTitle" like "Wonderful Stroke Work!", "Terrific Effort!", or "A Tiny Bit Off-Balance!".

Your response MUST be a single raw JSON-compliant object matching the requested schema.`;

      // Call OpenRouter with Structured Outputs
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://astra-kanji-tutor.vercel.app",
          "X-Title": "Astra App"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    // OpenRouter parses the standard canvas Data URL string automatically
                    url: imageData 
                  }
                }
              ]
            }
          ],
          // FIX: Use json_schema (not json_object) — correct OpenRouter structured output format
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "kanji_feedback",
              strict: false,
              schema: {
                type: "object",
                properties: {
                  score: {
                    type: "integer",
                    description: "An accuracy score percentage from 0 to 100."
                  },
                  feedbackTitle: {
                    type: "string",
                    description: "Cute short praise/motivational title from Astra-chan (max 35 chars)."
                  },
                  advice: {
                    type: "string",
                    description: "Structured stroke-by-stroke feedback, critique on balance, and magical words of encouragement from Astra-chan."
                  }
                },
                required: ["score", "feedbackTitle", "advice"],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenRouter returned status ${response.status}`);
      }

      const responseData = await response.json();
      const replyText = responseData.choices?.[0]?.message?.content;
      
      if (!replyText) {
        throw new Error("Empty response received from OpenRouter.");
      }

      const resultObj = JSON.parse(replyText.trim());

      return res.json(resultObj);
    } catch (err: any) {
      console.error("Kanji analysis error:", err);
      const errMsg = err.message || "An unexpected error occurred during Astra-chan's drawing evaluation.";
      return res.status(500).json({
        error: errMsg,
      });
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