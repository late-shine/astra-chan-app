// Quiz Remake QZ1: the "Modern Japanese Studio" frame.
//
// Presentational only. StudioShell draws the opaque studio backdrop, the compact header slot, ONE
// scrolling region, and the sticky footer that lives INSIDE that region (not a detached fixed bar).
// All colours come from the --quiz-* tokens in src/index.css, which are scoped to `.quiz-studio`.
// Nothing here reads stats, storage, SRS or the network.
//
// Also exported: StudioHeader (52 px compact header), StudioSheet (bottom sheet below 768 px, centred
// dialog from 768 px; focus trap, Escape, focus returns to the launcher) and StudioMark (the small
// four-point Astra star).

import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { ChevronLeft, X } from "lucide-react";
import type { QuizThemeId } from "./viewTypes";

/* ───────────────────────────── Astra mark ───────────────────────────── */

/** A tiny four-point star. Decorative: always aria-hidden. Colour comes from `currentColor`. */
export function StudioMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2C12.8 7.6 16.4 11.2 22 12C16.4 12.8 12.8 16.4 12 22C11.2 16.4 7.6 12.8 2 12C7.6 11.2 11.2 7.6 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ───────────────────────────── Shell ───────────────────────────── */

export type StudioWidth = "home" | "player" | "results" | "setup";

