/**
 * api/analyze-kanji.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Serverless Function — POST /api/analyze-kanji
 *
 * Securely proxies canvas drawing data to OpenRouter (calling Gemini Vision).
 * The OPENROUTER_API_KEY environment variable is stored exclusively in
 * Vercel's Environment Variables panel and is NEVER exposed to the client.
 *
 * Deploy:
 * 1. Push this file to your repo (Vercel auto-discovers api/ functions).
 * 2. In Vercel Dashboard → Project → Settings → Environment Variables
 * add:  OPENROUTER_API_KEY = <your key>
 * 3. Redeploy — done! The key is invisible to the browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only POST is accepted
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ─── Validate environment variable ───────────────────────────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error:
                "Oh no! Astra-chan's magical analysis core couldn't find her special " +
                "secret talisman energy (missing OPENROUTER_API_KEY). " +
                "Please add it to your Vercel Environment Variables and redeploy!"
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
        // ─── Build the Astra-chan evaluation prompt ───────────────────────────────
        const promptText =
            `You are Astra-chan (アストラちゃん), an enthusiastic and cute magical-girl mascot ` +
            `who guides students through learning Japanese.\n` +
            `Analyze the user's handwritten/drawn attempt for the Kanji character "${kanji}" ` +
            `(which represents translation meaning: "${meaning || "unknown"}").\n\n` +
            `Compare their drawing (provided as an image) to the official structural strokes, ` +
            `proportions, balancing, and intersections of correct "${kanji}".\n` +
            `Determine an accuracy percentage score from 0 to 100. Be fair but encouraging! ` +
            `(e.g. if details are slightly wavy but trace the outline, give 75-85%; if it's ` +
            `exceptionally drawn give 90-98%; if it's just a scribble or wrong character, give a low score).\n\n` +
            `Provide detailed critique and tips (e.g., checking proportions, line lengths, brush ` +
            `intersections, or order) inside "advice".\n` +
            `Add a cute energetic summary title in "feedbackTitle" like "Wonderful Stroke Work!", ` +
            `"Terrific Effort!", or "A Tiny Bit Off-Balance!".\n\n` +
            `Your response MUST be a single raw JSON-compliant object matching the requested schema.`;

        // ─── Call OpenRouter with Structured Outputs ─────────────────────────────
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // FIX: Use the real production URL so OpenRouter analytics are accurate
                "HTTP-Referer": "https://astra-kanji-tutor.vercel.app",
                "X-Title": "Astra-chan Kana Quest"
            },
            body: JSON.stringify({
                // Calling Gemini 2.0 Flash through OpenRouter's routing layer
                model: "google/gemini-2.0-flash",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: promptText
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    // OpenRouter reads the standard Data-URL format directly!
                                    url: imageData
                                }
                            }
                        ]
                    }
                ],
                // FIX: Use json_schema (not json_object) — this is the correct OpenRouter
                // structured output format that actually enforces the schema.
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

        // OpenRouter returns results inside choices[0].message.content
        const replyText = responseData.choices?.[0]?.message?.content;
        if (!replyText) {
            throw new Error("Empty response received from OpenRouter.");
        }

        const resultObj = JSON.parse(replyText.trim());

        // Returns identical JSON object format so your frontend code stays perfectly intact!
        return res.json(resultObj);

    } catch (err: unknown) {
        console.error("[analyze-kanji] OpenRouter API error:", err);
        const message =
            err instanceof Error
                ? err.message
                : "An unexpected error occurred during Astra-chan's drawing evaluation.";
        return res.status(500).json({ error: message });
    }
}
