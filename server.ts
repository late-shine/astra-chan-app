import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import type { VercelRequest, VercelResponse } from "@vercel/node";
// The local dev server runs the exact same handlers as production (Vercel), so
// model lists, time budgets and error messages can never drift apart again.
import analyzeKanjiHandler from "./api/analyze-kanji";
import synthesizeSpeechHandler from "./api/synthesize-speech";

// Ensure environment variables are loaded (the handlers read them per request)
dotenv.config();

type ApiHandler = (req: VercelRequest, res: VercelResponse) => unknown;

// Express's req/res are close enough to Vercel's (req.body, req.headers,
// res.status().json()) for these two handlers.
function mountApi(app: express.Express, route: string, handler: ApiHandler) {
  app.post(route, async (req, res) => {
    try {
      await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    } catch (err: unknown) {
      console.error(`[server] ${route} crashed:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: err instanceof Error ? err.message : "An unexpected server error occurred.",
        });
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support high-resolution drawing submissions
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API: Gemini Japanese TTS (see api/synthesize-speech.ts). The Gemini
  // credential remains server-side; the browser only receives audio bytes.
  mountApi(app, "/api/synthesize-speech", synthesizeSpeechHandler);

  // API: Kanji drawing evaluation (see api/analyze-kanji.ts).
  mountApi(app, "/api/analyze-kanji", analyzeKanjiHandler);

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
