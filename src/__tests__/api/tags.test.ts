import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/tags/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePromptSlug } from "@/lib/slug";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    tag: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/slug", () => ({
  generatePromptSlug: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("POST /api/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "new tag" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid input", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("should create and return tag for authenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(generatePromptSlug).mockResolvedValue("new-tag");
    vi.mocked(db.tag.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.tag.create).mockResolvedValue({
      id: "tag-1",
      name: "New Tag",
      slug: "new-tag",
      color: "#6366f1",
    } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "New Tag" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(generatePromptSlug).toHaveBeenCalledWith("New Tag");
    expect(db.tag.findUnique).toHaveBeenCalledWith({
      where: { slug: "new-tag" },
    });
    expect(db.tag.create).toHaveBeenCalledWith({
      data: {
        name: "New Tag",
        slug: "new-tag",
        color: "#6366f1",
      },
    });
    expect(data).toEqual({
      id: "tag-1",
      name: "New Tag",
      slug: "new-tag",
      color: "#6366f1",
    });
  });

  it("should return existing tag when slug matches and name intent matches", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(generatePromptSlug).mockResolvedValue("new-tag");
    vi.mocked(db.tag.findUnique).mockResolvedValue({
      id: "tag-1",
      name: "new tag",
      slug: "new-tag",
      color: "#6366f1",
    } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "New Tag" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.tag.create).not.toHaveBeenCalled();
    expect(data).toEqual({
      id: "tag-1",
      name: "new tag",
      slug: "new-tag",
      color: "#6366f1",
    });
  });

  it("should return 409 when slug matches a different tag name intent", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(generatePromptSlug).mockResolvedValue("new-tag");
    vi.mocked(db.tag.findUnique).mockResolvedValue({
      id: "tag-1",
      name: "Different Tag",
      slug: "new-tag",
      color: "#6366f1",
    } as never);

    const response = await POST(
      new Request("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "New Tag" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("slug_conflict");
    expect(db.tag.create).not.toHaveBeenCalled();
  });
});
