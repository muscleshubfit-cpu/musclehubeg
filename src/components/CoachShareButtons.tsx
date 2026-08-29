"use client";

import { useState } from "react";

type Props = {
  /** Pre-filled share message (localized by the caller). */
  message: string;
  /** URL to share (defaults to current page). */
  url?: string;
  /** Button labels + copy-label, localized by the caller. */
  labels: {
    whatsapp: string;
    facebook: string;
    x: string;
    telegram: string;
    copy: string;
    copied: string;
  };
};

/**
 * FOR-COACHES SHARE BUTTONS — TEXT-ONLY by owner decree
 * («لا تستخدم ايقونات او ايموجى فقط كتابة وكروت وازرار بنفس طابع الموقع»).
 *
 * Deliberately does NOT reuse ShareButtons (that one renders lucide icons).
 * No icons, no emojis — plain text buttons styled with the site's Apple-like
 * tokens (#0071e3 accent, rounded-full, #e5e5ea rings). Share targets are the
 * standard intent URLs (no JS SDK): WhatsApp, Facebook, X, Telegram + copy.
 */
export function CoachShareButtons({ message, url, labels }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ||
    (typeof window !== "undefined"
      ? window.location.href
      : "https://musclehubeg.vercel.app/for-coaches");
  const fullText = `${message}\n${shareUrl}`;
  const enc = encodeURIComponent;

  const links = [
    {
      label: labels.whatsapp,
      href: `https://wa.me/?text=${enc(fullText)}`,
    },
    {
      label: labels.facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(message)}`,
    },
    {
      label: labels.x,
      href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(shareUrl)}`,
    },
    {
      label: labels.telegram,
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(message)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0071e3]/20 transition-all duration-300 hover:bg-[#0077ed] hover:shadow-lg"
        >
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-[#d2d2d7] bg-white px-6 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-all duration-300 hover:border-[#0071e3] hover:text-[#0071e3]"
      >
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
