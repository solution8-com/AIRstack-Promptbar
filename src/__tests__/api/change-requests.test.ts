import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/prompts/[id]/changes/[changeId]/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    changeRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    promptVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const PROMPT_ID = "prompt-1";
const CHANGE_ID = "change-1";
const OWNER_ID = "owner-user";
const ADMIN_ID = "admin-user";
const OTHER_ID = "other-user";
const CONTRIBUTOR_ID = "contributor-user";

const baseParams = Promise.resolve({ id: PROMPT_ID, changeId: CHANGE_ID });

const pendingChangeRequest = {
  id: CHANGE_ID,
  promptId: PROMPT_ID,
  status: "PENDING",
  proposedContent: "New content",
  proposedTitle: "New title",
  authorId: CONTRIBUTOR_ID,
  reason: "Improved wording",
  author: { username: "contributor" },
};

describe("PATCH /api/prompts/[id]/changes/[changeId] – authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns 403 when user is neither the prompt owner nor an admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: OTHER_ID, role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: OWNER_ID,
      content: "original",
      title: "original title",
    } as never);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("returns 200 when an admin reviews a change request", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: ADMIN_ID, role: "ADMIN" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: OWNER_ID,
      content: "original",
      title: "original title",
    } as never);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue(
      pendingChangeRequest as never
    );
    vi.mocked(db.promptVersion.findFirst).mockResolvedValue({ version: 1 } as never);
    vi.mocked(db.$transaction).mockResolvedValue([] as never);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED", reviewNote: "Looks good" }),
      }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("APPROVED");
  });

  it("returns 200 when the prompt owner reviews a change request", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: OWNER_ID, role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: OWNER_ID,
      content: "original",
      title: "original title",
    } as never);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue(
      pendingChangeRequest as never
    );
    vi.mocked(db.changeRequest.update).mockResolvedValue({} as never);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", reviewNote: "Out of scope" }),
      }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("REJECTED");
  });

  it("returns 404 when the prompt does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: OWNER_ID, role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  it("returns 404 when the change request does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: OWNER_ID, role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: OWNER_ID,
      content: "original",
      title: "original title",
    } as never);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue(null);

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  it("returns 400 for invalid status value", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: OWNER_ID, role: "USER" },
    } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: OWNER_ID,
      content: "original",
      title: "original title",
    } as never);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue(
      pendingChangeRequest as never
    );

    const req = new Request(
      `http://localhost/api/prompts/${PROMPT_ID}/changes/${CHANGE_ID}`,
      { method: "PATCH", body: JSON.stringify({ status: "INVALID_STATUS" }) }
    );
    const res = await PATCH(req, { params: baseParams });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("validation_error");
  });
});
