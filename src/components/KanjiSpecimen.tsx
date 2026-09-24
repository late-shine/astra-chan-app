import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { KANJI_FORM_NOTICES } from "../kanjiFormNotices";

/**
 * KanjiSpecimen — the big kanji on the study card, with a local Form control.
 *
 *  Digital : Noto Sans JP (printed / screen form)
 *  Written : Klee One     (textbook handwriting style)
 *  Compare : both, side by side, identical frame + grid + size
 *
 * The form is LOCAL to this component (remembered in localStorage) and independent of
 * the app-wide Digital/Written font preference, which keeps styling all other Japanese
 * text. The stage has a fixed height, so switching form never resizes the card.
 *
 * API FOR B2 (stroke data)
 * ------------------------
 * Every frame is an SVG with viewBox "0 0 109 109" — the same coordinate space as
 * KanjiVG. Pass SVG children (e.g. <path d="…" />) as `strokeLayer` and they are drawn
 * over the glyph in every visible frame, so the authoritative stroke reference sits on
 * top of both fonts. The font glyph is only a visual comparison, never the stroke order.
 */
export type KanjiForm = "digital" | "written" | "compare";
type SingleForm = Exclude<KanjiForm, "compare">;

export interface KanjiSpecimenProps {
  kanji: string;
  /** Speaks the character; the speaker button only renders when provided. */
  onSpeak?: () => void;
  /** SVG children in a 109×109 viewBox (B2). Rendered above the glyph in each frame. */
  strokeLayer?: ReactNode;
  /** One-line "notice this" note. Defaults to KANJI_FORM_NOTICES[kanji]. */
  notice?: string;
}

const STORAGE_KEY = "astra_kanji_form";
const FORMS: { id: KanjiForm; label: string; hint: string }[] = [
  { id: "digital", label: "Digital", hint: "Printed form (Noto Sans JP)" },
  { id: "written", label: "Written", hint: "Textbook handwriting style (Klee One)" },
  { id: "compare", label: "Compare", hint: "Both forms side by side" },
];
const FRAME_META: Record<SingleForm, { fontClass: string; name: string }> = {
  digital: { fontClass: "kz-form-digital", name: "Noto Sans JP" },
  written: { fontClass: "kz-form-written", name: "Klee One" },
};

function readInitialForm(): KanjiForm {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "digital" || saved === "written" || saved === "compare") return saved;
  } catch {
    /* storage unavailable: fall through to the app-wide preference */
  }
  // First visit: start from the app-wide font preference so nothing looks different.
  return typeof document !== "undefined" && document.documentElement.classList.contains("font-written")
    ? "written"
    : "digital";
}

interface FrameProps {
  form: SingleForm;
  kanji: string;
  strokeLayer?: ReactNode;
  fallback: boolean;
}

function SpecimenFrame({ form, kanji, strokeLayer, fallback }: FrameProps) {
  const meta = FRAME_META[form];
  return (
    <div className="kz-specimen-item">
      <div className="kz-specimen-frame relative rounded-xl border-2 border-natural-border bg-natural-bg/50">
        <svg
          viewBox="0 0 109 109"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${kanji} in ${meta.name}`}
        >
          {/* Identical practice grid in every frame: centre cross + diagonals */}
          <g className="text-natural-border" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" fill="none" opacity="0.7">
            <line x1="54.5" y1="2" x2="54.5" y2="107" />
            <line x1="2" y1="54.5" x2="107" y2="54.5" />
            <line x1="2" y1="2" x2="107" y2="107" />
            <line x1="107" y1="2" x2="2" y2="107" />
          </g>
          <motion.g
            key={kanji}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: "54.5px 54.5px" }}
          >
            {/* em-box centred, so both fonts sit on the same centre regardless of font metrics */}
            <text
              x="54.5"
              y="54.5"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="88"
              className={`${meta.fontClass} select-text fill-natural-charcoal`}
            >
              {kanji}
            </text>
          </motion.g>
          {strokeLayer}
        </svg>
      </div>
      {/* Short label always; the font name joins it where there is room (md and up) */}
      <p className="kz-specimen-caption kz-label" title={fallback ? `${meta.name} unavailable, showing a system font` : meta.name}>
        {form === "digital" ? "Digital" : "Written"}
        {fallback ? (
          <span className="normal-case tracking-normal"> · fallback font</span>
        ) : (
          <span className="hidden normal-case tracking-normal md:inline"> · {meta.name}</span>
        )}
      </p>
    </div>
  );
}

export default function KanjiSpecimen({ kanji, onSpeak, strokeLayer, notice }: KanjiSpecimenProps) {
  const [form, setForm] = useState<KanjiForm>(readInitialForm);
  const [fontOk, setFontOk] = useState<Record<SingleForm, boolean>>({ digital: true, written: true });

  const chooseForm = (next: KanjiForm) => {
    setForm(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not fatal: the choice just won't be remembered */
    }
  };

  // Ask the browser for exactly these glyphs in each face; if a face can't supply them
  // (offline, blocked, missing glyph) say so instead of silently comparing a fallback.
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    Promise.all([
      document.fonts.load('700 88px "Noto Sans JP"', kanji),
      document.fonts.load('600 88px "Klee One"', kanji),
    ])
      .then(([digital, written]) => {
        if (!cancelled) setFontOk({ digital: digital.length > 0, written: written.length > 0 });
      })
      .catch(() => {
        if (!cancelled) setFontOk({ digital: false, written: false });
      });
    return () => {
      cancelled = true;
    };
  }, [kanji]);

  const note = notice ?? KANJI_FORM_NOTICES[kanji];
  const visible: SingleForm[] = form === "compare" ? ["digital", "written"] : [form];

  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div className="relative w-full">
        <div className="kz-specimen-stage" data-compare={form === "compare"}>
          {visible.map((single) => (
            <span key={single} className="contents">
              <SpecimenFrame
                form={single}
                kanji={kanji}
                strokeLayer={strokeLayer}
                fallback={!fontOk[single]}
              />
            </span>
          ))}
        </div>

        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            className="absolute right-0 top-0 cursor-pointer rounded-lg p-1.5 text-natural-forest transition hover:bg-natural-forest/10"
            title="Speak character"
            aria-label="Speak character"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Form control: local to the specimen, three explicit states */}
      <div
        role="radiogroup"
        aria-label="Kanji form"
        className="inline-flex rounded-xl border border-natural-border bg-natural-bg/50 p-0.5"
      >
        {FORMS.map((option) => {
          const active = form === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.hint}
              onClick={() => chooseForm(option.id)}
              className={`cursor-pointer rounded-[0.6rem] px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider transition ${
                active
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-natural-forest"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {note && (
        <p className="text-center text-xs font-medium leading-snug text-natural-forest-light">
          <span className="kz-label text-natural-clay">Notice </span>
          {note}
        </p>
      )}
    </div>
  );
}
