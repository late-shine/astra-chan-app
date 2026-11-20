import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import reading from "../assets/images/Astra-reading.png";
import lookingUp from "../assets/images/Astra-reading-clicked.png";
import readingSmall from "../assets/images/astra-reading-thumb.jpg";
import lookingUpSmall from "../assets/images/astra-reading-look-thumb.jpg";

const thoughts: Record<string, [string, string]> = {
  "sleepy-cat": ["Shh. We can read the other page until she wakes up.", "しーっ。起きるまで、もう片方のページを読もう。"],
  "two-apples": ["Listen to that crunch. I think you picked a good one.", "いい音！ おいしいりんごを選んでくれたね。"],
  "one-umbrella": ["Hold this side with me, will you? The wind keeps catching it.", "こっち、一緒に持ってくれる？ 風でかさが飛びそう。"],
  "morning-walk": ["Did you hear the birds too? I’d have stopped under that tree.", "鳥の声、聞こえた？ 私ならあの木の下で立ち止まっちゃう。"],
  "library-book": ["That seat by the window… shall we claim it before anyone else does?", "窓辺のあの席、誰かが来る前に座っちゃおうか。"],
  "weather-and-tea": ["The tea’s still steaming. We have time for one more page.", "お茶からまだ湯気が立ってる。もう一ページ読めそうね。"],
  "weekend-food": ["I was going to order udon too. But now I’m thinking about the matcha ice cream.", "私もうどんにしようと思ってたのに、抹茶アイスが気になってきた。"],
  "new-class": ["I’d be nervous introducing myself. It helps to have someone beside you, doesn’t it?", "自己紹介ってどきどきするね。隣に誰かがいると、少し心強いよね。"],
};

export function ReadingCompanion({ storyId, note, ja }: { storyId: string; note: string; ja: boolean }) {
  const [raised, setRaised] = useState(false);
  useEffect(() => {
    if (!raised) return;
    const id = window.setTimeout(() => setRaised(false), 9000);
    return () => window.clearTimeout(id);
  }, [raised]);
  return <aside className="book-companion" aria-label={ja ? "アストラ" : "Astra"}>
    <div className="book-companion-seat">
      <button type="button" className="book-portrait" aria-pressed={raised}
        aria-label={ja ? "アストラに声をかける" : "Talk to Astra"} onClick={() => setRaised(value => !value)}>
        <picture>
          <source media="(max-width: 700px)" srcSet={raised ? lookingUpSmall : readingSmall} />
          <img src={raised ? lookingUp : reading} alt="" width="1024" height="1024" />
        </picture>
        <span className="book-portrait-action" aria-hidden="true"><MessageCircle /></span>
      </button>
      <div className="book-companion-note">
        <span>Astra</span><p aria-live="polite">{raised ? thoughts[storyId]?.[ja ? 1 : 0] ?? note : note}</p>
      </div>
    </div>
  </aside>;
}
