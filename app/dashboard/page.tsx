"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import { useSession } from "next-auth/react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardOverview } from "@/components/dashboard-overview"
import { SafetyDashboard } from "@/components/safety-dashboard"
import { TrustProgress } from "@/components/trust-progress"
import { AICommentGenerator } from "@/components/ai-comment-generator"
import { OpportunityAlerts } from "@/components/opportunity-alerts"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [redditAccount, setRedditAccount] = useState(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || status === "loading") return

    if (!session?.user) {
      redirect("/auth/signin")
    }

    if (session?.user) {
      const fetchRedditAccount = async () => {
        const { data } = await supabase.from("reddit_accounts").select("*").eq("user_id", session.user.id).single()

        setRedditAccount(data)
      }

      fetchRedditAccount()
    }
  }, [session, status, supabase, mounted])

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-600">Redix Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="trust">Trust Level</TabsTrigger>
            <TabsTrigger value="ai-comments">AI Comments</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DashboardOverview redditAccount={redditAccount} />
          </TabsContent>

          <TabsContent value="safety" className="space-y-6">
            <SafetyDashboard />
          </TabsContent>

          <TabsContent value="trust" className="space-y-6">
            <TrustProgress />
          </TabsContent>

          <TabsContent value="ai-comments" className="space-y-6">
            <AICommentGenerator />
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <OpportunityAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
