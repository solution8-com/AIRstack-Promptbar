import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfinitePromptList } from "@/components/prompts/infinite-prompt-list";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function generateMetadata() {
  const tNav = await getTranslations("nav");
  const tPrompts = await getTranslations("prompts");

  return {
    title: tNav("guides"),
    description: tPrompts("guidesDescription"),
  };
}

// Query for guides list (cached)
function getCachedGuides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderBy: any,
  perPage: number,
  searchQuery?: string
) {
  const cacheKey = JSON.stringify({ orderBy, perPage, searchQuery });

  return unstable_cache(
    async () => {
      try {
        const where: Record<string, unknown> = {
          type: "GUIDE",
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
        };

        if (searchQuery) {
          where.OR = [
            { title: { contains: searchQuery, mode: "insensitive" } },
            { content: { contains: searchQuery, mode: "insensitive" } },
            { description: { contains: searchQuery, mode: "insensitive" } },
          ];
        }

        const [guidesRaw, totalCount] = await Promise.all([
          db.prompt.findMany({
            where,
            orderBy,
            skip: 0,
            take: perPage,
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
              contributors: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
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
          }),
          db.prompt.count({ where }),
        ]);

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          guides: guidesRaw.map((p: any) => ({
            ...p,
            voteCount: p._count.votes,
            contributorCount: p._count.contributors,
            contributors: p.contributors,
          })),
          total: totalCount,
        };
      } catch (error) {
        // Only swallow errors caused by a missing GUIDE enum value in the DB
        // (i.e. the migration adding GUIDE to PromptType hasn't been applied yet).
        // Re-throw everything else so transient DB/network failures are not
        // cached as a permanently-empty result by unstable_cache.
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("invalid input value for enum") ||
          message.includes("does not exist in the enum")
        ) {
          console.error(
            "GUIDE enum not yet in DB (migration pending) — returning empty list:",
            message
          );
          return { guides: [], total: 0 };
        }
        throw error;
      }
    },
    ["guides", cacheKey],
    { tags: ["prompts"] }
  )();
}

interface GuidesPageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
  }>;
}

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const t = await getTranslations("prompts");
  const tNav = await getTranslations("nav");
  const tSearch = await getTranslations("search");
  const params = await searchParams;

  const perPage = 24;

  // Build order by clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  if (params.sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (params.sort === "upvotes") {
    orderBy = { votes: { _count: "desc" } };
  }

  const result = await getCachedGuides(orderBy, perPage, params.q);
  const guides = result.guides;
  const total = result.total;

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold">{tNav("guides")}</h1>
          <span className="text-xs text-muted-foreground">{tSearch("found", { count: total })}</span>
        </div>
        {isAdmin && (
          <Button size="sm" className="h-8 text-xs w-full sm:w-auto bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/guides/new">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("createGuide")}
            </Link>
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {t("guidesDescription")}
      </p>

      <InfinitePromptList
        initialPrompts={guides}
        initialTotal={total}
        isAdmin={isAdmin}
        filters={{
          q: params.q,
          type: "GUIDE",
          sort: params.sort,
        }}
      />
    </div>
  );
}
