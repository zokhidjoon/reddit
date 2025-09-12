import { createServerClient } from "@/lib/supabase/server"

export interface User {
  id: string
  email: string
  name?: string
  image?: string
  redditUsername?: string
  redditId?: string
  commentKarma?: number
  linkKarma?: number
  isVerified?: boolean
  accountCreated?: number
  avatarUrl?: string
}

export interface Session {
  user: User
  accessToken?: string
  refreshToken?: string
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) return null

    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name,
        image: session.user.user_metadata?.avatar_url,
      },
    }
  } catch (error) {
    console.error("Error getting server session:", error)
    return null
  }
}
