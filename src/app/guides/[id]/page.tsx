import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatDistanceToNow } from "@/lib/date";
import { ArrowLeft, Edit } from "lucide-react";
import { AnimatedDate } from "@/components/ui/animated-date";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuideContent } from "@/components/guides/guide-content";

interface GuidePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { id } = await params;
  const guide = await db.prompt.findUnique({
    where: { id, type: "GUIDE" },
    select: { title: true, description: true },
  });

  if (!guide) {
    return { title: "Guide Not Found" };
  }

  return {
    title: guide.title,
    description: guide.description || `Read the guide: ${guide.title}`,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const tNav = await getTranslations("nav");

  const guide = await db.prompt.findUnique({
    where: { id, type: "GUIDE", deletedAt: null },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!guide) {
    notFound();
  }

  const timeAgo = formatDistanceToNow(guide.createdAt);

  return (
    <div className="container max-w-4xl py-8">
      {/* Back link */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground">
          <Link href="/guides">
            <ArrowLeft className="h-4 w-4" />
            {tNav("guides")}
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/prompts/${guide.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {/* Guide header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">{guide.title}</h1>
        {guide.description && (
          <p className="text-lg text-muted-foreground mb-6">{guide.description}</p>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={guide.author.avatar || undefined} alt={guide.author.name || ""} />
            <AvatarFallback>{(guide.author.name || guide.author.username || "?")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <Link
              href={`/${guide.author.username}`}
              className="text-sm font-medium hover:underline"
            >
              {guide.author.name || guide.author.username}
            </Link>
            <p className="text-xs text-muted-foreground">
              <AnimatedDate date={guide.createdAt} fallback={timeAgo} />
            </p>
          </div>
        </div>
      </header>

      {/* Guide content rendered as Markdown */}
      <GuideContent content={guide.content} />
    </div>
  );
}
