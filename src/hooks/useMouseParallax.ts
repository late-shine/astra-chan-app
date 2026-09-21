/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { useMotionValue, useSpring, MotionValue } from "motion/react";

/**
 * Tracks the mouse position and returns normalized (-1 to 1) spring-animated
 * motion values for x and y, representing the mouse offset from the center of the viewport.
 * 
 * @param enable Whether the tracking is enabled (e.g. false for touch devices or low performance)
 */
export function useMouseParallax(enable = true): { x: MotionValue<number>; y: MotionValue<number> } {
  // Raw mouse coordinates (normalized -1 to 1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth them with a spring
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20, mass: 0.5 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20, mass: 0.5 });

  useEffect(() => {
    // Disable on touch devices since parallax is a hover/mouse effect
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    if (!enable || isTouchDevice) {
      mouseX.set(0);
      mouseY.set(0);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) * 2 - 1; // -1 to 1
      const y = (e.clientY / innerHeight) * 2 - 1; // -1 to 1
      
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [enable, mouseX, mouseY]);

  return { x: smoothX, y: smoothY };
}
