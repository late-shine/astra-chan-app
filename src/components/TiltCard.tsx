/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees (default: 10) */
  tiltMax?: number;
  /** Show a moving glare/shine overlay (default: true) */
  glareEnabled?: boolean;
  /** Scale on hover (default: 1.02) */
  scale?: number;
  /** Whether the component renders as a button (default: false) */
  as?: "div" | "button";
  /** Click handler */
  onClick?: () => void;
  /** Extra style overrides */
  style?: React.CSSProperties;
}

/**
 * A reusable 3D-tilt card that responds to mouse movement.
 * On hover the card rotates in 3D following the cursor and shows
 * a moving glare overlay.  Automatically disables on touch devices.
 */
const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = "",
  tiltMax = 10,
  glareEnabled = true,
  scale = 1.02,
  as = "div",
  onClick,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  // Detect touch-only devices — tilt doesn't make sense there
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDevice || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // -1 to 1 normalised distance from centre
      const normalX = (e.clientX - centerX) / (rect.width / 2);
      const normalY = (e.clientY - centerY) / (rect.height / 2);

      // Clamp
      const clampedX = Math.max(-1, Math.min(1, normalX));
      const clampedY = Math.max(-1, Math.min(1, normalY));

      // rotateX is inverse of vertical mouse (move up → positive rotation)
      setTilt({
        x: -clampedY * tiltMax,
        y: clampedX * tiltMax,
      });

      // Glare follows cursor — percentage position
      setGlarePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [tiltMax, isTouchDevice],
  );

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) setIsHovering(true);
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setGlarePos({ x: 50, y: 50 });
  }, []);

  // Dynamic shadow that shifts opposite to tilt
  const shadowOffsetX = -tilt.y * 0.8;
  const shadowOffsetY = -tilt.x * 0.8;

  const cardStyle: React.CSSProperties = {
    transform: isHovering
      ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${scale}, ${scale}, ${scale})`
      : "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: isHovering
      ? "transform 0.1s ease-out, box-shadow 0.15s ease-out"
      : "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease-out",
    boxShadow: isHovering
      ? `${shadowOffsetX}px ${shadowOffsetY + 8}px 24px rgba(0, 0, 0, 0.18),
         ${shadowOffsetX * 0.5}px ${shadowOffsetY * 0.5 + 4}px 8px rgba(0, 0, 0, 0.08),
         inset 0 1px 0 rgba(255, 255, 255, 0.12)`
      : "0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    transformStyle: "preserve-3d",
    willChange: "transform",
    position: "relative",
    overflow: "hidden",
    ...style,
  };

  const glareStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 2,
    borderRadius: "inherit",
    background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)`,
    opacity: isHovering ? 1 : 0,
    transition: isHovering ? "opacity 0.15s ease" : "opacity 0.4s ease",
    mixBlendMode: "overlay" as const,
  };

  const Tag = as === "button" ? "button" : "div";

  return (
    <Tag
      ref={cardRef as any}
      className={className}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...(as === "button" ? { type: "button" as const } : {})}
    >
      {/* Glare overlay */}
      {glareEnabled && !isTouchDevice && <div style={glareStyle} />}

      {/* Inner highlight border — top edge light */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          borderRadius: "inherit",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderTopColor: isHovering
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(255, 255, 255, 0.1)",
          transition: "border-color 0.3s ease",
        }}
      />

      {/* Card content */}
      <div style={{ position: "relative", zIndex: 3 }}>{children}</div>
    </Tag>
  );
};

export default TiltCard;
