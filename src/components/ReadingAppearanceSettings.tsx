import { useRef } from "react";
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
  const details = useRef<HTMLDetailsElement>(null);
  const label = (id: keyof typeof names) => names[id][ja ? 1 : 0];
  const option = (id: ReadingAppearance["readingWindow"]) => <option key={id} value={id}>{label(id)}</option>;
  return <details ref={details} className="book-appearance" onKeyDown={event => {
    if (event.key === "Escape" && details.current?.open) {
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }}>
    <summary aria-label={ja ? "読書室の外観" : "Reading Room appearance"}><SlidersHorizontal /><span>{ja ? "外観" : "Appearance"}</span></summary>
    <div className="book-appearance-panel">
      <label>{ja ? "窓の風景" : "Window scene"}
        <select value={value.readingWindow} onChange={e => change({ readingWindow: e.target.value as ReadingAppearance["readingWindow"] })}>
          {option("follow")}
          <optgroup label={ja ? "固定の風景 · 学習室" : "Still views · Study Room"}>{studyWindows.map(option)}</optgroup>
          <optgroup label={ja ? "固定の風景 · クイズ" : "Still views · Quiz landscapes"}>{landscapeWindows.map(option)}</optgroup>
        </select>
      </label>
      <fieldset><legend>{ja ? "本の配色" : "Book palette"}</legend>
        <div className="book-swatches">{bookPalettes.map(id => <label key={id}>
          <input type="radio" name="book-palette" checked={value.readingPalette === id} onChange={() => change({ readingPalette: id })} />
          <span><i aria-hidden="true" data-swatch={id} />{label(id)}</span>
        </label>)}</div>
      </fieldset>
      <label>{ja ? "風景の切り替え" : "Scene transition"}
        <select value={value.readingTransition} onChange={e => change({ readingTransition: e.target.value as ReadingAppearance["readingTransition"] })}>
          <option value="dissolve">{ja ? "ゆっくり溶け合う" : "Soft dissolve"}</option>
          <option value="instant">{ja ? "即時" : "Instant"}</option>
        </select>
      </label>
    </div>
  </details>;
}
