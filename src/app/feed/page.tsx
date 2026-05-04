import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, FolderOpen, Heart, Bookmark, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PromptList } from "@/components/prompts/prompt-list";
import { annotatePromptsWithUserVotes } from "@/lib/prompt-votes";
import { cn } from "@/lib/utils";

/**
 * Renders the user's feed page showing recent admin-authored prompts with header and filter controls.
 *
 * Loads feed translations, enforces authentication (redirecting to /login when unauthenticated), fetches recent public prompts authored by admins, annotates them with the current user's vote state, and renders the header, filter controls, and either a prompt list or an empty-state card.
 *
 * @returns The React element for the feed page containing the header, filter controls, and prompt list or an empty-state message.
 */
export default async function FeedPage() {
  const t = await getTranslations("feed");
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Prompts authored by admins that have been liked by at least one admin
  const promptsRaw = await db.prompt.findMany({
    where: {
      isPrivate: false,
      isUnlisted: false,
      deletedAt: null,
      author: {
        role: "ADMIN"
      },
      votes: {
        some: {
          user: { role: "ADMIN" }
        }
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

  const filters = [
    { label: t("filterLikedByTeam"), icon: Heart, active: true },
    { label: t("filterBookmarkedByTeam"), icon: Bookmark, active: false },
    { label: t("filterCreatedByTeam"), icon: UserPlus, active: false },
    { label: t("browseAll"), icon: ArrowRight, active: false, href: "/prompts" },
  ];

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{t("yourFeed")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("feedDescription")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) =>
            filter.href ? (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                asChild
                className="h-8 px-3 text-xs transition-all"
              >
                <Link href={filter.href}>
                  {filter.icon && <filter.icon className="mr-1.5 h-3.5 w-3.5" />}
                  {filter.label}
                </Link>
              </Button>
            ) : (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                disabled={!filter.active}
                aria-pressed={filter.active}
                className={cn(
                  "h-8 px-3 text-xs transition-all",
                  filter.active
                    ? "border-2 border-primary bg-background text-foreground"
                    : "opacity-50"
                )}
              >
                {filter.icon && <filter.icon className="mr-1.5 h-3.5 w-3.5" />}
                {filter.label}
              </Button>
            )
          )}
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
