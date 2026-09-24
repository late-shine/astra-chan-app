import type { ReactNode } from "react";

interface RecallMaskProps {
  /** When true the content is hidden and a reveal button is shown in its place. */
  masked: boolean;
  onReveal: () => void;
  /** Text on the reveal button, e.g. "Reveal Meaning". */
  label: string;
  /** Optional leading icon for the reveal button. */
  icon?: ReactNode;
  /** accent = clay (meanings), sage = readings. */
  tone?: "accent" | "sage";
  /** md = block-level mask, sm = inline word-row mask. */
  size?: "md" | "sm";
  /** Layout classes for the outer wrapper (min sizes, alignment). */
  className?: string;
  children: ReactNode;
}

const TONE_CLASSES = {
  accent: "border-natural-clay/40 bg-natural-clay/10 text-natural-clay hover:bg-natural-clay/20",
  sage: "border-natural-sage/40 bg-natural-sage/10 text-natural-forest-light hover:bg-natural-sage/20",
} as const;

const SIZE_CLASSES = {
  md: "rounded-xl text-xs font-serif font-extrabold tracking-wide",
  sm: "rounded-lg text-[10px] font-mono font-extrabold",
} as const;

/**
 * Hides study content for recall practice WITHOUT changing layout.
 * The real content always stays in the layout (visibility: hidden) so the space is
 * reserved; the reveal button is laid over it. Hidden content is also removed from
 * the accessibility tree so screen readers can't leak the answer.
 */
export default function RecallMask({
  masked,
  onReveal,
  label,
  icon,
  tone = "accent",
  size = "md",
  className = "",
  children,
}: RecallMaskProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={masked ? "invisible" : undefined} aria-hidden={masked || undefined}>
        {children}
      </div>
      {masked && (
        <button
          type="button"
          onClick={onReveal}
          className={`absolute inset-0 flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border border-dashed transition ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
        >
          {icon}
          {label}
        </button>
      )}
    </div>
  );
}
