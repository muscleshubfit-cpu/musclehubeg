"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
    </Button>
  );
}
