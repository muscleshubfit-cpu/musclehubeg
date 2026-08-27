"use client";

/**
 * VoiceMicButton — OWNER DIRECTIVE #1 (2026-08-27): EVO accepts voice
 * questions. Drop-in mic that transcribes a single utterance into the
 * composer via the Web Speech API (free, keyless). Renders NOTHING when
 * the browser lacks support, so unsupported clients see no dead button.
 */

import { Mic, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { useVoiceInput } from "@/hooks/use-voice-input";

export function VoiceMicButton({
  lang,
  onTranscript,
  disabled = false,
  title,
}: {
  lang: string; // "ar-EG" | "en-US"
  onTranscript: (text: string) => void;
  disabled?: boolean;
  title?: string;
}) {
  const { supported, listening, start, stop } = useVoiceInput({
    lang,
    // Composers append after any typed text for natural mixing of modes.
    onFinal: (text) => onTranscript(text),
  });

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={title || (listening ? "إيقاف التسجيل" : "تسجيل صوتي")}
      title={title || (listening ? "جارٍ الاستماع… اضغط للإيقاف" : "اسأل بصوتك")}
      className={
        listening
          ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ff3b30] text-white animate-pulse transition-opacity hover:opacity-90 disabled:opacity-50"
          : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d2d2d7] bg-[#f5f5f7] text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] disabled:opacity-50"
      }
    >
      {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
