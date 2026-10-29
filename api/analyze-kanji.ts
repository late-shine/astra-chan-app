/**
 * api/analyze-kanji.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Serverless Function — POST /api/analyze-kanji
 *
 * Proxies canvas drawing data to Google Gemini vision models, trying a fallback
 * chain (see DEFAULT_ANALYSIS_MODELS) inside a fixed time budget.
 * Credentials live exclusively in Vercel Environment Variables — never the client.
 *
 * Required env vars (Vercel Dashboard → Project → Settings → Environment Variables):
 *   GEMINI_API_KEY  — Google AI Studio API key
 *   GEMINI_ANALYSIS_MODELS — optional, comma-separated model ids that replace the
 *                            default chain (first = preferred)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Models are tried in this order. A 429 / 404 comes back almost instantly, so
// putting the high-quality models (small free daily quota) first costs no time:
// when their quota is gone the request simply falls through to the next one.
// Override the whole list without a code change by setting GEMINI_ANALYSIS_MODELS
// in Vercel (comma-separated model ids, first = preferred).
const DEFAULT_ANALYSIS_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
];

function getAnalysisModels(): string[] {
    const configured = (process.env.GEMINI_ANALYSIS_MODELS || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    return configured.length > 0 ? configured : DEFAULT_ANALYSIS_MODELS;
}

// Time budget (vercel.json gives this function 40 s).
const MODEL_TIMEOUT_MS = 11_000;   // one model gets at most this long
const TOTAL_BUDGET_MS = 34_000;    // stop starting new attempts after this
const MIN_ATTEMPT_MS = 2_500;      // not worth starting an attempt with less left

// Gemini 3.x Flash and 2.5 models "think" before answering, which costs seconds
// and eats into maxOutputTokens. Grading a drawing does not need it. Lite models
// are left on their defaults; if a model rejects the setting we retry without it.
function thinkingConfigFor(model: string): Record<string, unknown> | undefined {
    if (/^gemini-3(\.\d+)?-flash$/.test(model)) return { thinkingLevel: "minimal" };
    if (/^gemini-2\.5-flash(-lite)?$/.test(model)) return { thinkingBudget: 0 };
    return undefined;
}

type AnalysisOutcome =
    | { kind: "ok"; data: any }
    | { kind: "http"; status: number; message: string }
    | { kind: "network"; message: string; timedOut: boolean };

type ModelFailure = {
    model: string;
    status: number | null;
    timedOut: boolean;
    message: string;
};

async function requestAnalysis(opts: {
    model: string;
    apiKey: string;
    mimeType: string;
    base64Data: string;
    promptText: string;
    thinking?: Record<string, unknown>;
    timeoutMs: number;
}): Promise<AnalysisOutcome> {
    const signal = AbortSignal.timeout(opts.timeoutMs);
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": opts.apiKey,
                },
                signal,
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { inline_data: { mime_type: opts.mimeType, data: opts.base64Data } },
                                { text: opts.promptText },
                            ],
                        },
                    ],
                    generationConfig: {
                        // Thinking tokens (when a model uses them) count against this.
                        maxOutputTokens: 1024,
                        responseMimeType: "application/json",
                        responseSchema: ANALYSIS_RESPONSE_SCHEMA,
                        ...(opts.thinking ? { thinkingConfig: opts.thinking } : {}),
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData: any = await response.json().catch(() => ({}));
            return {
                kind: "http",
                status: response.status,
                message: errorData?.error?.message || `Gemini ${opts.model} returned status ${response.status}`,
            };
        }

        return { kind: "ok", data: await response.json() };
    } catch (err: unknown) {
        const timedOut =
            signal.aborted ||
            (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"));
        return {
            kind: "network",
            timedOut,
            message: timedOut
                ? `${opts.model} did not answer within ${Math.round(opts.timeoutMs / 1000)}s`
                : err instanceof Error
                    ? err.message
                    : `${opts.model} request failed`,
        };
    }
}

// Pull the JSON object out of a Gemini reply, or return null if it is unusable.
function parseAnalysisReply(data: any): Record<string, any> | null {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;

    const text = parts
        .filter((part: any) => typeof part?.text === "string" && !part.thought)
        .map((part: any) => part.text)
        .join("")
        .trim();
    if (!text) return null;

    const cleanText = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    try {
        const parsed = JSON.parse(cleanText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        if (typeof parsed.advice !== "string" || !parsed.advice.trim()) return null;
        return parsed;
    } catch {
        return null;
    }
}

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    validDrawing: { type: "BOOLEAN" },
    score: { type: "INTEGER" },
    feedbackTitle: { type: "STRING" },
    advice: { type: "STRING" },
  },
  required: ["validDrawing", "score", "feedbackTitle", "advice"],
};

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

        // ─── Walk the model chain inside a hard time budget ───────────────────
        // Vercel kills the function at maxDuration (40 s, see vercel.json) and then
        // answers with a plain-text error page the browser cannot parse as JSON.
        // So every attempt gets its own short timeout, and we stop starting new
        // attempts early enough to still send a clean JSON reply ourselves.
        const startedAt = Date.now();
        const timeLeft = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
        const failures: ModelFailure[] = [];
        let resultObj: any = null;
        let usedModel = "";
        let ranOutOfTime = false;

        for (const model of getAnalysisModels()) {
            if (timeLeft() < MIN_ATTEMPT_MS) {
                ranOutOfTime = true;
                break;
            }

            const thinking = thinkingConfigFor(model);
            let outcome = await requestAnalysis({
                model,
                apiKey,
                mimeType,
                base64Data,
                promptText,
                thinking,
                timeoutMs: Math.min(MODEL_TIMEOUT_MS, timeLeft()),
            });

            // A model that rejects the thinking setting gets one retry without it.
            if (outcome.kind === "http" && outcome.status === 400 && thinking && timeLeft() >= MIN_ATTEMPT_MS) {
                outcome = await requestAnalysis({
                    model,
                    apiKey,
                    mimeType,
                    base64Data,
                    promptText,
                    thinking: undefined,
                    timeoutMs: Math.min(MODEL_TIMEOUT_MS, timeLeft()),
                });
            }

            if (outcome.kind !== "ok") {
                failures.push({
                    model,
                    status: outcome.kind === "http" ? outcome.status : null,
                    timedOut: outcome.kind === "network" && outcome.timedOut,
                    message: outcome.message,
                });
                console.warn(`[analyze-kanji] ${model} failed (${outcome.message}); trying the next model.`);
                continue;
            }

            const parsed = parseAnalysisReply(outcome.data);
            if (!parsed) {
                failures.push({ model, status: null, timedOut: false, message: "returned unusable analysis JSON" });
                console.warn(`[analyze-kanji] ${model} returned unusable analysis JSON; trying the next model.`);
                continue;
            }

            resultObj = parsed;
            usedModel = model;
            break;
        }

        if (!resultObj) {
            console.error("[analyze-kanji] Every analysis model failed.", failures);

            const allRateLimited = failures.length > 0 && failures.every((f) => f.status === 429);
            const anyTimedOut = ranOutOfTime || failures.some((f) => f.timedOut);

            if (allRateLimited && !anyTimedOut) {
                return res.status(429).json({
                    error: "Astra's free AI checks are used up for now (Google's quota). Try again later, or use the offline self-check tips.",
                });
            }
            if (anyTimedOut) {
                return res.status(504).json({
                    error: "Astra's AI checker took too long to answer. Please try again in a moment.",
                });
            }
            return res.status(502).json({
                error: "Astra's AI checker couldn't be reached right now. Please try again in a moment.",
            });
        }
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
            model: usedModel,
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
