"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getBlogPost, getLinkedPost } from "@/lib/blog";

/**
 * Site-wide language toggle. On most pages it just flips the UI language
 * (useI18n). On blog pages it ALSO navigates to the corresponding blog
 * route in the new language, so switching language while reading an
 * article actually shows that article's translated version (via
 * linked_post_id) instead of leaving you on an English URL with Arabic
 * chrome around it.
 */
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const pathname = usePathname() || "/";
  const router = useRouter();

  const handleToggle = async () => {
    const nextLang = lang === "ar" ? "en" : "ar";

    // Blog list page: /blog <-> /ar/blog
    if (pathname === "/blog" || pathname === "/ar/blog") {
      setLang(nextLang);
      router.push(nextLang === "ar" ? "/ar/blog" : "/blog");
      return;
    }

    // Blog article page: /blog/[slug] <-> /ar/blog/[slug]
    const enMatch = pathname.match(/^\/blog\/([^/]+)$/);
    const arMatch = pathname.match(/^\/ar\/blog\/([^/]+)$/);
    if (enMatch || arMatch) {
      const currentSlug = (enMatch || arMatch)![1];
      const currentArticleLang: "en" | "ar" = enMatch ? "en" : "ar";
      setLang(nextLang);
      try {
        const post = await getBlogPost(currentArticleLang, currentSlug);
        const linked = post ? await getLinkedPost(post) : null;
        if (linked) {
          router.push(linked.language === "ar" ? `/ar/blog/${linked.slug}` : `/blog/${linked.slug}`);
          return;
        }
      } catch {
        // fall through to list-page fallback below
      }
      // No translated version exists yet — land on the blog list in the new language.
      router.push(nextLang === "ar" ? "/ar/blog" : "/blog");
      return;
    }

    // Everywhere else: just toggle the UI language.
    setLang(nextLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={handleToggle}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
    </Button>
  );
}
