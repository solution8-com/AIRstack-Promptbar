/**
 * Admin utilities for checking user admin status
 * 
 * Admins can be defined in two ways:
 * 1. Via ADMIN_USERNAMES environment variable (comma-separated list)
 * 2. Via UserRole.ADMIN in database (for future flexibility)
 */

import { db } from "@/lib/db";

// Cache admin usernames at module level to avoid repeated parsing
let cachedAdminUsernames: string[] | null = null;

/**
 * Clear the cached admin usernames (useful for testing)
 */
export function clearAdminUsernamesCache(): void {
  cachedAdminUsernames = null;
}

/**
 * Get list of admin usernames from environment variable
 */
export function getAdminUsernamesFromEnv(): string[] {
  // Return cached value if available
  if (cachedAdminUsernames !== null) {
    return cachedAdminUsernames;
  }

  const adminUsernames = process.env.ADMIN_USERNAMES;
  if (!adminUsernames) {
    cachedAdminUsernames = [];
    return cachedAdminUsernames;
  }
  
  cachedAdminUsernames = adminUsernames
    .split(",")
    .map(username => username.trim())
    .filter(username => username.length > 0);
  
  return cachedAdminUsernames;
}

/**
 * Check if a username is in the admin list (from ENV var)
 */
export function isAdminUsername(username: string): boolean {
  const adminUsernames = getAdminUsernamesFromEnv();
  return adminUsernames.includes(username);
}

/**
 * Check if a user is an admin by their ID
 * Checks both ENV var (by username) and database role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true },
  });

  if (!user) return false;

  // Check ENV var first
  if (isAdminUsername(user.username)) return true;

  // Fallback to database role
  return user.role === "ADMIN";
}

/**
 * Get all admin user IDs (from both ENV var and database)
 */
export async function getAdminUserIds(): Promise<string[]> {
  const adminUsernames = getAdminUsernamesFromEnv();
  
  // Get users that match either ENV var usernames OR have ADMIN role
  const adminUsers = await db.user.findMany({
    where: {
      OR: [
        { username: { in: adminUsernames } },
        { role: "ADMIN" },
      ],
    },
    select: { id: true },
  });

  return adminUsers.map(user => user.id);
}
