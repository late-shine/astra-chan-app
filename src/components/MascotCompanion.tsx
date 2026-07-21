import React, { useMemo } from "react";
import { motion } from "motion/react";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";
import wonderingImg from "../assets/images/astra-wondering.jpeg";
import excitedImg from "../assets/images/astra-excited.png.jpeg";
import bgCatSakura from "../assets/images/bg_cat_sakura.jpg";
import { Sparkles, Heart } from "lucide-react";

interface MascotCompanionProps {
  mood: "welcome" | "streak" | "success" | "failure" | "kanji" | "idle" | "clicked" | "learn-flashcard" | "learn-vocabs" | "survival-danger" | "wondering" | "afk" | "excited";
  streak: number;
  xp: number;
  selectedChar?: string;
  speechOverride?: string | null;
  onClickCompanion?: () => void;
}

export default function MascotCompanion({
  mood,
  streak,
  xp,
  selectedChar,
  speechOverride,
  onClickCompanion
}: MascotCompanionProps) {

  // Select image based on mood — soft crossfade handled by keyed motion.div below
  const currentImage = useMemo(() => {
    if (mood === "wondering" || mood === "afk") return wonderingImg;
    if (mood === "excited") return excitedImg;
    return companionImg;
  }, [mood]);
  
  const speechBubbleText = useMemo(() => {
    if (speechOverride) return speechOverride;

    switch (mood) {
      case "welcome":
        if (xp === 0) {
          return "🔮 Konnichiwa! I'm Astra-chan, your magical celestial witch companion! Let's cast some starry learning spells. Grab your mystical scroll and select 'Study Chamber' to unlock ancient runes, or enter the 'Practice Arena' to test your spelling incantations!";
        }
        return `✨ Welcome back, fellow star scholar! Your grimoires are overflowing with ${xp} XP of cosmic magic. Let's harvest some N5 garden words and ancient Kanji scrolls today!`;
      case "streak":
        if (streak > 0) {
          return `🕯️ Witchy tip: You have kept your study candle burning bright for ${streak} consecutive ${streak === 1 ? "day" : "days"}! A powerful ward against forgetfulness. Let's nourish the flame!`;
        }
        return "🔮 Daily incantation is the key to mastering runes! Let's light up a lavender candle and build your scroll streak.";
      case "success":
        return "🔮 Yatta! Perfect spell alignment! Your stroke coordinates are glowing with pure magical power. Keep going, wizard! ✨";
      case "failure":
        return "^^ Daijoubu! Even grand wizards fizzle their spells sometimes. Take a deep breath of green tea mist, click the speaker helper to check the voice accent, and cast it again!";
      case "kanji":
        return `✍️ Tracing the ancient kanji ${selectedChar ? `"${selectedChar}"` : "symbol"} on our washi paper grid focuses your mystical energy. Let your pen follow the brush strokes in proper order!`;
      case "learn-flashcard":
        return "📖 You are safe inside the Sanctuary! Click on any elemental rune card to hear its native pronunciation audio and see its hidden dictionary combinations.";
      case "learn-vocabs":
        return "🌿 Ah, the N5 Word Garden! We have over 690+ spell ingredients here, grouped by category. Study each plant closely and click the checkmark to store it in your inventory!";
      case "survival-danger":
        return "🔥 Oh no! The midnight candle is flickering down! Enter your romaji spelling key faster to fuel the mystical flame, quick! ⚡";
      case "clicked":
        return "🛸 *Giggles* Hee-hee! Did you tickle my magic hat? Did you know? Hiragana characters are derived from ancient cursive scripts called 'Man'yogana', simplified by women in imperial court chambers to write beautiful poetry!";
      case "wondering": {
        const lines = [
          "Hmm... taking a little break? 🌙",
          "The stars are quiet... so are you. ✦",
          "I wonder what you're thinking about... 👀",
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      }
      case "afk": {
        const lines = [
          "Still here, whenever you return... 🕯️",
          "The grimoire waits patiently. 📖✨",
          "No rush. I'll keep the candle lit. 🌙",
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      }
      case "excited": {
        const lines = [
          "Oh! You're back! Let's keep going! ✨",
          "Yatta! Ready to study again? 🌸",
          "The spell continues! ⚡✦",
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      }
      case "idle":
      default:
        if (streak > 3) {
          return "✨ Your magical study habit is truly inspiring! The cozy Tokyo night clouds are glowing with your starry focus.";
        }
        return "🔮 I am always floating right beside you to guide your study rituals. Tap my hat for deep native lore, or open another scroll!";
    }
  }, [mood, streak, xp, selectedChar, speechOverride]);

  return (
    <div 
      className="flex flex-col sm:flex-row items-center gap-5 bg-natural-card border border-natural-border/70 rounded-3xl p-5 w-full shadow-sm my-2 animate-fade-in relative overflow-hidden"
    >
      {/* Cat Sakura Background — subtle, stays behind everything */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          backgroundImage: `url(${bgCatSakura})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.07,
        }}
      />

      {/* Background Zen Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#e1dbce_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

      {/* Interactive Floating Mascot Avatar Image using motion */}
      <motion.div 
        className="relative flex-shrink-0 cursor-pointer z-10"
        onClick={onClickCompanion}
        whileHover={{ scale: 1.05 }}
        whileTap={{ rotate: [0, -10, 10, -5, 5, 0], scale: 0.95 }}
      >
        <motion.div 
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-natural-forest/20 bg-natural-bg flex items-center justify-center shadow-md overflow-hidden relative group"
        >
          {/* Keyed motion.div triggers soft crossfade whenever image changes */}
          <motion.div
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full"
          >
            <img
              src={currentImage}
              alt="Astra-chan Mascot Companion"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transform scale-105 group-hover:scale-115 duration-300"
            />
          </motion.div>
          <div className="absolute inset-0 bg-natural-forest/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
        
        {/* Playful Floating Heart Aura Badge */}
        <motion.span 
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
          }}
          className="absolute -bottom-1 -right-1 bg-natural-clay text-natural-bg p-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm" 
          title="Click me to chat!"
        >
          <Heart className="w-3 h-3 fill-natural-bg text-natural-bg" />
        </motion.span>
      </motion.div>

      {/* Elegant Speech Content with companion status indications */}
      <div className="flex-grow text-center sm:text-left z-10 w-full">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
          <span className="text-natural-forest font-serif font-extrabold text-xs tracking-widest uppercase">
            ASTRA-CHAN
          </span>
          <span className="text-[10px] bg-natural-forest/10 text-natural-forest-light px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border border-natural-forest/10">
            {mood === "survival-danger" ? "🚨 System Coach" : "🌸 Celestial Tutor"}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-natural-clay animate-pulse" />
        </div>
        <p className="text-natural-charcoal font-sans text-sm leading-relaxed antialiased font-medium select-text">
          "{speechBubbleText}"
        </p>
        <span className="text-[9px] text-[#7A8E7C] font-mono block mt-1.5 uppercase tracking-widest select-none font-bold">
          Click Astra-chan directly for celestial learning trivia!
        </span>
      </div>
    </div>
  );
}
