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

const ANALYSIS_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
] as const;

function shouldTryNextAnalysisModel(status: number): boolean {
    return status === 404 || status === 408 || status === 429 || status >= 500;
}

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
        const promptText =
            "You are evaluating a student's handwritten or mouse-drawn Japanese kanji attempt.\n" +
            "The requested kanji is \"" + kanji + "\" (meaning: \"" + (meaning || "unknown") + "\").\n\n" +
            "Astra's voice: You are a clever, slightly mischievous tutor. Be warm and fundamentally on the student's side, but not relentlessly cheerful. " +
            "Sound like a real character with dry, concise humor—not a customer-support agent pretending to be an anime character. " +
            "Aim for 90% tutor and 10% menace. You may tease a funny mistake or an unrelated drawing, but never belittle the learner. " +
            "Do not force a joke into every response.\n" +
            "Avoid generic AI fluff and canned praise such as \"great effort,\" \"your brush has imagination,\" or \"let's guide that confidence.\" " +
            "React to what is actually visible before giving a concrete correction.\n\n" +
            "First, decide whether the image contains a genuine handwritten or mouse-drawn attempt at the requested kanji. " +
            "A blank canvas, typed text, a written name or word, a chat message, a screenshot of text, an unrelated image, or an almost-empty mark is NOT a valid drawing.\n" +
            "If it is not a valid drawing, set \"validDrawing\" to false and score it exactly 0. " +
            "This is a gentle boundary, not a punishment: explain that Astra needs actual strokes and invite the student to try again inside the grid.\n" +
            "If it is a genuine drawing, set \"validDrawing\" to true and grade the handwriting normally from 0 to 100. " +
            "A real but very weak attempt may receive a low score; reserve 0 for no usable drawing at all.\n\n" +
            "Look at the image and evaluate these points:\n" +
            "- Do the strokes match the correct structure of \"" + kanji + "\"?\n" +
            "- Are the proportions, spacing, balance, and stroke direction reasonable?\n" +
            "- Does the overall shape resemble \"" + kanji + "\"?\n" +
            "- If the student appears to have drawn a different recognizable kanji, name it only when you are genuinely confident.\n\n" +
            "Score from 0 to 100:\n" +
            "90-100 = excellent, matches the requested kanji very closely\n" +
            "70-89 = good, with small issues in strokes or proportions\n" +
            "50-69 = recognizable but needs work on specific parts\n" +
            "below 50 = significant issues and more practice needed\n\n" +
            "For a valid drawing, write usually 1-3 concise sentences, or up to 4 only when specific correction requires it. " +
            "Identify what you actually see, mention a concrete strength or problem, and end with one actionable tip. " +
            "For a nearly correct drawing, understated approval is better than a motivational speech.\n" +
            "For an invalid drawing, write 1-3 concise, playful sentences that clearly ask for real handwriting. " +
            "Examples of the voice (rewrite naturally; do not copy mechanically):\n" +
            "- Wrong kanji: \"Scholar... that is 星. A very respectable star. Unfortunately, I asked for a river. Try 川 again—three vertical strokes. No astronomy this time.\"\n" +
            "- Name or text: \"I appreciate the tribute, but writing my name is not going to fool the grading crystal. The answer is 川. Three strokes. Go on.\"\n" +
            "- Nonsense: \"Scholar, what exactly happened here? I see determination. I do not see 川. Reset. Three strokes. We shall pretend this never happened.\"\n" +
            "- Sloppy attempt: \"Easy, scholar. The river isn't running away. Slow your strokes down and give each one some space.\"\n" +
            "- Blank canvas: \"Is this an advanced technique I haven't heard of? Put some ink on the canvas, scholar. Then I'll have something to judge.\"\n" +
            "Keep the learner's dignity intact. Tease the attempt, never the person. Do not claim to remember previous attempts or create callback jokes unless that context is provided.\n\n" +
            "Reply with ONLY this JSON and nothing else:\n" +
            "{\"validDrawing\":<true-or-false>,\"score\":<integer 0-100>,\"feedbackTitle\":\"<creative title under 35 chars>\",\"advice\":\"<feedback>\"}";

        // ─── Strip data URL prefix, keep raw base64 ──────────────────────────
        const base64Data = imageData.startsWith("data:")
            ? imageData.split(",")[1]
            : imageData;

        // Detect mime type from data URL (default to png)
        const mimeType = imageData.startsWith("data:")
            ? imageData.split(";")[0].split(":")[1]
            : "image/png";

        // ─── Try the preferred model, then fall back on transient/model errors ─
        let responseData: any;
        let lastError: Error | null = null;

        for (const model of ANALYSIS_MODELS) {
            let response: Response;
            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
                            },
                        }),
                    }
                );
            } catch (err: unknown) {
                lastError = err instanceof Error
                    ? err
                    : new Error(`Gemini ${model} request failed.`);
                console.warn(`[analyze-kanji] ${model} request failed; trying the next model.`, lastError);
                continue;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                lastError = new Error(
                    errorData.error?.message ||
                    `Gemini ${model} returned status ${response.status}`
                );

                if (!shouldTryNextAnalysisModel(response.status)) {
                    throw lastError;
                }

                console.warn(
                    `[analyze-kanji] ${model} returned ${response.status}; trying the next model.`
                );
                continue;
            }

            try {
                responseData = await response.json();
                break;
            } catch (err: unknown) {
                lastError = err instanceof Error
                    ? err
                    : new Error(`Gemini ${model} returned invalid JSON.`);
                console.warn(`[analyze-kanji] ${model} returned invalid JSON; trying the next model.`);
            }
        }

        if (!responseData) {
            throw lastError || new Error("All Gemini analysis models failed.");
        }

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
