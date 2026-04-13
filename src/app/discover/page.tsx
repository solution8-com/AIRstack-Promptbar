import { DiscoverTabs } from "@/components/prompts/discover-tabs";
import { StructuredData } from "@/components/seo/structured-data";
import { db } from "@/lib/db";
import { getAdminUsernames } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { annotatePromptsWithUserVotes } from "@/lib/prompt-votes";

export default async function DiscoverPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const limit = 25;

  const promptInclude = {
    author: {
      select: { id: true, name: true, username: true, avatar: true, verified: true },
    },
    category: {
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    },
    tags: {
      include: { tag: true },
    },
    contributors: {
      select: { id: true, username: true, name: true, avatar: true },
    },
    _count: {
      select: {
        votes: true,
        contributors: true,
        outgoingConnections: { where: { label: { not: "related" } } },
        incomingConnections: { where: { label: { not: "related" } } },
      },
    },
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [featuredPromptsRaw, latestPromptsRaw, recentlyUpdatedRaw, mostContributedRaw, allUsernames] = await Promise.all([
    db.prompt.findMany({
      where: {
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
        isFeatured: true,
      },
      orderBy: { featuredAt: "desc" },
      take: limit,
      include: promptInclude,
    }),
    db.prompt.findMany({
      where: {
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: promptInclude,
    }),
    db.prompt.findMany({
      where: {
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: promptInclude,
    }),
    db.prompt.findMany({
      where: {
        isPrivate: false,
        isUnlisted: false,
        deletedAt: null,
      },
      orderBy: {
        contributors: {
          _count: "desc",
        },
      },
      take: limit,
      include: promptInclude,
    }),
    // Fetch all unique usernames for autocomplete
    db.user.findMany({
      select: { username: true },
      distinct: 'username',
    }),
  ]);

  const mapPrompt = (p: typeof featuredPromptsRaw[0]) => ({
    ...p,
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
    contributors: p.contributors,
  });

  const featuredPrompts = featuredPromptsRaw.map(mapPrompt);
  const latestPrompts = latestPromptsRaw.map(mapPrompt);
  const recentlyUpdated = recentlyUpdatedRaw.map(mapPrompt);
  const mostContributed = mostContributedRaw.map(mapPrompt);
  // Today's most upvoted is same as latest for now (can be computed client-side if needed)
  const todaysMostUpvoted = latestPrompts;

  const sessionUserId = session?.user?.id;
  const annotatedFeaturedPrompts = await annotatePromptsWithUserVotes(featuredPrompts, sessionUserId);
  const annotatedLatestPrompts = await annotatePromptsWithUserVotes(latestPrompts, sessionUserId);
  const annotatedRecentlyUpdated = await annotatePromptsWithUserVotes(recentlyUpdated, sessionUserId);
  const annotatedMostContributed = await annotatePromptsWithUserVotes(mostContributed, sessionUserId);
  const annotatedTodaysMostUpvoted = await annotatePromptsWithUserVotes(todaysMostUpvoted, sessionUserId);
  
  const adminUsernames = getAdminUsernames();

  // Fetch top prompts for structured data
  const topPrompts = await db.prompt.findMany({
    where: {
      isPrivate: false,
      isUnlisted: false,
      deletedAt: null,
    },
    orderBy: {
      votes: { _count: "desc" },
    },
    take: 10,
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
    },
  });

  const itemListData = topPrompts.map((prompt) => ({
    name: prompt.title,
    url: `/prompts/${prompt.id}${prompt.slug ? `_${prompt.slug}` : ""}`,
    description: prompt.description || undefined,
  }));

  return (
    <>
      <StructuredData
        type="itemList"
        data={{ items: itemListData }}
      />
      <StructuredData
        type="breadcrumb"
        data={{
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Discover", url: "/discover" },
          ],
        }}
      />
      <DiscoverTabs
        featuredPrompts={annotatedFeaturedPrompts}
        todaysMostUpvoted={annotatedTodaysMostUpvoted}
        latestPrompts={annotatedLatestPrompts}
        recentlyUpdated={annotatedRecentlyUpdated}
        mostContributed={annotatedMostContributed}
        allUsernames={allUsernames.map(u => u.username)}
        adminUsernames={adminUsernames}
        isAdmin={isAdmin}
        isLoggedIn={!!session?.user}
      />
    </>
  );
}
