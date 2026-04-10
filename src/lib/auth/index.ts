import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { initializePlugins, getAuthPlugin } from "@/lib/plugins";
import { syncAdminRoleFromLegacyEnv } from "@/lib/admin";
import type { Adapter, AdapterUser } from "next-auth/adapters";

// Initialize plugins before use
initializePlugins();

// Generate a unique username from email or name
async function generateUsername(email: string | null | undefined, name?: string | null): Promise<string> {
  // Try to use the part before @ in email
  let baseUsername = email ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") : "";
  
  // If too short, use name
  if (baseUsername.length < 3 && name) {
    baseUsername = name.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
  }
  
  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = "user";
  }
  
  // Check if username exists and append number if needed
  let username = baseUsername;
  let counter = 1;
  while (await db.user.findUnique({ where: { username } })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
}

// Custom adapter that wraps PrismaAdapter to add username
function CustomPrismaAdapter(): Adapter {
  const prismaAdapter = PrismaAdapter(db);
  
  return {
    ...prismaAdapter,
    async createUser(data: AdapterUser & { username?: string; githubUsername?: string }) {
      // Use GitHub username if provided, otherwise generate one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let username = (data as any).username;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const githubUsername = (data as any).githubUsername; // Immutable GitHub username
      
      if (!username) {
        username = await generateUsername(data.email, data.name);
      } else {
        username = username.toLowerCase();
        
        // Check if there's an unclaimed account with this username
        const unclaimedEmail = `${username}@unclaimed.prompts.chat`;
        const unclaimedUser = await db.user.findUnique({
          where: { email: unclaimedEmail },
        });
        
        if (unclaimedUser) {
          // Claim this account - update with real user info
          const claimedUser = await db.user.update({
            where: { id: unclaimedUser.id },
            data: {
              name: data.name,
              email: data.email,
              avatar: data.image,
              emailVerified: data.emailVerified,
              githubUsername: githubUsername || undefined, // Store immutable GitHub username
            },
          });
          
          return {
            ...claimedUser,
            image: claimedUser.avatar,
          } as AdapterUser;
        }
        
        // Ensure GitHub username is unique, append number if taken
        const baseUsername = username;
        let finalUsername = baseUsername;
        let counter = 1;
        while (await db.user.findUnique({ where: { username: finalUsername } })) {
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }
        username = finalUsername;
      }
      
      const user = await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          avatar: data.image,
          emailVerified: data.emailVerified,
          username,
          githubUsername: githubUsername || undefined, // Store immutable GitHub username
        },
      });
      
      return {
        ...user,
        image: user.avatar,
      } as AdapterUser;
    },
  };
}

// Helper to get providers from config (supports both old `provider` and new `providers` array)
function getConfiguredProviders(config: Awaited<ReturnType<typeof getConfig>>): string[] {
  // Support new `providers` array
  if (config.auth.providers && config.auth.providers.length > 0) {
    return config.auth.providers;
  }
  // Backward compatibility with old `provider` string
  if (config.auth.provider) {
    return [config.auth.provider];
  }
  // Default to credentials
  return ["credentials"];
}

const REQUIRED_ORG = process.env.S8_REQUIRED_ORG || "solution8-com";
const ENFORCE_GITHUB_ORG = process.env.S8_ENFORCE_GITHUB_ORG !== "false";

