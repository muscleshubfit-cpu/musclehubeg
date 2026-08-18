"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useScrollAnimation — reveals elements when they scroll into view.
 *
 * Uses IntersectionObserver (zero performance cost, no scroll listeners).
 * Respects prefers-reduced-motion: if the user has it enabled, elements
 * appear immediately without animation.
 *
 * Usage:
 *   const ref = useRef<HTMLElement>(null);
 *   const isVisible = useScrollAnimation(ref);
 *   <div ref={ref} className={isVisible ? "animate-fade-up" : "opacity-0"} />
 *
 * Or with the helper component:
 *   <Reveal><h1>...</h1></Reveal>
 */

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {},
) {
  const { threshold = 0.15, rootMargin = "0px 0px -50px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect reduced motion — show immediately
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * AnimatedCounter — counts up from 0 to target when visible.
 * Respects prefers-reduced-motion (shows final value immediately).
 */
export function AnimatedCounter({
  value,
  duration = 1500,
  prefix = "",
  suffix = "",
  className,
}: {
  value: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // If reduced motion, show final value immediately
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }

    // Extract numeric part for animation
    const match = value.match(/(-?[\d.]+)/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const targetNum = parseFloat(match[1]);
    const prefixStr = value.substring(0, match.index);
    const suffixStr = value.substring(match.index! + match[0].length);

    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;
      const formatted =
        targetNum % 1 !== 0 ? current.toFixed(1) : Math.round(current).toString();
      setDisplay(`${prefixStr}${formatted}${suffixStr}`);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
