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
            `First, decide whether the image contains a genuine handwritten or mouse-drawn attempt at the requested kanji. ` +
            `A blank canvas, typed text, a chat message, a screenshot of text, an unrelated image, or an almost-empty mark is NOT a valid drawing.\n` +
            `If it is not a valid drawing, set "validDrawing" to false and score it exactly 0. ` +
            `This is a gentle boundary, not a punishment: do not award practice points for a non-drawing, and invite the student to draw inside the grid.\n` +
            `If it is a genuine drawing, set "validDrawing" to true and grade the handwriting normally from 0 to 100. ` +
            `A real but very weak attempt may receive a low score; reserve 0 for no usable drawing at all.\n\n` +
            `Look at the image and evaluate these points:\n` +
            `- Do the strokes match the correct structure of "${kanji}"?\n` +
            `- Are the proportions and balance correct?\n` +
            `- Does the overall shape resemble "${kanji}"?\n\n` +
            `Score from 0 to 100:\n` +
            `90-100 = excellent, matches "${kanji}" very closely\n` +
            `70-89 = good effort, small issues with strokes or proportions\n` +
            `50-69 = recognisable but needs work on specific parts\n` +
            `below 50 = significant issues, needs more practice\n\n` +
            `For a valid drawing, write 5-6 sentences of specific feedback. ` +
            `Vary your language — use different encouraging phrases each time. ` +
            `Mention actual parts of the kanji that look good or need fixing. ` +
            `End with one specific actionable tip for improvement.\n\n` +
            `For an invalid drawing, write only 2-4 gentle, playful sentences and choose one of these ideas (rewrite it naturally rather than copying it exactly):\n` +
            `- "Astra's ink sprites found a message instead of brush strokes. Please draw the kanji in the grid!"\n` +
            `- "Cute attempt to chat with Astra, scholar, but the brushwork exam needs actual handwriting."\n` +
            `- "The little ink station is waiting for your strokes. Give me a real try and I will inspect it happily!"\n` +
            `- "No grade this time — my calligraphy crystal needs to see your pen or mouse strokes first."\n` +
            `Keep the rejection warm, never scolding, and clearly explain that the student can try again.\n\n` +
            `Reply with ONLY this JSON and nothing else:\n` +
            `{"validDrawing":<true-or-false>,"score":<integer 0-100>,"feedbackTitle":"<creative title under 35 chars>","advice":"<feedback>"}`;

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
        const validDrawing = resultObj.validDrawing === true;
        const rawScore = Number(resultObj.score);
        const score = validDrawing
            ? Number.isFinite(rawScore)
                ? Math.max(0, Math.min(100, Math.round(rawScore)))
                : 0
            : 0;

        // Invalid submissions always use the explicit 0% boundary, even if
        // the model accidentally returned a non-zero score.
        return res.json({
            ...resultObj,
            validDrawing,
            score,
        });

    } catch (err: unknown) {
        console.error("[analyze-kanji] Gemini API error:", err);
        const message =
            err instanceof Error
                ? err.message
                : "An unexpected error occurred during Astra-chan's drawing evaluation.";
        return res.status(500).json({ error: message });
    }
}
