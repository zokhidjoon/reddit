import NextAuth from "next-auth";
import RedditProvider from "next-auth/providers/reddit";
import type { NextAuthOptions } from "next-auth";

const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    `[NextAuth] Missing environment variables: ${missingVars.join(", ")}`
  );
  console.error(
    `[NextAuth] Please set these in your Project Settings (Gear icon → Environment Variables)`
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    RedditProvider({
      clientId: process.env.REDDIT_CLIENT_ID || "missing",
      clientSecret: process.env.REDDIT_CLIENT_SECRET || "missing",
      authorization: {
        params: {
          scope: "identity read submit",
          duration: "permanent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      if (profile) {
        token.redditId = (profile as any).id;
        token.redditUsername = (profile as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken as string;
      }
      if (token.refreshToken) {
        (session as any).refreshToken = token.refreshToken as string;
      }
      if (token.expiresAt) {
        (session as any).expiresAt = token.expiresAt as number;
      }
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.redditId) {
        (session.user as any).redditId = token.redditId as string;
      }
      if (token.redditUsername) {
        (session.user as any).redditUsername = token.redditUsername as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret:
    process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
  logger: {
    error: (code, metadata) => {
      console.error(`[NextAuth Error] ${code}:`, metadata);
    },
    warn: (code) => {
      console.warn(`[NextAuth Warning] ${code}`);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
