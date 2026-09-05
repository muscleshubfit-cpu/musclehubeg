import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | Alkemos",
  description: "View and edit your Alkemos profile, avatar, and account settings.",
  // Private authenticated page — do not index.
  robots: { index: false, follow: false },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
