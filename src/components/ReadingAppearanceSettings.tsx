import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { bookPalettes, landscapeWindows, studyWindows, type ReadingAppearance } from "../reading/appearancePreferences";

const names = {
  follow: ["Follow Study Room", "学習室に合わせる"],
  "misty-sakura": ["Misty Sakura Path", "霞む桜並木"], "sakura-train": ["Sakura Train", "桜の列車"],
  "night-sparkler": ["Night Sparkler", "夜の線香花火"], "rainy-window": ["Rainy Window", "雨の窓辺"],
  "forgotten-railway": ["Forgotten Railway", "忘れられた鉄道"], "morning-lilies": ["Morning Lilies", "朝のユリ"],
  "quiet-afternoon": ["Quiet Afternoon", "静かな午後"], lamplight: ["Lamplight", "灯火"], moss: ["Moss & Linen", "苔とリネン"],
  moonlight: ["Moonlit Ink", "月夜のインク"],
};

export function ReadingAppearanceSettings({ value, change, ja }: {
  value: ReadingAppearance; change: (patch: Partial<ReadingAppearance>) => void; ja: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const label = (id: keyof typeof names) => names[id][ja ? 1 : 0];
  const option = (id: ReadingAppearance["readingWindow"]) => <option key={id} value={id}>{label(id)}</option>;
  const keepOpen = (patch: Partial<ReadingAppearance>) => {
    change(patch);
    setOpen(true);
  };
  return <div ref={container} className="book-appearance" onKeyDown={event => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      container.current?.querySelector<HTMLButtonElement>(".book-appearance-trigger")?.focus();
    }
  }} onBlur={event => {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" className="book-appearance-trigger" aria-expanded={open} aria-controls="reading-appearance-panel"
      aria-label={ja ? "読書室の外観" : "Reading Room appearance"} onClick={() => setOpen(value => !value)}>
      <SlidersHorizontal /><span>{ja ? "外観" : "Appearance"}</span>
    </button>
    {open && <div id="reading-appearance-panel" className="book-appearance-panel">
      <label>{ja ? "窓の風景" : "Window scene"}
        <select value={value.readingWindow} onChange={e => keepOpen({ readingWindow: e.target.value as ReadingAppearance["readingWindow"] })}>
          {option("follow")}
          <optgroup label={ja ? "固定の風景 · 学習室" : "Still views · Study Room"}>{studyWindows.map(option)}</optgroup>
          <optgroup label={ja ? "固定の風景 · クイズ" : "Still views · Quiz landscapes"}>{landscapeWindows.map(option)}</optgroup>
        </select>
      </label>
      <fieldset><legend>{ja ? "本の配色" : "Book palette"}</legend>
        <div className="book-swatches">{bookPalettes.map(id => <button type="button" key={id} aria-pressed={value.readingPalette === id}
          onClick={() => keepOpen({ readingPalette: id })}>
          <i aria-hidden="true" data-swatch={id} />{label(id)}
        </button>)}</div>
      </fieldset>
      <label>{ja ? "風景の切り替え" : "Scene transition"}
        <select value={value.readingTransition} onChange={e => keepOpen({ readingTransition: e.target.value as ReadingAppearance["readingTransition"] })}>
          <option value="dissolve">{ja ? "ゆっくり溶け合う" : "Soft dissolve"}</option>
          <option value="instant">{ja ? "即時" : "Instant"}</option>
        </select>
      </label>
    </div>}
  </div>;
}