async function getGithubOrgMembership(accessToken?: string | null): Promise<"member" | "not_member" | "error"> {
  if (!accessToken) {
    return "error";
  }

  try {
    const res = await fetch(`https://api.github.com/user/memberships/orgs/${REQUIRED_ORG}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (res.status === 404) {
      console.log(`[AUTH] SIGNIN_DENIED`, JSON.stringify({
        reason: "NOT_ORG_MEMBER",
        org: REQUIRED_ORG,
      }));
      return "not_member";
    }

    if (!res.ok) {
      const bodyText = await res.text();
      console.error(`[AUTH] SIGNIN_ORG_CHECK_ERROR`, JSON.stringify({
        reason: "UNEXPECTED_GITHUB_STATUS",
        org: REQUIRED_ORG,
        githubStatus: res.status,
        githubStatusText: res.statusText,
        githubBody: bodyText.slice(0, 200),
      }));
      return "error";
    }

    const membership = await res.json() as { state?: string };
    const state = membership.state ?? "unknown";

    if (state === "active" || state === "pending") {
      console.log(`[AUTH] SIGNIN_ORG_OK`, JSON.stringify({ org: REQUIRED_ORG, state }));
      return "member";
    }

    console.log(`[AUTH] SIGNIN_DENIED`, JSON.stringify({
      reason: "INVALID_MEMBERSHIP_STATE",
      org: REQUIRED_ORG,
      state,
    }));
    return "not_member";
  } catch (error) {
    console.error(`[AUTH] SIGNIN_ORG_CHECK_ERROR`, JSON.stringify({
      reason: "GITHUB_API_EXCEPTION",
      org: REQUIRED_ORG,
      error: String(error),
    }));
    return "error";
  }
}

// Build auth config dynamically based on prompts.config.ts
async function buildAuthConfig() {
  // One-shot migration: ensure S8_ADMINS users have role=ADMIN in DB
  await syncAdminRoleFromLegacyEnv();

  const config = await getConfig();
  const providerIds = getConfiguredProviders(config);
  
  const authProviders = providerIds
    .map((id) => {
      const plugin = getAuthPlugin(id);
      if (!plugin) {
        console.warn(`Auth plugin "${id}" not found, skipping`);
        return null;
      }
      return plugin.getProvider();
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (authProviders.length === 0) {
    throw new Error(`No valid auth plugins found. Configured: ${providerIds.join(", ")}`);
  }

  const isVercelDeployment = process.env.VERCEL === "1";
  const trustHost = isVercelDeployment || !process.env.AUTH_URL;

  return {
    adapter: CustomPrismaAdapter(),
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    providers: authProviders,
    trustHost,
    session: {
      strategy: "jwt" as const,
    },
    pages: {
      signIn: "/login",
      signUp: "/register",
      error: "/unauthorized",
    },
    callbacks: {
      async signIn({ account, profile }): Promise<boolean> {
        if (account?.provider !== "github") {
          return true;
        }

        const githubUsername = (profile as { login?: string })?.login;
        const accessToken = account.access_token as string | undefined;

        if (!ENFORCE_GITHUB_ORG) {
          console.log(`[AUTH] SIGNIN_ORG_SKIPPED`, JSON.stringify({ reason: "ENFORCE_GITHUB_ORG=false", username: githubUsername }));
          return true;
        }

        const membership = await getGithubOrgMembership(accessToken);

        if (membership === "member") {
          return true;
        }

        console.log(`[AUTH] SIGNIN_DENIED`, JSON.stringify({
          reason: membership === "not_member" ? "NOT_ORG_MEMBER" : "ORG_CHECK_ERROR",
          org: REQUIRED_ORG,
          username: githubUsername,
        }));
        return "/unauthorized";
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async jwt({ token, user, account, trigger }: { token: any; user?: any; account?: any; trigger?: string }) {
        const isVerifiedGithubOrgMember =
          account?.provider === "github" && ENFORCE_GITHUB_ORG ? true : Boolean(token.orgMember);

        // On sign in, look up the actual database user by email to ensure correct ID
        if (user && user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true, username: true, locale: true, name: true, avatar: true, githubUsername: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.username = dbUser.username;
            token.locale = dbUser.locale;
            token.name = dbUser.name;
            token.picture = dbUser.avatar;
            token.orgMember = isVerifiedGithubOrgMember;
            token.org = REQUIRED_ORG;
          }
        }

        // On subsequent requests, verify user exists and refresh data
        if (token.id && !user) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, username: true, locale: true, name: true, avatar: true, githubUsername: true },
          });

          // User no longer exists - invalidate token
          if (!dbUser) {
            console.log(`[AUTH] JWT_TOKEN_INVALIDATED`, JSON.stringify({
              reason: "USER_NOT_IN_DB",
              tokenUserId: token.id,
              tokenUsername: token.username ?? null,
            }));
            return null;
          }

          // Always refresh role so DB role changes take effect immediately
          token.role = dbUser.role;
          // Update remaining token fields on explicit update or if data missing
          if (trigger === "update" || !token.username) {
            token.username = dbUser.username;
            token.locale = dbUser.locale;
            token.name = dbUser.name;
            token.picture = dbUser.avatar;
          }

          token.orgMember = Boolean(token.orgMember);
          token.org = REQUIRED_ORG;
        }

        return token;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async session({ session, token }: { session: any; token: any }) {
        // If token is null/invalid, return empty session
        if (!token) {
          return { ...session, user: undefined };
        }
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.username = token.username as string;
          session.user.locale = token.locale as string;
          session.user.name = token.name ?? null;
          session.user.image = token.picture ?? null;
          session.user.orgMember = Boolean(token.orgMember);
          session.user.org = token.org as string;
        }
        return session;
      },
    },
  };
}

// Export auth handlers
const authConfig = await buildAuthConfig();

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      username: string;
      locale: string;
      orgMember: boolean;
      org: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    username: string;
    locale: string;
    name?: string | null;
    picture?: string | null;
    orgMember?: boolean;
    org?: string;
  }
}
