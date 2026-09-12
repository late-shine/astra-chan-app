import { getCloudJapaneseVoice } from "./voiceCatalog";

export const DEFAULT_GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";

type SynthesizeSpeechInput = {
  text: string;
  voiceId: string;
  speakingRate?: number;
};

export type SynthesizedSpeech = {
  audioContent: string;
  mimeType: "audio/wav";
  voiceId: string;
  model: string;
};

function createWavFromPcm(pcm: Buffer, sampleRate = 24_000, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function describePace(speakingRate: number): string {
  if (speakingRate <= 0.85) return "at a slightly deliberate, learner-friendly pace";
  if (speakingRate >= 1.15) return "at a lively but clearly understandable pace";
  return "at a natural conversational pace";
}

export async function synthesizeGeminiJapaneseSpeech({
  text,
  voiceId,
  speakingRate = 0.8,
}: SynthesizeSpeechInput): Promise<SynthesizedSpeech> {
  const cleanText = text.trim();
  const voice = getCloudJapaneseVoice(voiceId);
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TTS_MODEL || DEFAULT_GEMINI_TTS_MODEL;
  const safeRate = Math.min(1.5, Math.max(0.5, speakingRate));

  if (!cleanText || cleanText.length > 240) {
    const error = new Error("Speech text must contain between 1 and 240 characters.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (!voice) {
    const error = new Error("That Gemini Japanese voice is not available.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (!apiKey) {
    const error = new Error("Gemini Japanese voices are not configured yet.");
    (error as Error & { statusCode?: number }).statusCode = 503;
    throw error;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: `Say in Japanese ${describePace(safeRate)}. Speak exactly this transcript and do not translate or add words:\n${cleanText}`,
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [{ voice: voice.geminiVoice }],
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Gemini TTS returned status ${response.status}`;
    const error = new Error(message);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  const responseData = await response.json();
  const audioPart = responseData.output_audio
    ?? responseData.steps?.flatMap((step: { content?: Array<{ type?: string }> }) => step.content || [])
      .find((part: { type?: string }) => part.type === "audio");
  const audioBase64 = audioPart?.data;
  if (typeof audioBase64 !== "string" || !audioBase64) {
    throw new Error("Gemini TTS returned no audio data.");
  }

  // Gemini returns raw 24 kHz, 16-bit PCM audio. Wrap it in a WAV container
  // so every modern browser can play the result directly.
  const sampleRate = Number(audioPart?.sample_rate) || 24_000;
  const wav = createWavFromPcm(Buffer.from(audioBase64, "base64"), sampleRate);
  return {
    audioContent: wav.toString("base64"),
    mimeType: "audio/wav",
    voiceId: voice.id,
    model,
  };
}
