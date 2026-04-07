import OpenAI from "openai";

let githubModelsClient: OpenAI | null = null;

export interface CallGitHubModelsOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIErrorResponse {
  error?: { code?: string };
  status?: number;
}

function getGitHubModelsClient(): OpenAI | null {
  if (githubModelsClient) {
    return githubModelsClient;
  }

  const githubToken = process.env.GITHUB_MODELS_TOKEN;
  if (!githubToken) {
    return null;
  }

  githubModelsClient = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: githubToken,
  });

  return githubModelsClient;
}

export function isGitHubModelsAvailable(): boolean {
  return !!process.env.GITHUB_MODELS_TOKEN;
}

export async function callGitHubModels(
  prompt: string,
  systemPrompt?: string,
  options?: CallGitHubModelsOptions
): Promise<string | null> {
  const client = getGitHubModelsClient();
  if (!client) {
    return null;
  }

  const preferredModel = options?.model || "gpt-5-nano";
  const fallbackModel = "gpt-4o-mini";
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 1000;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemPrompt?.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const response = await client.chat.completions.create({
      model: preferredModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error: unknown) {
    const err = error as OpenAIErrorResponse;
    if (
      preferredModel !== fallbackModel &&
      (err?.error?.code === "model_not_found" || err?.status === 404)
    ) {
      const response = await client.chat.completions.create({
        model: fallbackModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      });
      return response.choices[0]?.message?.content?.trim() || null;
    }
    console.error("[callGitHubModels] Error:", error);
    return null;
  }
}
