/**
 * Admin utilities for checking user admin status
 *
 * The DB `role` field is the single source of truth for admin status.
 * No runtime env-var checks — use `syncAdminRoleFromLegacyEnv` once on boot
 * to migrate users from the old S8_ADMINS env var.
 */

import { db } from "@/lib/db";

/**
 * Canonical admin check. DB role field is the single source of truth.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

/**
 * Returns all user IDs with ADMIN role.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

/**
 * Returns all admin usernames. Used for leaderboard filtering, contributor search, etc.
 */
export async function getAdminUsernames(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { username: true },
  });
  return admins.map((u) => u.username);
}

/**
 * One-shot boot migration: reads S8_ADMINS env var and upgrades matching
 * users to role=ADMIN in the database. Idempotent — safe to run every boot.
 *
 * This exists solely to migrate from the old env-var-based system.
 * Once S8_ADMINS is removed from Vercel env vars, this is a no-op.
 */
export async function syncAdminRoleFromLegacyEnv(): Promise<void> {
  const adminList = process.env.S8_ADMINS;
  if (!adminList) return;

  let usernames: string[] = [];
  try {
    usernames = JSON.parse(adminList);
  } catch {
    usernames = adminList.split(",").map((u) => u.trim()).filter(Boolean);
  }

  if (usernames.length === 0) return;

  const result = await db.user.updateMany({
    where: {
      OR: [
        { username: { in: usernames } },
        { githubUsername: { in: usernames } },
      ],
      role: "USER", // Only upgrade, never downgrade
    },
    data: { role: "ADMIN" },
  });

  if (result.count > 0) {
    console.log(`[ADMIN] syncAdminRoleFromLegacyEnv: upgraded ${result.count} user(s) to role=ADMIN from S8_ADMINS env`);
  }
}
