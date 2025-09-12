import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      redditId?: string
      redditUsername?: string
    } & DefaultSession["user"]
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    redditId?: string
    redditUsername?: string
  }
}
