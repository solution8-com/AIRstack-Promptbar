import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsFilteredList } from "@/components/prompts/skills-filtered-list";
import { db } from "@/lib/db";
import { getAdminUsernames } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Skills",
  description: "Browse and discover AI agent skills",
};

// Query for skills list (cached)
function getCachedSkills(perPage: number) {
  return unstable_cache(
    async () => {
      const where: Record<string, unknown> = {
        type: "SKILL",
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
      };

      const [skillsRaw, totalCount] = await Promise.all([
        db.prompt.findMany({
          where,
          orderBy: { createdAt: "desc" },
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
        skills: skillsRaw.map((p: any) => ({
          ...p,
          voteCount: p._count.votes,
          contributorCount: p._count.contributors,
          contributors: p.contributors,
        })),
        total: totalCount,
      };
    },
    ["skills"],
    { tags: ["prompts"] }
  )();
}

export default async function SkillsPage() {
  const t = await getTranslations("prompts");
  const tNav = await getTranslations("nav");
  const tSearch = await getTranslations("search");
  
  const perPage = 100; // Fetch more since we're doing client-side filtering

  const result = await getCachedSkills(perPage);
  const skills = result.skills;
  const total = result.total;

  // Fetch all usernames for autocomplete
  const allUsernames = await db.user.findMany({
    select: { username: true },
    distinct: 'username',
  });

  const adminUsernames = getAdminUsernames();

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold">{tNav("skills")}</h1>
          <span className="text-xs text-muted-foreground">{tSearch("found", { count: total })}</span>
        </div>
        <Button size="sm" className="h-8 text-xs w-full sm:w-auto" asChild>
          <Link href="/prompts/new?type=SKILL">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("createSkill")}
          </Link>
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        {t("skillsDescription")}
      </p>

      <SkillsFilteredList
        skills={skills}
        allUsernames={allUsernames.map(u => u.username)}
        adminUsernames={adminUsernames}
      />
    </div>
  );
}
