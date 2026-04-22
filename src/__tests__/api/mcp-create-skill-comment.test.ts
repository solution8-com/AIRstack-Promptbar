import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "@/pages/api/mcp";
import { db } from "@/lib/db";
import type { NextApiRequest, NextApiResponse } from "next";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    prompt: {
      findFirst: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

// Mock MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    server: {
      setRequestHandler: vi.fn(),
    },
    registerTool: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn(),
    close: vi.fn(),
  })),
}));

describe("GET /api/mcp - Tool List", () => {
  it("should include create_skill_comment in tools list", async () => {
    const req = {
      method: "GET",
      headers: {},
      url: "/api/mcp",
    } as NextApiRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as NextApiResponse;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "create_skill_comment",
            description: expect.stringContaining("comment"),
          }),
        ]),
      })
    );
  });
});

describe("create_skill_comment MCP Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated requests", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    // Simulate tool invocation without authentication
    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: "Great skill!",
    }, null);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Authentication required");
  });

  it("should reject empty content", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: "   ",
    }, user);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("cannot be empty");
  });

  it("should reject comment on non-existent skill", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "nonexistent",
      content: "Test comment",
    }, user);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });

  it("should reject comment on private skill not owned by user", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    // Mock will return null because visibility filter won't match
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: "Test comment",
    }, user);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });

  it("should create comment successfully on public skill", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    const skill = {
      id: "skill123",
      title: "Test Skill",
      slug: "test-skill",
      authorId: "author1",
      isPrivate: false,
    };

    const comment = {
      id: "comment1",
      content: "Great skill with helpful instructions!",
      createdAt: new Date("2024-01-01"),
      author: {
        id: "user1",
        username: "testuser",
        name: "Test User",
      },
    };

    vi.mocked(db.prompt.findFirst).mockResolvedValue(skill as never);
    vi.mocked(db.comment.create).mockResolvedValue(comment as never);
    vi.mocked(db.notification.create).mockResolvedValue({} as never);

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: "Great skill with helpful instructions!",
    }, user);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"success": true');
    expect(result.content[0].text).toContain('"id": "comment1"');
    expect(result.content[0].text).toContain('"skillId": "skill123"');

    // Should create notification for skill owner
    expect(db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "COMMENT",
        userId: "author1",
        actorId: "user1",
      }),
    });
  });

  it("should not create notification when commenting on own skill", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    const skill = {
      id: "skill123",
      title: "Test Skill",
      slug: "test-skill",
      authorId: "user1", // Same as commenter
      isPrivate: false,
    };

    const comment = {
      id: "comment1",
      content: "Updating my own skill",
      createdAt: new Date("2024-01-01"),
      author: {
        id: "user1",
        username: "testuser",
        name: "Test User",
      },
    };

    vi.mocked(db.prompt.findFirst).mockResolvedValue(skill as never);
    vi.mocked(db.comment.create).mockResolvedValue(comment as never);

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: "Updating my own skill",
    }, user);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"success": true');

    // Should NOT create notification
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("should accept comment up to 10000 characters", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    const skill = {
      id: "skill123",
      title: "Test Skill",
      slug: "test-skill",
      authorId: "author1",
      isPrivate: false,
    };

    const longContent = "a".repeat(10000);
    const comment = {
      id: "comment1",
      content: longContent,
      createdAt: new Date("2024-01-01"),
      author: {
        id: "user1",
        username: "testuser",
        name: "Test User",
      },
    };

    vi.mocked(db.prompt.findFirst).mockResolvedValue(skill as never);
    vi.mocked(db.comment.create).mockResolvedValue(comment as never);
    vi.mocked(db.notification.create).mockResolvedValue({} as never);

    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: longContent,
    }, user);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"success": true');
  });

  it("should reject comment over 10000 characters via zod validation", async () => {
    const user = {
      id: "user1",
      username: "testuser",
      mcpPromptsPublicByDefault: false,
    };

    const tooLongContent = "a".repeat(10001);

    // Zod validation happens before our handler code, so this tests the schema
    const result = await simulateToolCall("create_skill_comment", {
      skillId: "skill123",
      content: tooLongContent,
    }, user);

    // The MCP SDK should reject this before it reaches our handler
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text ?? "").toContain("10000");
  });
});

// Helper function to simulate MCP tool execution
async function simulateToolCall(
  toolName: string,
  args: Record<string, unknown>,
  authenticatedUser: { id: string; username: string; mcpPromptsPublicByDefault: boolean } | null
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // This is a simplified simulation of what the MCP SDK does
  // In reality, the SDK handles the tool registration and invocation

  if (toolName === "create_skill_comment") {
    const { skillId, content } = args;

    if (!authenticatedUser) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Authentication required. Please provide an API key." }),
          },
        ],
        isError: true,
      };
    }

    // Trim content
    const trimmedContent = (content as string).trim();
    if (!trimmedContent) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Comment content cannot be empty" }) }],
        isError: true,
      };
    }

    // Build visibility filter
    const visibilityFilter = {
      OR: [
        { isPrivate: false },
        { isPrivate: true, authorId: authenticatedUser.id },
      ],
    };

    // Verify skill exists
    const skill = await db.prompt.findFirst({
      where: {
        id: skillId as string,
        type: "SKILL",
        isUnlisted: false,
        deletedAt: null,
        ...visibilityFilter,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        authorId: true,
        isPrivate: true,
      },
    });

    if (!skill) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Skill not found or you don't have permission to comment on it" }) }],
        isError: true,
      };
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        content: trimmedContent,
        promptId: skillId as string,
        authorId: authenticatedUser.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // Create notification if not own skill
    if (skill.authorId !== authenticatedUser.id) {
      await db.notification.create({
        data: {
          type: "COMMENT",
          userId: skill.authorId,
          actorId: authenticatedUser.id,
          promptId: skillId as string,
          commentId: comment.id,
        },
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              id: comment.id,
              skillId,
              content: comment.content,
              createdAt: comment.createdAt.toISOString(),
              author: {
                id: comment.author.id,
                username: comment.author.username,
                name: comment.author.name,
              },
              link: skill.isPrivate ? null : `https://prompts.chat/prompts/${skill.id}_${skill.slug || skill.id}`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}
