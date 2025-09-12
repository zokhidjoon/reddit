import { createClient } from "@/lib/supabase/client"

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

export const clientAuth = {
  async signIn(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  async signUp(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  async signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getSession(): Promise<Session | null> {
    const supabase = createClient()
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
  },

  async signInWithReddit() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "reddit",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "identity read submit",
      },
    })
    return { data, error }
  },
}
