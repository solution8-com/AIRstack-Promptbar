import { db } from "@/lib/db";

type PromptWithId = { id: string };

export async function annotatePromptsWithUserVotes<T extends PromptWithId>(
  prompts: T[],
  userId?: string | null
): Promise<Array<T & { hasVoted: boolean }>> {
  if (!userId || prompts.length === 0) {
    return prompts.map((prompt) => ({
      ...prompt,
      hasVoted: false,
    }));
  }

  const promptIds = prompts.map((prompt) => prompt.id);
  const votes = await db.promptVote.findMany({
    where: {
      userId,
      promptId: { in: promptIds },
    },
    select: { promptId: true },
  });

  const votedIds = new Set(votes.map((vote) => vote.promptId));

  return prompts.map((prompt) => ({
    ...prompt,
    hasVoted: votedIds.has(prompt.id),
  }));
}
