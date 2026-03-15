import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminUsernamesFromEnv, isAdminUsername, isUserAdmin, getAdminUserIds, clearAdminUsernamesCache } from "@/lib/admin";
import { db } from "@/lib/db";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Admin utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variable
    delete process.env.ADMIN_USERNAMES;
    // Clear admin username cache
    clearAdminUsernamesCache();
  });

  describe("getAdminUsernamesFromEnv", () => {
    it("should return empty array when ADMIN_USERNAMES is not set", () => {
      const result = getAdminUsernamesFromEnv();
      expect(result).toEqual([]);
    });

    it("should parse comma-separated usernames", () => {
      process.env.ADMIN_USERNAMES = "admin1,admin2,admin3";
      const result = getAdminUsernamesFromEnv();
      expect(result).toEqual(["admin1", "admin2", "admin3"]);
    });

    it("should trim whitespace from usernames", () => {
      process.env.ADMIN_USERNAMES = " admin1 , admin2 , admin3 ";
      const result = getAdminUsernamesFromEnv();
      expect(result).toEqual(["admin1", "admin2", "admin3"]);
    });

    it("should filter out empty strings", () => {
      process.env.ADMIN_USERNAMES = "admin1,,admin2,";
      const result = getAdminUsernamesFromEnv();
      expect(result).toEqual(["admin1", "admin2"]);
    });
  });

  describe("isAdminUsername", () => {
    it("should return true for admin username", () => {
      process.env.ADMIN_USERNAMES = "admin1,admin2";
      expect(isAdminUsername("admin1")).toBe(true);
      expect(isAdminUsername("admin2")).toBe(true);
    });

    it("should return false for non-admin username", () => {
      process.env.ADMIN_USERNAMES = "admin1,admin2";
      expect(isAdminUsername("user1")).toBe(false);
    });

    it("should return false when no admins configured", () => {
      expect(isAdminUsername("admin1")).toBe(false);
    });
  });

  describe("isUserAdmin", () => {
    it("should return true for user in admin ENV list", async () => {
      process.env.ADMIN_USERNAMES = "admin1";
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        username: "admin1",
        role: "USER",
      } as any);

      const result = await isUserAdmin("user-1");
      expect(result).toBe(true);
    });

    it("should return true for user with ADMIN role", async () => {
      process.env.ADMIN_USERNAMES = "";
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        username: "someuser",
        role: "ADMIN",
      } as any);

      const result = await isUserAdmin("user-1");
      expect(result).toBe(true);
    });

    it("should return false for non-admin user", async () => {
      process.env.ADMIN_USERNAMES = "admin1";
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        username: "regularuser",
        role: "USER",
      } as any);

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
    it("should return user IDs matching ENV usernames or ADMIN role", async () => {
      process.env.ADMIN_USERNAMES = "admin1,admin2";
      vi.mocked(db.user.findMany).mockResolvedValue([
        { id: "user-1" },
        { id: "user-2" },
        { id: "user-3" },
      ] as any);

      const result = await getAdminUserIds();
      expect(result).toEqual(["user-1", "user-2", "user-3"]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { in: ["admin1", "admin2"] } },
            { role: "ADMIN" },
          ],
        },
        select: { id: true },
      });
    });

    it("should handle empty admin list", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([]);
      const result = await getAdminUserIds();
      expect(result).toEqual([]);
    });
  });
});
