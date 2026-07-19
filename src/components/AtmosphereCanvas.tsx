import React, { useEffect, useRef } from "react";

interface AtmosphereCanvasProps {
  animationType: "letters" | "rain" | "both" | "none";
  intensity: "low" | "medium" | "high";
  theme: string;
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

const JAPANESE_MAGIC_RUNES = [
  "ã‚", "ã„", "ã†", "ãˆ", "ãŠ", 
  "ã‹", "ã", "ã", "ã‘", "ã“", 
  "ã•", "ã—", "ã™", "ã›", "ã",
  "å¤¢", "æ˜Ÿ", "ç©º", "æœˆ", "é¢¨", 
  "èŠ±", "è‘‰", "å…‰", "è¡“", "ç¾Ž"
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
  theme
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const colorsList = THEME_COLORS[theme] || THEME_COLORS["light"] || THEME_COLORS["dark-cosmic"];
    for (let i = 0; i < maxLetters; i++) {
      letterPool.push({
        x: Math.random() * width,
        y: Math.random() * height + 100,
        char: JAPANESE_MAGIC_RUNES[Math.floor(Math.random() * JAPANESE_MAGIC_RUNES.length)],
        size: Math.random() * 12 + 12, // 12px to 24px
        speed: Math.random() * 0.4 + 0.2, // cozy drifting up
        opacity: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
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
          
          if (theme.startsWith("dark")) {
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
        mixBlendMode: theme.startsWith("dark") ? "screen" : "normal",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
