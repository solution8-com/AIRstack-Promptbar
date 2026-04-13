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
import { UpvoteButton } from "@/components/prompts/upvote-button";

interface GuidePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("prompts");
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const guide = await db.prompt.findUnique({
    where: {
      id,
      type: "GUIDE",
      ...(isAdmin ? {} : { deletedAt: null, isPrivate: false, isUnlisted: false })
    },
    select: { title: true, description: true },
  });

  if (!guide) {
    return { title: t("guideNotFound") };
  }

  return {
    title: guide.title,
    description: guide.description || t("readTheGuide", { title: guide.title }),
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const tNav = await getTranslations("nav");
  const t = await getTranslations("prompts");

  const guide = await db.prompt.findUnique({
    where: {
      id,
      type: "GUIDE",
      ...(isAdmin ? {} : { deletedAt: null, isPrivate: false, isUnlisted: false })
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    },
  });

  if (!guide) {
    notFound();
  }

  const hasVoted = session?.user
    ? Boolean(await db.promptVote.findUnique({
        where: {
          userId_promptId: {
            userId: session.user.id,
            promptId: guide.id,
          },
        },
      }))
    : false;
  const initialVoteCount = guide._count?.votes ?? 0;
  const isLoggedIn = !!session?.user;

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
        <div className="flex items-center gap-2">
          <UpvoteButton
            promptId={guide.id}
            initialVoted={hasVoted}
            initialCount={initialVoteCount}
            isLoggedIn={isLoggedIn}
            size="sm"
            showLabel={false}
          />
          {isAdmin && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link href={`/prompts/${guide.id}/edit`}>
                <Edit className="h-4 w-4" />
                {t("editGuide")}
              </Link>
            </Button>
          )}
        </div>
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
              <AnimatedDate date={guide.createdAt} relativeText={timeAgo} />
            </p>
          </div>
        </div>
      </header>

      {/* Guide content rendered as Markdown */}
      <GuideContent content={guide.content} />
    </div>
  );
}
