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
      isPrivate: false,
      authorId: "u2",
    } as never);
    vi.mocked(db.userPromptExample.create).mockResolvedValue({
      id: "e1",
      mediaUrl: "https://example.com/outcome.png",
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

  it("still rejects unsupported prompt types", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      type: "TEXT",
    } as never);

    const response = await GET(
      new Request("http://localhost:3000/api/prompts/p1/examples") as never,
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(response.status).toBe(400);
  });
});
