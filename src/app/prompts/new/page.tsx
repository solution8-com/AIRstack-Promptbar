import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PromptForm } from "@/components/prompts/prompt-form";
import { db } from "@/lib/db";
import { isAIGenerationEnabled, getAIModelName } from "@/lib/ai/generation";

export const metadata: Metadata = {
  title: "Create Prompt",
  description: "Create a new prompt",
};

interface PageProps {
  searchParams: Promise<{ 
    prompt?: string; 
    title?: string; 
    content?: string;
    type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "SKILL" | "TASTE";
    format?: "JSON" | "YAML";
    mode?: "prompt" | "internal-hack";
  }>;
}

export default async function NewPromptPage({ searchParams }: PageProps) {
  const session = await auth();
  const { prompt: initialPromptRequest, title, content, type, format, mode } = await searchParams;
  
  const isInternalHackMode = mode === "internal-hack";

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch categories for the form (with parent info for nesting)
  const categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  });

  // Fetch tags for the form
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
  });

  // Check if AI generation is enabled
  const aiGenerationEnabled = await isAIGenerationEnabled();
  const aiModelName = getAIModelName();

  return (
    <div className="container max-w-6xl py-8">
      <PromptForm 
        categories={categories} 
        tags={tags} 
        aiGenerationEnabled={aiGenerationEnabled}
        aiModelName={aiModelName}
        initialPromptRequest={initialPromptRequest}
        isInternalHackMode={isInternalHackMode}
        initialData={(title || content || type || format) ? { 
          title: title || "", 
          content: content || "",
          type: type || "TEXT",
          structuredFormat: format || undefined,
        } : undefined}
      />
    </div>
  );
}
