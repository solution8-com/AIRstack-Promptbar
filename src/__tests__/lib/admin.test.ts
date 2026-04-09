import { describe, it, expect, vi, beforeEach } from "vitest";
import { isUserAdmin, getAdminUserIds, getAdminUsernames, syncAdminRoleFromLegacyEnv } from "@/lib/admin";
import { db } from "@/lib/db";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe("Admin utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.S8_ADMINS;
  });

  describe("isUserAdmin", () => {
    it("should return true for user with ADMIN role", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        role: "ADMIN",
      } as never);

      const result = await isUserAdmin("user-1");
      expect(result).toBe(true);
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { role: true },
      });
    });

    it("should return false for user with USER role", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        role: "USER",
      } as never);

      const result = await isUserAdmin("user-1");
      expect(result).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const result = await isUserAdmin("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("getAdminUserIds", () => {
    it("should return IDs of all ADMIN-role users from DB", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([
        { id: "user-1" },
        { id: "user-2" },
      ] as never);

      const result = await getAdminUserIds();
      expect(result).toEqual(["user-1", "user-2"]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { role: "ADMIN" },
        select: { id: true },
      });
    });

    it("should return empty array when no admins exist", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([]);
      const result = await getAdminUserIds();
      expect(result).toEqual([]);
    });
  });

  describe("getAdminUsernames", () => {
    it("should return usernames of all ADMIN-role users from DB", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([
        { username: "le-dawg" },
        { username: "kasper-2904" },
      ] as never);

      const result = await getAdminUsernames();
      expect(result).toEqual(["le-dawg", "kasper-2904"]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { role: "ADMIN" },
        select: { username: true },
      });
    });

    it("should return empty array when no admins exist", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([]);
      const result = await getAdminUsernames();
      expect(result).toEqual([]);
    });
  });

  describe("syncAdminRoleFromLegacyEnv", () => {
    it("should be a no-op when S8_ADMINS is not set", async () => {
      await syncAdminRoleFromLegacyEnv();
      expect(db.user.updateMany).not.toHaveBeenCalled();
    });

    it("should call updateMany with correct where clause when S8_ADMINS is set", async () => {
      process.env.S8_ADMINS = '["le-dawg","kasper-2904"]';
      vi.mocked(db.user.updateMany).mockResolvedValue({ count: 2 });

      await syncAdminRoleFromLegacyEnv();

      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { in: ["le-dawg", "kasper-2904"] } },
            { githubUsername: { in: ["le-dawg", "kasper-2904"] } },
          ],
          role: "USER",
        },
        data: { role: "ADMIN" },
      });
    });

    it("should parse JSON array format correctly", async () => {
      process.env.S8_ADMINS = '["le-dawg","kasper-2904"]';
      vi.mocked(db.user.updateMany).mockResolvedValue({ count: 0 });

      await syncAdminRoleFromLegacyEnv();

      expect(db.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { username: { in: ["le-dawg", "kasper-2904"] } },
            ]),
          }),
        })
      );
    });

    it("should parse comma-separated format correctly", async () => {
      process.env.S8_ADMINS = "le-dawg,kasper-2904";
      vi.mocked(db.user.updateMany).mockResolvedValue({ count: 0 });

      await syncAdminRoleFromLegacyEnv();

      expect(db.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { username: { in: ["le-dawg", "kasper-2904"] } },
            ]),
          }),
        })
      );
    });

    it("should be a no-op when S8_ADMINS is an empty list", async () => {
      process.env.S8_ADMINS = "[]";
      await syncAdminRoleFromLegacyEnv();
      expect(db.user.updateMany).not.toHaveBeenCalled();
    });
  });
});
