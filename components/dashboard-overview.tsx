"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Activity,
  TrendingUp,
  Shield,
  Bell,
  MessageCircle,
  ArrowUp,
  Users,
  Calendar,
  Target,
  AlertTriangle,
} from "lucide-react"

interface RedditAccount {
  reddit_username: string
  comment_karma: number
  link_karma: number
  is_verified: boolean
  created_at: string
}

interface DashboardStats {
  totalActions: number
  todayActions: number
  successRate: number
  trustLevel: number
  activeAlerts: number
  pendingOpportunities: number
  accountHealth: number
  riskLevel: string
}

export function DashboardOverview({ redditAccount }: { redditAccount: RedditAccount | null }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch various stats from different endpoints
      const [safetyResponse, trustResponse, alertsResponse, opportunitiesResponse] = await Promise.all([
        fetch("/api/safety/health").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/trust/progress").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/opportunities/alerts").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/opportunities/list?limit=5").then((r) => (r.ok ? r.json() : null)),
      ])

      const dashboardStats: DashboardStats = {
        totalActions: 0, // Will be calculated from karma tasks
        todayActions: safetyResponse?.recentActivityCount || 0,
        successRate: 0, // Will be calculated
        trustLevel: trustResponse?.currentLevel?.level || 1,
        activeAlerts: alertsResponse?.alerts?.filter((a: any) => a.isActive).length || 0,
        pendingOpportunities: opportunitiesResponse?.opportunities?.length || 0,
        accountHealth: safetyResponse?.accountHealth?.score || 0,
        riskLevel: safetyResponse?.accountHealth?.riskLevel || "low",
      }

      setStats(dashboardStats)
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-orange-600"
      case "critical":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return <Shield className="h-5 w-5 text-green-600" />
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "high":
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reddit Account Status */}
      {redditAccount ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Reddit Account
                </CardTitle>
                <CardDescription>Your connected Reddit profile</CardDescription>
              </div>
              <Badge variant={redditAccount.is_verified ? "default" : "secondary"}>
                {redditAccount.is_verified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Username</p>
                <p className="text-lg font-semibold">u/{redditAccount.reddit_username}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comment Karma</p>
                <p className="text-lg font-semibold">{redditAccount.comment_karma?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Link Karma</p>
                <p className="text-lg font-semibold">{redditAccount.link_karma?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Age</p>
                <p className="text-lg font-semibold">
                  {Math.floor((Date.now() - new Date(redditAccount.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No Reddit account connected. Please connect your Reddit account to start using Redix.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Health</CardTitle>
              {getRiskIcon(stats.riskLevel)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accountHealth}/100</div>
              <div className="flex items-center space-x-2 mt-2">
                <Progress value={stats.accountHealth} className="flex-1" />
                <Badge variant={stats.riskLevel === "low" ? "default" : "destructive"} className="text-xs">
                  {stats.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trust Level</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level {stats.trustLevel}</div>
              <p className="text-xs text-muted-foreground">
                {stats.trustLevel === 1 && "Newcomer"}
                {stats.trustLevel === 2 && "Trusted User"}
                {stats.trustLevel === 3 && "Veteran"}
                {stats.trustLevel === 4 && "Expert"}
                {stats.trustLevel === 5 && "Elite"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayActions}</div>
              <p className="text-xs text-muted-foreground">Actions performed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOpportunities}</div>
              <p className="text-xs text-muted-foreground">Pending engagement opportunities</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <MessageCircle className="h-6 w-6" />
              <span>Generate Comment</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Bell className="h-6 w-6" />
              <span>Create Alert</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <ArrowUp className="h-6 w-6" />
              <span>Find Posts to Upvote</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Shield className="h-6 w-6" />
              <span>Safety Check</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Getting Started Guide
          </CardTitle>
          <CardDescription>Follow these steps to safely grow your Reddit reputation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Build Trust Gradually</h3>
                <p className="text-sm text-muted-foreground">
                  Start with manual engagement to establish natural patterns and avoid detection
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Set Up Keyword Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Configure opportunity alerts to find relevant posts in your niche
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Use AI-Generated Comments</h3>
                <p className="text-sm text-muted-foreground">
                  Generate natural, contextual comments that match your writing style
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Monitor Safety Metrics</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of your account health and adjust activity based on safety recommendations
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold">
                5
              </div>
              <div>
                <h3 className="font-semibold">Scale Automation</h3>
                <p className="text-sm text-muted-foreground">
                  Gradually increase automation as your trust level grows and safety metrics improve
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
