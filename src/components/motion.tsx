"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

// ===== Variants =====

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

// Stagger container — children animate in sequence
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// ===== Reveal Component =====
// DISABLED — scroll-triggered animations were causing jarring "shake"
// effects during scroll. The component now renders children directly
// without any opacity/transform animation.
//
// Original behavior used Framer Motion's useInView to trigger fade-up.
// Restoring: revert this to use `motion.div` with `variants` +
// `useInView` hook (see git history).

export function Reveal({
  children,
  className = "",
  delay: _delay = 0,
  variants: _variants = fadeUp,
  duration: _duration = 0.6,
  once: _once = true,
  amount: _amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
  duration?: number;
  once?: boolean;
  amount?: number;
}) {
  return <div className={className}>{children}</div>;
}

// ===== Stagger Group =====
// DISABLED — same reason as Reveal. Renders children directly.

export function StaggerGroup({
  children,
  className = "",
  stagger: _stagger = 0.1,
  amount: _amount = 0.2,
  once: _once = true,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  once?: boolean;
}) {
  return <div className={className}>{children}</div>;
}

// ===== Stagger Item =====
// DISABLED — same reason as StaggerGroup. Renders children directly.

export function StaggerItem({
  children,
  className = "",
  variants: _variants = fadeUp,
  duration: _duration = 0.6,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  duration?: number;
}) {
  return <div className={className}>{children}</div>;
}

// ===== Hover Card =====
// Smooth hover lift + shadow for interactive cards

export function HoverCard({
  children,
  className = "",
  lift = 8,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift, scale }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ===== Hover Button =====
// Smooth hover scale for buttons

export function HoverButton({
  children,
  className = "",
  scale = 1.05,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ===== Page Transition =====
// Smooth fade-in when page loads

export function PageFade({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
