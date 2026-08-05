"use client";
import { BlogEditorView } from "@/components/views/BlogEditorView";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BlogEditorView mode="edit" postId={id} />;
}
