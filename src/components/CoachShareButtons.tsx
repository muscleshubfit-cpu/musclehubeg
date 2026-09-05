"use client";

import { useState } from "react";
import { Facebook, Twitter, Send, Link2, Check } from "lucide-react";

type Props = {
  /** Pre-filled share message (localized by the caller). */
  message: string;
  /** URL to share (defaults to current page). */
  url?: string;
  /** Button labels + copy-label, localized by the caller. */
  labels: {
    facebook: string;
    x: string;
    telegram: string;
    copy: string;
    copied: string;
  };
};

/**
 * FOR-COACHES SHARE BUTTONS — icon upgrade per owner directive
 * («ايقونات المشاركه ضيفها عادى انا اقصد بدون ايقونات فى الاقسام
 * فى الصفحة نفسها»): icons are FINE on the share buttons; the page's
 * content sections stay text-only.
 *
 * OWNER DECREE (2026-08-30): «معادا زر واتساب لن نضيفها» — the WhatsApp
 * share target is REMOVED. Remaining targets: Facebook, X, Telegram +
 * copy-link (lucide icons — no WhatsApp glyph exists in lucide anyway).
 */
export function CoachShareButtons({ message, url, labels }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ||
    (typeof window !== "undefined"
      ? window.location.href
      : "https://alkemos.com/for-coaches");
  const enc = encodeURIComponent;

  const links = [
    {
      label: labels.facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(message)}`,
      icon: Facebook,
    },
    {
      label: labels.x,
      href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(shareUrl)}`,
      icon: Twitter,
    },
    {
      label: labels.telegram,
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(message)}`,
      icon: Send,
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
          className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0071e3]/20 transition-all duration-300 hover:bg-[#0077ed] hover:shadow-lg"
        >
          <l.icon className="h-4 w-4" aria-hidden="true" />
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-all duration-300 hover:border-[#0071e3] hover:text-[#0071e3]"
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
