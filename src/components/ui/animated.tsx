"use client";

import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * AnimatedNumber — counts up from 0 to target when scrolled into view.
 * Uses Framer Motion's spring animation for smooth, natural counting.
 *
 * Usage:
 *   <AnimatedNumber value={500} prefix="+" suffix="+" />
 *   <AnimatedNumber value={95} suffix="%" />
 */
export function AnimatedNumber({
  value,
  duration = 2,
  prefix = "",
  suffix = "",
  className = "",
  decimals = 0,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration, ease: [0.25, 0.1, 0.25, 1] });
    }
  }, [isInView, value, duration, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) {
        const formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString();
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

/**
 * ScrollProgress — a fixed bar at the top of the page that fills
 * as the user scrolls down. Apple-style thin blue bar.
 *
 * Usage: just drop <ScrollProgress /> anywhere in the layout.
 */
export function ScrollProgress() {
  const scaleX = useSpring(0, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? scrolled / height : 0;
      scaleX.set(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scaleX]);

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-50 h-0.5 origin-left bg-[#0071e3]"
      style={{ scaleX }}
    />
  );
}

/**
 * AnimatedCard — wraps children with Framer Motion hover animation.
 * Lifts up slightly on hover with a smooth transition.
 */
export function AnimatedCard({
  children,
  className = "",
  lift = 6,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeInStagger — staggers children with a fade-in animation.
 * Each child should be wrapped in <motion.div variants={fadeUpItem}>
 */
export const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
