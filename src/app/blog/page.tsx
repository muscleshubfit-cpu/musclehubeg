import type { Metadata } from "next";
import { BlogView } from "@/components/views/BlogView";

export const metadata: Metadata = {
  title: "المدونة | Ahmed Zake Coaching",
  description:
    "مقالات ونصائح في التغذية والتمرين من الكوتش أحمد زكي — علمي، مباشر، ومناسب لحياتك اليومية.",
  openGraph: {
    title: "المدونة | Ahmed Zake Coaching",
    description: "مقالات ونصائح في التغذية والتمرين من الكوتش أحمد زكي.",
    type: "website",
  },
};

export default function Page() {
  return <BlogView />;
}
