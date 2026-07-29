/**
 * api/analyze-kanji.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Serverless Function — POST /api/analyze-kanji
 *
 * Proxies canvas drawing data to Google Gemini 3.1 Flash Lite (vision model).
 * Credentials live exclusively in Vercel Environment Variables — never the client.
 *
 * Required env vars (Vercel Dashboard → Project → Settings → Environment Variables):
 *   GEMINI_API_KEY  — Google AI Studio API key
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ─── Validate credentials ─────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error:
                "Oh no! Astra-chan's magical analysis core is missing its talisman energy! " +
                "Please add GEMINI_API_KEY to your Vercel Environment Variables and redeploy.",
        });
    }

    // ─── Validate request body ────────────────────────────────────────────────
    const { kanji, meaning, imageData } = req.body ?? {};

    if (!kanji || !imageData) {
        return res.status(400).json({
            error: "Missing parameters. Both 'kanji' and 'imageData' are required.",
        });
    }

    try {
        // ─── Build the Astra-chan evaluation prompt ───────────────────────────
        const styles = [
            "Be warm and sisterly, like a tutor cheering on a younger student.",
            "Be playful and magical, like a witch casting a learning spell.",
            "Be precise and focused, like a sensei giving a lesson.",
            "Be enthusiastic and celebratory, like a fan cheering at a match.",
        ];
        const style = styles[Math.floor(Math.random() * styles.length)];

        const promptText =
            `You are evaluating a student's handwritten drawing of the Japanese kanji "${kanji}" (meaning: "${meaning || "unknown"}").\n` +
            `Tone: ${style}\n\n` +
            `Look at the image and evaluate these points:\n` +
            `- Do the strokes match the correct structure of "${kanji}"?\n` +
            `- Are the proportions and balance correct?\n` +
            `- Does the overall shape resemble "${kanji}"?\n\n` +
            `Score from 0 to 100:\n` +
            `90-100 = excellent, matches "${kanji}" very closely\n` +
            `70-89 = good effort, small issues with strokes or proportions\n` +
            `50-69 = recognisable but needs work on specific parts\n` +
            `below 50 = significant issues, needs more practice\n\n` +
            `Write 5-6 sentences of specific feedback. ` +
            `Vary your language — use different encouraging phrases each time. ` +
            `Mention actual parts of the kanji that look good or need fixing. ` +
            `End with one specific actionable tip for improvement.\n\n` +
            `Reply with ONLY this JSON and nothing else:\n` +
            `{"score":<integer 0-100>,"feedbackTitle":"<creative upbeat title under 35 chars>","advice":"<your 5-6 sentence feedback>"}`;

        // ─── Strip data URL prefix, keep raw base64 ──────────────────────────
        const base64Data = imageData.startsWith("data:")
            ? imageData.split(",")[1]
            : imageData;

        // Detect mime type from data URL (default to png)
        const mimeType = imageData.startsWith("data:")
            ? imageData.split(";")[0].split(":")[1]
            : "image/png";

        // ─── Call Gemini 3.1 Flash Lite ───────────────────────────────────────
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
                                {
                                    text: promptText,
                                },
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
            throw new Error(
                errorData.error?.message ||
                `Gemini API returned status ${response.status}`
            );
        }

        const responseData = await response.json();

        // Gemini returns text inside candidates[0].content.parts[0].text
        const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!replyText) {
            throw new Error("Empty response received from Gemini API.");
        }

        // Strip any accidental markdown fences before parsing
        const cleanText = replyText
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "");

        const resultObj = JSON.parse(cleanText);

        // Returns identical shape to original — frontend code unchanged
        return res.json(resultObj);

    } catch (err: unknown) {
        console.error("[analyze-kanji] Gemini API error:", err);
        const message =
            err instanceof Error
                ? err.message
                : "An unexpected error occurred during Astra-chan's drawing evaluation.";
        return res.status(500).json({ error: message });
    }
}
