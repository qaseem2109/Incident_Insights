"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/client/format";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({ value, prefix = "", className }: AnimatedCounterProps) {
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 320;
    const startTime = performance.now();
    let frameId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevRef.current = value;
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {formatNumber(display)}
    </span>
  );
}
