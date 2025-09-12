"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { clientAuth, type Session } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"

interface AuthContextType {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  signInWithReddit: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    clientAuth
      .getSession()
      .then(setSession)
      .finally(() => setLoading(false))

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (supabaseSession?.user) {
        const session: Session = {
          user: {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email!,
            name: supabaseSession.user.user_metadata?.name,
            image: supabaseSession.user.user_metadata?.avatar_url,
          },
        }
        setSession(session)
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signIn: clientAuth.signIn,
        signUp: clientAuth.signUp,
        signOut: clientAuth.signOut,
        signInWithReddit: clientAuth.signInWithReddit,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