export interface StudioShellProps {
  /** Accessible name of the whole studio region, e.g. "Practice" or "Practice question". */
  label: string;
  /** Rendered above the scrolling region and never scrolls. */
  header?: ReactNode;
  children: ReactNode;
  /** Sticky footer inside the scrolling region. Gets the dock clearance below its actions. */
  footer?: ReactNode;
  /** Sheets / dialogs. Rendered after the content so they stack above it. */
  overlay?: ReactNode;
  /** Optional theme override. Omit it and the studio follows the app's data-theme on <html>. */
  themeId?: QuizThemeId;
  /** Forces the reduced-motion rules (the OS setting is honoured separately in CSS). */
  reducedMotion?: boolean;
  /** True while the on-screen keyboard is open: the footer drops the dock clearance so the action stays reachable. */
  keyboardOpen?: boolean;
  /** True while a sheet is open: the header and page become inert so focus cannot leave the dialog. */
  modalOpen?: boolean;
  /** Which max-width the page column uses (Practice 1040, player 760, results 880, setup 720). */
  width?: StudioWidth;
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export function StudioShell({
  label,
  header,
  children,
  footer,
  overlay,
  themeId,
  reducedMotion,
  keyboardOpen,
  modalOpen,
  width = "home",
  scrollRef,
}: StudioShellProps) {
  return (
    <div
      className="quiz-studio"
      role="region"
      aria-label={label}
      data-theme={themeId}
      data-motion={reducedMotion ? "reduced" : undefined}
      data-keyboard={keyboardOpen ? "open" : undefined}
      data-footer={footer ? "true" : "false"}
      data-width={width}
    >
      <div className="quiz-studio__body" inert={modalOpen ? true : undefined}>
        {header}
        <div className="quiz-scroll" ref={scrollRef}>
          <div className="quiz-page">{children}</div>
          {footer}
        </div>
      </div>
      {overlay}
    </div>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

export interface StudioHeaderProps {
  /** Accessible name of the left control: "Exit practice", "Back to Study Room". */
  backLabel: string;
  onBack: () => void;
  /** "close" shows an X (leaving a running practice); "back" shows a chevron. */
  backIcon?: "close" | "back";
  /** The middle slot: progress and the small subject label, or a title. */
  children?: ReactNode;
  /** The right slot: the More menu. */
  trailing?: ReactNode;
  /** A thin bar under the header, 0..1. Decorative; the text progress carries the meaning. */
  progress?: number;
}

export function StudioHeader({ backLabel, onBack, backIcon = "back", children, trailing, progress }: StudioHeaderProps) {
  return (
    <header className="quiz-header">
      <div className="quiz-header__row">
        <button type="button" className="quiz-icon-btn" onClick={onBack} aria-label={backLabel}>
          {backIcon === "close" ? <X aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        </button>
        <div className="quiz-header__center">{children}</div>
        <div className="quiz-header__trail">{trailing}</div>
      </div>
      {typeof progress === "number" && (
        <div className="quiz-progress" aria-hidden="true">
          <div className="quiz-progress__fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      )}
    </header>
  );
}

/* ───────────────────────────── Sheet / dialog ───────────────────────────── */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface StudioSheetProps {
  title: string;
  onClose: () => void;
  /** Scrolling body. */
  children: ReactNode;
  /** Persistent footer (the Start button). Never scrolls away. */
  footer?: ReactNode;
  /** "setup" is max 720 px on desktop; "compact" is max 480 px. */
  size?: "setup" | "compact";
  closeLabel?: string;
  /** The launcher that opened the sheet. Focus returns here on close; falls back to whatever had focus. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function StudioSheet({ title, onClose, children, footer, size = "setup", closeLabel = "Close", returnFocusRef }: StudioSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Keep the newest onClose without re-running the focus effect.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Captured during the FIRST RENDER, before the shell marks the page inert (which would move focus to <body>).
  const openerRef = useRef<HTMLElement | null>(typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      // Return focus to the launcher once the dialog is gone (it may have re-rendered, so the explicit ref wins).
      const target = returnFocusRef?.current ?? openerRef.current;
      if (target && typeof target.focus === "function" && document.contains(target)) target.focus({ preventScroll: true });
    };
    // Runs once per open sheet.
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      closeRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const items: HTMLElement[] = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    const visibleItems = items.filter((el) => el.getClientRects().length > 0);
    if (visibleItems.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = visibleItems[0];
    const last = visibleItems[visibleItems.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="quiz-sheet-scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="quiz-sheet"
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="quiz-sheet__head">
          <h2 id={titleId} className="quiz-sheet__title">
            {title}
          </h2>
          <button type="button" className="quiz-icon-btn" onClick={onClose} aria-label={closeLabel}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="quiz-sheet__body">{children}</div>
        {footer && <div className="quiz-sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────────── Shared controls ───────────────────────────── */

export interface StudioSegmentedOption<T extends string | number> {
  id: T;
  label: string;
  hint?: string;
}

export interface StudioSegmentedProps<T extends string | number> {
  /** Accessible name of the group, e.g. "Subject". */
  label: string;
  options: StudioSegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Visible columns on a phone. Wraps instead of truncating. */
  columns?: 2 | 3 | 4;
}

/** A single-choice group of toggle buttons (aria-pressed, as S2.4 allows for setup selections). */
export function StudioSegmented<T extends string | number>({ label, options, value, onChange, columns }: StudioSegmentedProps<T>) {
  return (
    <div className="quiz-seg" role="group" aria-label={label} data-cols={columns ?? Math.min(options.length, 4)}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={String(option.id)}
            type="button"
            className="quiz-seg__btn"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
          >
            <span className="quiz-seg__label">{option.label}</span>
            {option.hint && <span className="quiz-seg__hint">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface StudioSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}

/** An on/off setting. Says "On" or "Off" in words, so state never relies on colour or thumb position alone. */
export function StudioSwitch({ checked, onChange, label, description }: StudioSwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="quiz-switch" onClick={() => onChange(!checked)}>
      <span className="quiz-switch__text">
        <span className="quiz-switch__label">{label}</span>
        {description && <span className="quiz-help">{description}</span>}
      </span>
      <span className="quiz-switch__state" aria-hidden="true">
        {checked ? "On" : "Off"}
      </span>
      <span className="quiz-switch__track" aria-hidden="true">
        <span className="quiz-switch__thumb" />
      </span>
    </button>
  );
}
