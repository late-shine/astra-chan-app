export type CloudJapaneseVoice = {
  id: string;
  label: string;
  style: string;
  tier: "Gemini 2.5 Flash TTS";
  geminiVoice: string;
  description: string;
};

// Keep this catalog explicit so the UI is stable across Chrome, Edge, and
// operating systems. The IDs retain the earlier Cloud-TTS-shaped names so
// existing saved preferences are not silently broken while the provider moves
// to Gemini.
export const CLOUD_JAPANESE_VOICES: CloudJapaneseVoice[] = [
  {
    id: "ja-JP-Chirp3-HD-Sulafat",
    label: "Sulafat",
    style: "Warm",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Sulafat",
    description: "Warm, expressive, and lively",
  },
  {
    id: "ja-JP-Chirp3-HD-Achernar",
    label: "Achernar",
    style: "Soft",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Achernar",
    description: "Soft and gentle",
  },
  {
    id: "ja-JP-Chirp3-HD-Achird",
    label: "Achird",
    style: "Friendly",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Achird",
    description: "Friendly and conversational",
  },
  {
    id: "gemini-Kore",
    label: "Kore",
    style: "Firm",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Kore",
    description: "Clear and composed",
  },
  {
    id: "gemini-Leda",
    label: "Leda",
    style: "Youthful",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Leda",
    description: "Bright and youthful",
  },
  {
    id: "gemini-Puck",
    label: "Puck",
    style: "Upbeat",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Puck",
    description: "Energetic and cheerful",
  },
  {
    id: "gemini-Aoede",
    label: "Aoede",
    style: "Breezy",
    tier: "Gemini 2.5 Flash TTS",
    geminiVoice: "Aoede",
    description: "Light and natural",
  },
];

export const DEFAULT_CLOUD_JAPANESE_VOICE = "ja-JP-Chirp3-HD-Sulafat";

export function getCloudJapaneseVoice(id: string): CloudJapaneseVoice | undefined {
  return CLOUD_JAPANESE_VOICES.find((voice) => voice.id === id);
}
