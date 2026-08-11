import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
 return <BlogArticlePageAsync params={params} />;
}

import { BlogArticlePage as ArticleComponent } from "@/components/blog/BlogArticlePage";

async function BlogArticlePageAsync({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 return <ArticleComponent lang="en" slug={slug} />;
}
