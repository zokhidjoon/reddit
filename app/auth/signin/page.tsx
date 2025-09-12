"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function SignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { session, loading, signInWithReddit } = useAuth()

  useEffect(() => {
    if (!loading && session?.user) {
      router.push("/dashboard")
    }
  }, [session, loading, router])

  const handleRedditSignIn = async () => {
    setIsLoading(true)

    try {
      const { error } = await signInWithReddit()
      if (error) {
        console.error("Sign in error:", error)
        setIsLoading(false)
      }
      // Success will be handled by the auth state change listener
    } catch (error) {
      console.error("Sign in error:", error)
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-orange-600">Redix</CardTitle>
          <CardDescription className="text-lg">
            Safely grow your Reddit reputation with AI-powered engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Reddit account to get started with automated karma building, AI-generated comments, and
              opportunity alerts.
            </p>

            <Button
              onClick={handleRedditSignIn}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
            >
              {isLoading ? "Connecting..." : "Connect with Reddit"}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground space-y-2">
            <p>
              <strong>Safe & Secure:</strong> We use Reddit's official OAuth to protect your account
            </p>
            <p>
              <strong>Privacy First:</strong> Your Reddit credentials are never stored
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
