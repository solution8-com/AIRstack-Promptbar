import GitHub from "next-auth/providers/github";
import type { AuthPlugin } from "../types";

export const githubPlugin: AuthPlugin = {
  id: "github",
  name: "GitHub",
  getProvider: () =>
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user read:org user:email",
        },
      },
      profile(profile) {
        const normalizedEmail =
          profile.email ||
          (profile.login ? `${profile.login}@users.noreply.github.com` : null);

        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: normalizedEmail,
          image: profile.avatar_url,
          username: profile.login, // GitHub username (used as display username)
          githubUsername: profile.login, // Immutable GitHub username for contributor attribution
        };
      },
    }),
};
