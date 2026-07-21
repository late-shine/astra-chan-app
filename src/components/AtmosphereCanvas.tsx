import React, { useEffect, useRef } from "react";

interface AtmosphereCanvasProps {
  animationType: "auto" | "snow" | "sakura" | "sparkles" | "rain" | "letters" | "both" | "none";
  intensity: "low" | "medium" | "high";
  theme: string;
  activeBgScene: number;
}

interface RainParticle {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface LetterParticle {
  x: number;
  y: number;
  char: string;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
  swaySpeed: number;
  swayAmount: number;
  color: string;
}

interface SnowParticle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  angle: number;
  swaySpeed: number;
  swayAmount: number;
}

interface SakuraParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  angle: number;
  swaySpeed: number;
  swayAmount: number;
  color: string;
}

interface SparkleParticle {
  x: number;
  y: number;
  size: number;
  targetSize: number;
  opacity: number;
  speedY: number;
  angle: number;
  angleSpeed: number;
  color: string;
}

const JAPANESE_MAGIC_RUNES = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "夢", "星", "空", "月", "風",
  "花", "葉", "光", "術", "美"
];

const THEME_COLORS: Record<string, string[]> = {
  "light": ["#7E8F7C", "#C27D56", "#506253", "#9C85DB"],
  "dark-cosmic": ["#A788FF", "#C9B8FF", "#DF9BFF", "#FF7597", "#8F72E8"],
  "dark-emerald": ["#34D399", "#A7F3D0", "#10B981", "#FCD34D", "#34D399"],
  "dark-maple": ["#F0967A", "#FFC0AD", "#E2725B", "#F5B041", "#CD6155"],
  "dark-cyber": ["#06B6D4", "#67E8F9", "#0891B2", "#EC4899", "#F43F5E"]
};

