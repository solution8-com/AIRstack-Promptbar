import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/prompts/[id]/examples/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    userPromptExample: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Prompt examples API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET examples for SKILL prompts", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      type: "SKILL",
      structuredFormat: null,
    } as never);
    vi.mocked(db.userPromptExample.findMany).mockResolvedValue([] as never);

    const response = await GET(
      new Request("http://localhost:3000/api/prompts/p1/examples") as never,
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(response.status).toBe(200);
    expect(db.userPromptExample.findMany).toHaveBeenCalled();
  });

  it("allows POST examples for SKILL prompts", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      type: "SKILL",
      structuredFormat: null,
      isPrivate: false,
      authorId: "u2",
    } as never);
    vi.mocked(db.userPromptExample.create).mockResolvedValue({
      id: "e1",
      mediaUrl: "https://example.com/outcome.png",
      content: null,
      comment: null,
      user: { id: "u1", username: "user1", name: null, avatar: null },
    } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/prompts/p1/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: "https://example.com/outcome.png" }),
      }) as never,
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(response.status).toBe(200);
    expect(db.userPromptExample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptId: "p1",
          userId: "u1",
          mediaUrl: "https://example.com/outcome.png",
        }),
      })
    );
  });

  it("allows text examples for structured TEXT prompts", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u2", role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p2",
      type: "TEXT",
      structuredFormat: "JSON",
      isPrivate: false,
      authorId: "u3",
    } as never);
    vi.mocked(db.userPromptExample.create).mockResolvedValue({
      id: "e2",
      mediaUrl: null,
      content: "Example output",
      comment: null,
      user: { id: "u2", username: "user2", name: null, avatar: null },
    } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/prompts/p2/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Example output" }),
      }) as never,
      { params: Promise.resolve({ id: "p2" }) }
    );

    expect(response.status).toBe(200);
    expect(db.userPromptExample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptId: "p2",
          userId: "u2",
          content: "Example output",
        }),
      })
    );
  });

  it("still rejects unsupported prompt types", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      type: "TEXT",
      structuredFormat: null,
    } as never);

    const response = await GET(
      new Request("http://localhost:3000/api/prompts/p1/examples") as never,
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(response.status).toBe(400);
  });
});
