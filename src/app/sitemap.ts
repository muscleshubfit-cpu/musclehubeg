import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://musclehubeg.vercel.app";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly" as const, priority: 0.3 },
  ];
}