export default function AtmosphereCanvas({
  animationType,
  intensity,
  theme,
  activeBgScene
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationTypeRef = useRef(animationType);
  const activeBgSceneRef = useRef(activeBgScene);

  useEffect(() => {
    animationTypeRef.current = animationType;
  }, [animationType]);

  useEffect(() => {
    activeBgSceneRef.current = activeBgScene;
  }, [activeBgScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Size canvas for high-DPI (Retina) displays to prevent blurriness
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Track resize
    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", handleResize);

    // Compute particle counts based on intensity settings
    const counts = {
      low: { rain: 25, letters: 8, snow: 20, sakura: 12, sparkles: 12 },
      medium: { rain: 65, letters: 20, snow: 50, sakura: 30, sparkles: 30 },
      high: { rain: 130, letters: 40, snow: 100, sakura: 60, sparkles: 60 }
    }[intensity];

    const maxRain = counts.rain;
    const maxLetters = counts.letters;
    const maxSnow = counts.snow;
    const maxSakura = counts.sakura;
    const maxSparkles = counts.sparkles;

    // 1. Initialize Rain Particles
    const rainPool: RainParticle[] = [];
    for (let i = 0; i < maxRain; i++) {
      rainPool.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 4 + 4,
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    // 2. Initialize Letter Particles
    const letterPool: LetterParticle[] = [];
    const colorsList = THEME_COLORS[theme] || THEME_COLORS["light"] || THEME_COLORS["dark-cosmic"];
    for (let i = 0; i < maxLetters; i++) {
      letterPool.push({
        x: Math.random() * width,
        y: Math.random() * height + 100,
        char: JAPANESE_MAGIC_RUNES[Math.floor(Math.random() * JAPANESE_MAGIC_RUNES.length)],
        size: Math.random() * 12 + 12,
        speed: Math.random() * 0.4 + 0.2,
        opacity: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.005,
        swayAmount: Math.random() * 15 + 5,
        color: colorsList[Math.floor(Math.random() * colorsList.length)]
      });
    }

    // 3. Initialize Snow Particles
    const snowPool: SnowParticle[] = [];
    for (let i = 0; i < maxSnow; i++) {
      snowPool.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3.5 + 1.2,
        speedY: Math.random() * 0.8 + 0.4,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.75 + 0.15,
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.012 + 0.003,
        swayAmount: Math.random() * 10 + 4,
      });
    }

    // 4. Initialize Sakura Particles
    const sakuraPool: SakuraParticle[] = [];
    const sakuraColors = ["#FFB7C5", "#FFA6C9", "#FFC0CB", "#FFB3DE", "#FF9EAF"];
    for (let i = 0; i < maxSakura; i++) {
      sakuraPool.push({
        x: Math.random() * width,
        y: Math.random() * height - 50,
        size: Math.random() * 8 + 6,
        speedY: Math.random() * 0.9 + 0.6,
        speedX: Math.random() * 0.4 + 0.2,
        opacity: Math.random() * 0.7 + 0.2,
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.015 + 0.005,
        swayAmount: Math.random() * 12 + 4,
        color: sakuraColors[Math.floor(Math.random() * sakuraColors.length)],
      });
    }

    // 5. Initialize Sparkle Particles
    const sparklePool: SparkleParticle[] = [];
    const sparkleColors = ["#FFFEE4", "#FFFD9D", "#FFFBB0", "#EAE2FF", "#D2F5FF", "#FFFFFF"];
    for (let i = 0; i < maxSparkles; i++) {
      sparklePool.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        targetSize: Math.random() * 7 + 4,
        opacity: Math.random() * 0.8 + 0.1,
        speedY: -(Math.random() * 0.3 + 0.15),
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.015,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
      });
    }

    // Determine initial targets
    const getInitialTargets = () => {
      const animType = animationTypeRef.current;
      const currentScene = activeBgSceneRef.current;

      let runLetters = false;
      let runRain = false;
      let runSnow = false;
      let runSakura = false;
      let runSparkles = false;

      let effectiveType: string = animType;
      if (animType === "auto") {
        if (currentScene === 0) effectiveType = "snow";
        else if (currentScene === 1) effectiveType = "sakura";
        else if (currentScene === 2) effectiveType = "sparkles";
        else if (currentScene === 3) effectiveType = "rain";
      } else if (animType === "both") {
        runLetters = true;
        if (currentScene === 0) effectiveType = "snow";
        else if (currentScene === 1) effectiveType = "sakura";
        else if (currentScene === 2) effectiveType = "sparkles";
        else if (currentScene === 3) effectiveType = "rain";
      }

      if (effectiveType === "letters") runLetters = true;
      else if (effectiveType === "rain") runRain = true;
      else if (effectiveType === "snow") runSnow = true;
      else if (effectiveType === "sakura") runSakura = true;
      else if (effectiveType === "sparkles") runSparkles = true;

      return { runLetters, runRain, runSnow, runSakura, runSparkles };
    };

    const initial = getInitialTargets();
    let multLetters = initial.runLetters ? 1 : 0;
    let multRain = initial.runRain ? 1 : 0;
    let multSnow = initial.runSnow ? 1 : 0;
    let multSakura = initial.runSakura ? 1 : 0;
    let multSparkles = initial.runSparkles ? 1 : 0;

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Get latest targets
      const animType = animationTypeRef.current;
      const currentScene = activeBgSceneRef.current;

      let runLetters = false;
      let runRain = false;
      let runSnow = false;
      let runSakura = false;
      let runSparkles = false;

      let effectiveType: string = animType;
      if (animType === "auto") {
        if (currentScene === 0) effectiveType = "snow";
        else if (currentScene === 1) effectiveType = "sakura";
        else if (currentScene === 2) effectiveType = "sparkles";
        else if (currentScene === 3) effectiveType = "rain";
      } else if (animType === "both") {
        runLetters = true;
        if (currentScene === 0) effectiveType = "snow";
        else if (currentScene === 1) effectiveType = "sakura";
        else if (currentScene === 2) effectiveType = "sparkles";
        else if (currentScene === 3) effectiveType = "rain";
      }

      if (effectiveType === "letters") runLetters = true;
      else if (effectiveType === "rain") runRain = true;
      else if (effectiveType === "snow") runSnow = true;
      else if (effectiveType === "sakura") runSakura = true;
      else if (effectiveType === "sparkles") runSparkles = true;

      const targetLetters = runLetters ? 1 : 0;
      const targetRain = runRain ? 1 : 0;
      const targetSnow = runSnow ? 1 : 0;
      const targetSakura = runSakura ? 1 : 0;
      const targetSparkles = runSparkles ? 1 : 0;

      // Linear/Exponential interpolate multipliers towards targets
      const lerpSpeed = 0.015; // smooth transition over ~1.5 - 2 seconds
      multLetters += (targetLetters - multLetters) * lerpSpeed;
      multRain += (targetRain - multRain) * lerpSpeed;
      multSnow += (targetSnow - multSnow) * lerpSpeed;
      multSakura += (targetSakura - multSakura) * lerpSpeed;
      multSparkles += (targetSparkles - multSparkles) * lerpSpeed;

      // --- DRAW SNOW ---
      if (multSnow > 0.002) {
        // All themes (including "light") sit on a dark atmospheric background,
        // so snow should always render at full brightness — no theme branch needed.
        ctx.fillStyle = "rgba(240, 248, 255, 0.9)";
        for (let i = 0; i < snowPool.length; i++) {
          const s = snowPool[i];
          ctx.beginPath();
          const currentX = s.x + Math.sin(s.angle) * s.swayAmount;
          ctx.arc(currentX, s.y, s.radius, 0, Math.PI * 2);
          ctx.globalAlpha = s.opacity * multSnow;
          ctx.fill();

          s.y += s.speedY;
          s.x += s.speedX;
          s.angle += s.swaySpeed;

          if (s.y > height + 10) {
            s.y = -10;
            s.x = Math.random() * width;
            s.opacity = Math.random() * 0.75 + 0.15;
            s.radius = Math.random() * 3.5 + 1.2;
            s.speedY = Math.random() * 0.8 + 0.4;
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // --- DRAW SAKURA ---
      if (multSakura > 0.002) {
        for (let i = 0; i < sakuraPool.length; i++) {
          const p = sakuraPool[i];
          ctx.save();
          
          const currentX = p.x + Math.sin(p.angle) * p.swayAmount;
          ctx.translate(currentX, p.y);
          ctx.rotate(p.angle);
          
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * multSakura;
          
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.7);
          ctx.bezierCurveTo(s * 0.6, -s * 0.8, s * 0.4, s * 0.8, 0, s);
          ctx.bezierCurveTo(-s * 0.4, s * 0.8, -s * 0.6, -s * 0.8, 0, -s * 0.7);
          ctx.fill();
          
          ctx.restore();

          p.y += p.speedY;
          p.x += p.speedX;
          p.angle += p.swaySpeed;

          if (p.y > height + 20 || p.x > width + 20) {
            p.y = -20;
            p.x = Math.random() * width - 60;
            p.angle = Math.random() * Math.PI * 2;
            p.opacity = Math.random() * 0.7 + 0.2;
            p.size = Math.random() * 8 + 6;
            p.speedY = Math.random() * 0.9 + 0.6;
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // --- DRAW SPARKLES ---
      if (multSparkles > 0.002) {
        for (let i = 0; i < sparklePool.length; i++) {
          const s = sparklePool[i];
          ctx.save();
          
          ctx.translate(s.x, s.y);
          ctx.rotate(s.angle);
          
          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.opacity * multSparkles;
          
          const currentSize = s.size + Math.sin(s.angle * 2.5) * (s.targetSize - s.size) * 0.5;
          
          ctx.beginPath();
          ctx.moveTo(0, -currentSize);
          ctx.quadraticCurveTo(0, 0, currentSize, 0);
          ctx.quadraticCurveTo(0, 0, 0, currentSize);
          ctx.quadraticCurveTo(0, 0, -currentSize, 0);
          ctx.quadraticCurveTo(0, 0, 0, -currentSize);
          ctx.closePath();
          
          // All themes render on a dark background now, so the glow always applies.
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 5;
          ctx.fill();
          ctx.restore();

          s.y += s.speedY;
          s.angle += s.angleSpeed;

          if (s.y < -20) {
            s.y = height + 20;
            s.x = Math.random() * width;
            s.opacity = Math.random() * 0.8 + 0.1;
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // --- DRAW RAIN ---
      if (multRain > 0.002) {
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = multRain;
        
        let strokeStyle = "rgba(126, 143, 124, 0.25)";
        if (theme === "dark-cosmic") {
          strokeStyle = "rgba(167, 136, 255, 0.25)";
        } else if (theme === "dark-emerald") {
          strokeStyle = "rgba(52, 211, 153, 0.25)";
        } else if (theme === "dark-maple") {
          strokeStyle = "rgba(240, 150, 122, 0.25)";
        } else if (theme === "dark-cyber") {
          strokeStyle = "rgba(6, 182, 212, 0.25)";
        }
        ctx.strokeStyle = strokeStyle;
        
        ctx.beginPath();
        for (let i = 0; i < rainPool.length; i++) {
          const r = rainPool[i];
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x, r.y + r.length);

          r.y += r.speed;
          
          if (r.y > height) {
            r.y = -r.length;
            r.x = Math.random() * width;
            r.speed = Math.random() * 4 + 4;
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // --- DRAW LETTERS (RUNES) ---
      if (multLetters > 0.002) {
        for (let i = 0; i < letterPool.length; i++) {
          const l = letterPool[i];
          
          ctx.save();
          const currentX = l.x + Math.sin(l.angle) * l.swayAmount;
          
          ctx.translate(currentX, l.y);
          ctx.rotate(l.angle * 0.15);
          
          ctx.font = `bold ${l.size}px "Noto Serif JP", serif`;
          
          // All themes render on a dark background now, so the glow always applies.
          ctx.shadowColor = l.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = l.color;
          
          ctx.globalAlpha = l.opacity * multLetters;
          ctx.fillText(l.char, 0, 0);
          ctx.restore();

          l.y -= l.speed;
          l.angle += l.swaySpeed;

          if (l.y < -30) {
            l.y = height + 30;
            l.x = Math.random() * width;
            l.char = JAPANESE_MAGIC_RUNES[Math.floor(Math.random() * JAPANESE_MAGIC_RUNES.length)];
            l.opacity = Math.random() * 0.5 + 0.1;
            l.speed = Math.random() * 0.4 + 0.2;
            l.color = colorsList[Math.floor(Math.random() * colorsList.length)];
          }
        }
        ctx.globalAlpha = 1.0;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [intensity, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 select-none"
      style={{
        // "screen" blend brightens particles against the dark backdrop every theme uses now.
        mixBlendMode: "screen",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
