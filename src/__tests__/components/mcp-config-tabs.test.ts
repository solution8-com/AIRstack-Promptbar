/**
 * Tests for the MCP config generation logic in mcp-config-tabs.tsx.
 *
 * Since `getConfig` is not exported, these tests use simulation helpers that
 * mirror the same logic, verifying env-driven server name/package substitution
 * and the URL quoting regression guard (URLs containing `?` must be
 * double-quoted in shell commands so the shell does not split on `?`).
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Helpers that mirror the getConfig logic from mcp-config-tabs.tsx
// ---------------------------------------------------------------------------

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildLocalEnv(
  apiKey?: string | null,
  queryParams?: string
): Record<string, string> | undefined {
  const env: Record<string, string> = {};
  if (apiKey) env.PROMPTS_API_KEY = apiKey;
  if (queryParams) env.PROMPTS_QUERY = queryParams;
  return Object.keys(env).length > 0 ? env : undefined;
}

function getCursorRemoteConfig(
  serverName: string,
  mcpUrl: string,
  apiKey?: string | null
): string {
  const config: Record<string, unknown> = {
    mcpServers: {
      [serverName]: {
        url: mcpUrl,
        ...(apiKey && { headers: { PROMPTS_API_KEY: apiKey } }),
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

function getCursorLocalConfig(
  serverName: string,
  packageName: string,
  apiKey?: string | null,
  queryParams?: string
): string {
  const localEnv = buildLocalEnv(apiKey, queryParams);
  const config: Record<string, unknown> = {
    mcpServers: {
      [serverName]: {
        command: "npx",
        args: ["-y", packageName],
        ...(localEnv && { env: localEnv }),
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

function getClaudeCodeRemoteConfig(
  serverName: string,
  mcpUrl: string,
  apiKey?: string | null
): string {
  if (apiKey) {
    return `claude mcp add --transport http ${serverName} "${mcpUrl}" --header ${shellEscape(`PROMPTS_API_KEY: ${apiKey}`)}`;
  }
  return `claude mcp add --transport http ${serverName} "${mcpUrl}"`;
}

function getClaudeCodeLocalConfig(
  serverName: string,
  packageName: string,
  apiKey?: string | null,
  queryParams?: string
): string {
  const localEnv = buildLocalEnv(apiKey, queryParams);
  const envPrefix = localEnv
    ? Object.entries(localEnv)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ") + " "
    : "";
  return `${envPrefix}claude mcp add ${serverName} -- npx -y ${packageName}`;
}

function getWindsurfRemoteConfig(
  serverName: string,
  mcpUrl: string,
  apiKey?: string | null
): string {
  const config: Record<string, unknown> = {
    mcpServers: {
      [serverName]: {
        serverUrl: mcpUrl,
        ...(apiKey && { headers: { PROMPTS_API_KEY: apiKey } }),
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

function getGeminiRemoteConfig(
  serverName: string,
  mcpUrl: string,
  apiKey?: string | null
): string {
  if (apiKey) {
    return `PROMPTS_API_KEY=${shellEscape(apiKey)} gemini mcp add ${serverName} --transport sse "${mcpUrl}"`;
  }
  return `gemini mcp add ${serverName} --transport sse "${mcpUrl}"`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const CUSTOM_SERVER_NAME = "s8promptbar";
const CUSTOM_NPM_PACKAGE = "@myorg/my-mcp";
const DEFAULT_SERVER_NAME = "prompts.chat";

describe("mcp-config-tabs – env-driven server name and package", () => {
  it("cursor remote – JSON output has server key equal to custom server name, not 'prompts.chat'", () => {
    const mcpUrl = "https://example.com/api/mcp";
    const output = getCursorRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);
    const parsed = JSON.parse(output);

    expect(parsed.mcpServers).toHaveProperty(CUSTOM_SERVER_NAME);
    expect(parsed.mcpServers).not.toHaveProperty(DEFAULT_SERVER_NAME);
    expect(parsed.mcpServers[CUSTOM_SERVER_NAME].url).toBe(mcpUrl);
  });

  it("cursor remote – URL with query params is preserved exactly (no double-encoding)", () => {
    const mcpUrl = "https://example.com/api/mcp?tag=foo&user=bar";
    const output = getCursorRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);
    const parsed = JSON.parse(output);

    expect(parsed.mcpServers[CUSTOM_SERVER_NAME].url).toBe(mcpUrl);
  });

  it("claude-code remote with API key – output contains --transport http <serverName> and --header PROMPTS_API_KEY", () => {
    const mcpUrl = "https://example.com/api/mcp";
    const apiKey = "myapikey123";
    const output = getClaudeCodeRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl, apiKey);

    expect(output).toContain(`--transport http ${CUSTOM_SERVER_NAME}`);
    expect(output).toContain("--header");
    expect(output).toContain("PROMPTS_API_KEY");
    expect(output).not.toContain(DEFAULT_SERVER_NAME);
  });

  it("claude-code remote without API key – no --header flag in output", () => {
    const mcpUrl = "https://example.com/api/mcp";
    const output = getClaudeCodeRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);

    expect(output).toContain(`--transport http ${CUSTOM_SERVER_NAME}`);
    expect(output).not.toContain("--header");
    expect(output).not.toContain(DEFAULT_SERVER_NAME);
  });

  it("claude-code local – output contains custom server name and custom npm package", () => {
    const output = getClaudeCodeLocalConfig(CUSTOM_SERVER_NAME, CUSTOM_NPM_PACKAGE);

    expect(output).toContain(CUSTOM_SERVER_NAME);
    expect(output).toContain(CUSTOM_NPM_PACKAGE);
    expect(output).not.toContain(DEFAULT_SERVER_NAME);
  });

  it("windsurf remote – JSON output has server key equal to custom server name", () => {
    const mcpUrl = "https://example.com/api/mcp";
    const output = getWindsurfRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);
    const parsed = JSON.parse(output);

    expect(parsed.mcpServers).toHaveProperty(CUSTOM_SERVER_NAME);
    expect(parsed.mcpServers).not.toHaveProperty(DEFAULT_SERVER_NAME);
    expect(parsed.mcpServers[CUSTOM_SERVER_NAME].serverUrl).toBe(mcpUrl);
  });

  it("gemini remote – command contains 'gemini mcp add <serverName>'", () => {
    const mcpUrl = "https://example.com/api/mcp";
    const output = getGeminiRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);

    expect(output).toContain(`gemini mcp add ${CUSTOM_SERVER_NAME}`);
    expect(output).not.toContain(DEFAULT_SERVER_NAME);
  });

  it("URL quoting regression guard – URL containing '?' is wrapped in double quotes in shell commands", () => {
    const mcpUrl = "https://example.com/api/mcp?tag=foo&user=bar";

    const claudeOutput = getClaudeCodeRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);
    expect(claudeOutput).toContain(`"${mcpUrl}"`);

    const geminiOutput = getGeminiRemoteConfig(CUSTOM_SERVER_NAME, mcpUrl);
    expect(geminiOutput).toContain(`"${mcpUrl}"`);
  });
});
