/**
 * api/analyze-kanji.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Serverless Function — POST /api/analyze-kanji
 *
 * Proxies canvas drawing data to Cloudflare Workers AI (Llama 3.2 11B Vision).
 * Credentials live exclusively in Vercel Environment Variables — never the client.
 *
 * Required env vars (Vercel Dashboard → Project → Settings → Environment Variables):
 *   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN   — Workers AI API token (Workers AI : Edit permission)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ─── Validate credentials ─────────────────────────────────────────────────
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken  = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
        return res.status(500).json({
            error:
                "Oh no! Astra-chan's magical analysis core is missing its talisman energy! " +
                "Please add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to your " +
                "Vercel Environment Variables and redeploy.",
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
            `You are Astra-chan (アストラちゃん), an enthusiastic and cute magical-girl mascot ` +
            `who guides students through learning Japanese.\n` +
            `Analyze the user's handwritten/drawn attempt for the Kanji character "${kanji}" ` +
            `(meaning: "${meaning || "unknown"}").\n\n` +
            `Compare their drawing to the correct structure, strokes, proportions, and balance of "${kanji}".\n` +
            `Score 0-100. 90-100=near perfect, 70-89=good minor issues, 50-69=recognisable with mistakes, below 50=significant problems.\n\n` +
            `Mention specific strokes or parts. Never say just "keep practicing" without specifics.\n` +
            `Respond with ONLY this JSON, no other text:\n` +
            `{"score":<integer 0-100>,"feedbackTitle":"<upbeat title under 35 chars>","advice":"<2-3 sentences of specific feedback about this drawing>"}`;

        // ─── Convert base64 image → uint8 array (Cloudflare Workers AI format) ─
        const base64Data = imageData.startsWith("data:")
            ? imageData.split(",")[1]
            : imageData;
        const imageBytes = Array.from(Buffer.from(base64Data, "base64"));

        // ─── Call Cloudflare Workers AI — Llama 3.2 11B Vision ─────────────
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    image: imageBytes,
                    prompt: promptText,
                    max_tokens: 600,
                    agree: "yes",
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.errors?.[0]?.message ||
                `Cloudflare Workers AI returned status ${response.status}`
            );
        }

        const responseData = await response.json();

        // Cloudflare returns the text inside result.description
        const replyText = responseData.result?.description;
        if (!replyText) {
            throw new Error("Empty response received from Cloudflare Workers AI.");
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
        console.error("[analyze-kanji] Cloudflare Workers AI error:", err);
        const message =
            err instanceof Error
                ? err.message
                : "An unexpected error occurred during Astra-chan's drawing evaluation.";
        return res.status(500).json({ error: message });
    }
}