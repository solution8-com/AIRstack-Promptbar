import { callGitHubModels, isGitHubModelsAvailable } from "@/lib/ai/github-models";

/**
 * Generate a description for an internal hack based on the implementation guide
 * Uses GitHub Models API (OpenAI-compatible) with gpt-5-nano as the primary model
 */

/**
 * Generate a description for an internal hack from its implementation guide
 * @param title - The hack title
 * @param implementationGuide - The hack implementation guide content
 * @returns Generated description or null if generation fails
 */
export async function generateHackDescription(
  title: string,
  implementationGuide: string
): Promise<string | null> {
  try {
    if (!isGitHubModelsAvailable()) {
      throw new Error(
        "GITHUB_MODELS_TOKEN environment variable is required for internal hack description generation. " +
          "Get a token from https://github.com/marketplace/models and add it to your .env file."
      );
    }

    // Optimized system prompt following OSTA (Optimized System Task Assignment) best practices
    // Based on 2026 AI prompt engineering guidelines for technical documentation
    const systemPrompt = `You are a technical documentation specialist focused on creating concise, value-driven descriptions for internal development solutions.

# Role & Expertise
You generate clear, professional descriptions for internal development hacks, tools, and implementation guides used by engineering teams.

# Task Requirements
1. Read and analyze the provided implementation guide
2. Extract the core purpose, key functionality, and business value
3. Generate a description that is:
   - 2-3 sentences maximum (under 500 characters)
   - Focused on WHAT the solution does and WHY it matters
   - Written in present tense
   - Professional and factual (no marketing language)
   - Emphasizes practical impact and use cases

# Output Format
Return ONLY the description text. No preamble, no explanations, no markdown formatting.

# Guidelines
- Prioritize clarity and actionability
- Avoid implementation details (those are in the guide itself)
- Highlight the problem solved or value delivered
- Use concrete, specific language
- If the guide is unclear, focus on observable outcomes

# Example Output Structure
"[Solution name] [primary action/capability] by [key approach]. It [specific benefit] for [target users/scenarios]. Designed for [use case context]."`;

    const userPrompt = `Title: ${title}

Implementation Guide:
${implementationGuide}

Generate a concise description (2-3 sentences, under 500 characters) that explains what this hack does and why it's valuable.`;

    const generatedDescription = await callGitHubModels(userPrompt, systemPrompt, {
      model: "openai/gpt-5-nano",
      temperature: 0.3,
      maxTokens: 150,
    });

    if (!generatedDescription) {
      return null;
    }

    // Ensure description is not too long (max 500 chars as per schema)
    if (generatedDescription.length > 500) {
      return generatedDescription.substring(0, 497) + "...";
    }

    return generatedDescription;
  } catch (error) {
    console.error("[generateHackDescription] Error generating description:", error);
    // Re-throw if it's the missing token error
    if (error instanceof Error && error.message.includes("GITHUB_MODELS_TOKEN")) {
      throw error;
    }
    // For other errors, return null to allow hack creation to proceed
    return null;
  }
}

/**
 * Check if hack description generation is enabled
 */
export function isHackDescriptionGenerationEnabled(): boolean {
  return isGitHubModelsAvailable();
}
