import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { callGitHubModels, isGitHubModelsAvailable } from "@/lib/ai/github-models";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(20000, "Prompt too long"),
  systemPrompt: z.string().max(10000, "System prompt too long").optional(),
  model: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!isGitHubModelsAvailable()) {
      return NextResponse.json(
        { error: "GitHub Models is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, systemPrompt, model } = validation.data;
    const result = await callGitHubModels(prompt, systemPrompt, { model });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate response from GitHub Models" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("[POST /api/ai/github-models] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
