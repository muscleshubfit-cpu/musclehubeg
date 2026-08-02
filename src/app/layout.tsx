import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Ahmed Zake — Online Nutrition & Fitness Coaching",
  description:
    "Custom meal plans, workout programs, weekly progress tracking and 1-on-1 coaching with Ahmed Zake.",
  keywords: [
    "Ahmed Zake",
    "nutrition coaching",
    "fitness coaching",
    "meal plans",
    "workout plans",
    "online coaching Egypt",
    "تغذية",
    "تمارين",
    "كوتش",
  ],
  authors: [{ name: "Ahmed Zake" }],
  openGraph: {
    title: "Ahmed Zake — Online Nutrition & Fitness Coaching",
    description:
      "Build the body you deserve with personalized coaching by Ahmed Zake.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahmed Zake — Online Coaching",
    description: "Build the body you deserve with personalized coaching.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
