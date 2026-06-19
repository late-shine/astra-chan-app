import React, { useEffect, useRef } from "react";

interface AtmosphereCanvasProps {
  animationType: "letters" | "rain" | "both" | "none";
  intensity: "low" | "medium" | "high";
  theme: "light" | "dark";
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
  angleSpeed: number;
  swaySpeed: number;
  swayAmount: number;
  color: string;
}

const JAPANESE_MAGIC_RUNES = [
  "あ", "い", "う", "え", "お", 
  "か", "き", "く", "け", "こ", 
  "さ", "し", "す", "せ", "そ",
  "夢", "星", "空", "月", "風", 
  "花", "葉", "光", "術", "美"
];

const LIGHT_COLORS = ["#7E8F7C", "#C27D56", "#506253", "#9C85DB"];
const DARK_COLORS = ["#A788FF", "#C9B8FF", "#DF9BFF", "#FF7597", "#8F72E8"];

export default function AtmosphereCanvas({
  animationType,
  intensity,
  theme
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Compute particle counts based on intensity settings
    let maxRain = 0;
    let maxLetters = 0;

    if (animationType !== "none") {
      const counts = {
        low: { rain: 25, letters: 8 },
        medium: { rain: 65, letters: 20 },
        high: { rain: 130, letters: 40 }
      }[intensity];

      if (animationType === "rain" || animationType === "both") {
        maxRain = counts.rain;
      }
      if (animationType === "letters" || animationType === "both") {
        maxLetters = counts.letters;
      }
    }

    // Initialize rain particles pool
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

    // Initialize letter particles pool
    const letterPool: LetterParticle[] = [];
    const colorsList = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
    for (let i = 0; i < maxLetters; i++) {
      letterPool.push({
        x: Math.random() * width,
        y: Math.random() * height + 100,
        char: JAPANESE_MAGIC_RUNES[Math.floor(Math.random() * JAPANESE_MAGIC_RUNES.length)],
        size: Math.random() * 12 + 12, // 12px to 24px
        speed: Math.random() * 0.4 + 0.2, // cozy drifting up
        opacity: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.01,
        swaySpeed: Math.random() * 0.02 + 0.005,
        swayAmount: Math.random() * 15 + 5,
        color: colorsList[Math.floor(Math.random() * colorsList.length)]
      });
    }

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw and update Rain particles
      if (maxRain > 0) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = theme === "dark" ? "rgba(167, 136, 255, 0.25)" : "rgba(126, 143, 124, 0.25)";
        
        ctx.beginPath();
        for (let i = 0; i < rainPool.length; i++) {
          const r = rainPool[i];
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x, r.y + r.length);

          // Update position
          r.y += r.speed;
          
          // Reset if at bottom
          if (r.y > height) {
            r.y = -r.length;
            r.x = Math.random() * width;
            r.speed = Math.random() * 4 + 4;
          }
        }
        ctx.stroke();
      }

      // 2. Draw and update Letter particles
      if (maxLetters > 0) {
        for (let i = 0; i < letterPool.length; i++) {
          const l = letterPool[i];
          
          ctx.save();
          // Position with dynamic horizontal sway
          const currentX = l.x + Math.sin(l.angle) * l.swayAmount;
          
          ctx.translate(currentX, l.y);
          ctx.rotate(l.angle * 0.15); // gentle magic spin rotation
          
          // Apply custom text properties and shadows for glowing effect in darkmode
          ctx.font = `bold ${l.size}px "Noto Serif JP", serif`;
          
          if (theme === "dark") {
            ctx.shadowColor = l.color;
            ctx.shadowBlur = 6;
            ctx.fillStyle = l.color;
          } else {
            ctx.fillStyle = l.color;
          }
          
          ctx.globalAlpha = l.opacity;
          ctx.fillText(l.char, 0, 0);
          ctx.restore();

          // Update values
          l.y -= l.speed;
          l.angle += l.swaySpeed;

          // Recycle particle if it drifts above the ceiling
          if (l.y < -30) {
            l.y = height + 30;
            l.x = Math.random() * width;
            l.char = JAPANESE_MAGIC_RUNES[Math.floor(Math.random() * JAPANESE_MAGIC_RUNES.length)];
            l.opacity = Math.random() * 0.5 + 0.1;
            l.speed = Math.random() * 0.4 + 0.2;
            l.color = colorsList[Math.floor(Math.random() * colorsList.length)];
          }
        }
        ctx.globalAlpha = 1.0; // restore
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [animationType, intensity, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 select-none"
      style={{
        mixBlendMode: theme === "dark" ? "screen" : "multiply",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
