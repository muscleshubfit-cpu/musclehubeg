import type { Metadata } from "next";
import { BlogListPage } from "@/components/blog/BlogListPage";

const SITE_URL = "https://musclehubeg.vercel.app";

/**
 * Arabic mirror of /blog — Arabic-language blog list (independent AR
 * posts, not translations).
 *
 * Homepage AR mirror follow-up (2026-08-30): own title + canonical +
 * hreflang so Google indexes THIS url (the ar/layout alternates block
 * was removed — it leaked the homepage signals onto every /ar/* child).
 */
export const metadata: Metadata = {
  title: "المدونة الرياضية",
  description:
    "مقالات رياضية وتغذية علمية بالعربية — تمارين، تغذية، مكملات، وصحة من فريق Musclehubeg.",
  alternates: {
    canonical: "/ar/blog",
    languages: {
      en: `${SITE_URL}/blog`,
      ar: `${SITE_URL}/ar/blog`,
      "x-default": `${SITE_URL}/blog`,
    },
  },
};

export default function Page() {
 return <BlogListPage lang="ar" />;
}
