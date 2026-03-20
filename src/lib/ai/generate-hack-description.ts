import OpenAI from "openai";

/**
 * Generate a description for an internal hack based on the implementation guide
 * Uses GitHub Models API (OpenAI-compatible) with gpt-4o-mini as a lightweight model
 */

let githubModelsClient: OpenAI | null = null;

function getGitHubModelsClient(): OpenAI | null {
  if (githubModelsClient) {
    return githubModelsClient;
  }

  // GitHub Models API uses a GitHub token for authentication
  const githubToken = process.env.GITHUB_MODELS_TOKEN;

  if (!githubToken) {
    // Silently return null if not configured - feature is optional
    return null;
  }

  githubModelsClient = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: githubToken,
  });

  return githubModelsClient;
}

/**
 * Generate a description for an internal hack from its implementation guide
 * @param title - The hack title
 * @param implementationGuide - The hack implementation guide content
 * @returns Generated description or null if generation fails/is disabled
 */
export async function generateHackDescription(
  title: string,
  implementationGuide: string
): Promise<string | null> {
  const client = getGitHubModelsClient();

  if (!client) {
    // Feature not enabled, return null
    return null;
  }

  try {
    const systemPrompt = `You are a technical writer creating concise descriptions for internal development hacks and solutions.

Your task is to:
1. Read the hack implementation guide
2. Extract the key purpose and main functionality
3. Write a clear, concise description (2-3 sentences max)
4. Focus on WHAT the hack does and WHY it's useful
5. Avoid implementation details - those are in the guide

The description should be:
- Clear and professional
- 2-3 sentences maximum
- Focused on the value and purpose
- Written in present tense
- No marketing fluff, just facts`;

    const userPrompt = `Title: ${title}

Implementation Guide:
${implementationGuide}

Generate a concise description (2-3 sentences) that explains what this hack does and why it's useful.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini as the lightweight model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const generatedDescription = response.choices[0]?.message?.content?.trim();

    if (!generatedDescription) {
      return null;
    }

    // Ensure description is not too long (max 500 chars as per schema)
    if (generatedDescription.length > 500) {
      return generatedDescription.substring(0, 497) + "...";
    }

    return generatedDescription;
  } catch (error) {
    // Log error but don't throw - generation is optional
    console.error("[generateHackDescription] Error generating description:", error);
    return null;
  }
}

/**
 * Check if hack description generation is enabled
 */
export function isHackDescriptionGenerationEnabled(): boolean {
  return !!process.env.GITHUB_MODELS_TOKEN;
}
