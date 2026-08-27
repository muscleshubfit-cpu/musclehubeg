"use client";

/**
 * useVoiceInput — OWNER DIRECTIVE #1 (2026-08-27): EVO accepts voice
 * questions. Uses the browser's built-in Web Speech API (free, no key,
 * works on Chrome/Edge/Safari 14.1+; gracefully unsupported elsewhere →
 * `supported=false` so callers can hide the mic button entirely).
 *
 * Arabic (ar-EG) and English (en-US) locales supported via the `lang`
 * argument; interim transcripts stream into onResult for live feedback
 * while the final result is fired once recognition ends.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceInput(opts: {
  lang?: string; // BCP-47, defaults to ar-EG
  onFinal: (text: string) => void;
}) {
  const { lang = "ar-EG", onFinal } = opts;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false; // single utterance → clean final result
    rec.interimResults = true;
    finalRef.current = "";
    setInterim("");

    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) finalRef.current += finalText;
      setInterim(interimText);
    };

    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onFinal(text); // push transcript into the composer
    };

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang, onFinal]);

  return { supported, listening, interim, start, stop };
}
