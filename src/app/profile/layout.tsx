import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | MuscleHub",
  description: "View and edit your MuscleHub profile, avatar, and account settings.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
