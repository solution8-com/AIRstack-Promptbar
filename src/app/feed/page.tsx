import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, FolderOpen, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PromptList } from "@/components/prompts/prompt-list";
import { annotatePromptsWithUserVotes } from "@/lib/prompt-votes";

export default async function FeedPage() {
  const t = await getTranslations("feed");
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch ALL prompts from admin users only, chronologically sorted
  const promptsRaw = await db.prompt.findMany({
    where: {
      isPrivate: false,
      isUnlisted: false,
      deletedAt: null,
      author: {
        role: "ADMIN"
      }
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          verified: true,
        },
      },
      category: {
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      _count: {
        select: {
          votes: true,
          contributors: true,
          outgoingConnections: { where: { label: { not: "related" } } },
          incomingConnections: { where: { label: { not: "related" } } },
        },
      },
    },
  });

  const prompts = promptsRaw.map((p) => ({
    ...p,
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
  }));
  const promptsWithVotes = await annotatePromptsWithUserVotes(prompts, session?.user?.id);

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold">{t("yourFeed")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("feedDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/prompts">
              {t("browseAll")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/discover">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t("discover")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Feed */}
      {prompts.length > 0 ? (
        <PromptList prompts={promptsWithVotes} currentPage={1} totalPages={1} isAdmin={isAdmin} isLoggedIn={!!session?.user} />
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-medium mb-1">{t("noPromptsInFeed")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("noAdminPromptsYet")}
          </p>
        </div>
      )}
    </div>
  );
}
