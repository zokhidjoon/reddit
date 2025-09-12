"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react"

interface SafetyData {
  accountHealth: {
    score: number
    riskLevel: string
    factors: {
      accountAge: number
      karmaRatio: number
      activityPattern: number
      recentWarnings: number
      successRate: number
    }
    recommendations: string[]
  }
  safetyLimits: {
    maxActionsPerHour: number
    maxActionsPerDay: number
    maxCommentsPerHour: number
    maxUpvotesPerHour: number
    minActionInterval: number
  }
  pauseStatus: {
    paused: boolean
    reason?: string
    resumeAt?: string
  }
  recentActivityCount: number
}

export function SafetyDashboard() {
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSafetyData()
  }, [])

  const fetchSafetyData = async () => {
    try {
      const response = await fetch("/api/safety/health")
      if (response.ok) {
        const data = await response.json()
        setSafetyData(data)
      }
    } catch (error) {
      console.error("Error fetching safety data:", error)
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
        return <CheckCircle className="h-5 w-5 text-green-600" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  if (!safetyData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Unable to load safety data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {safetyData.pauseStatus.paused && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Activity Paused:</strong> {safetyData.pauseStatus.reason}
            {safetyData.pauseStatus.resumeAt && (
              <span className="block mt-1">
                Resumes at: {new Date(safetyData.pauseStatus.resumeAt).toLocaleString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Account Health Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Health</CardTitle>
            {getRiskIcon(safetyData.accountHealth.riskLevel)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyData.accountHealth.score}/100</div>
            <div className="flex items-center space-x-2 mt-2">
              <Progress value={safetyData.accountHealth.score} className="flex-1" />
              <Badge variant={safetyData.accountHealth.riskLevel === "low" ? "default" : "destructive"}>
                {safetyData.accountHealth.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyData.recentActivityCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Limit: {safetyData.safetyLimits.maxActionsPerDay} actions/day
            </div>
            <Progress
              value={(safetyData.recentActivityCount / safetyData.safetyLimits.maxActionsPerDay) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Action Interval */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Min Action Interval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(safetyData.safetyLimits.minActionInterval / 60)}m</div>
            <div className="text-xs text-muted-foreground mt-1">Between actions</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Health Factors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(safetyData.accountHealth.factors).map(([factor, value]) => (
            <div key={factor} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{factor.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                <span>{Math.round(value * 100)}%</span>
              </div>
              <Progress value={value * 100} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Safety Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Current Safety Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Actions per hour:</span> {safetyData.safetyLimits.maxActionsPerHour}
            </div>
            <div>
              <span className="font-medium">Actions per day:</span> {safetyData.safetyLimits.maxActionsPerDay}
            </div>
            <div>
              <span className="font-medium">Comments per hour:</span> {safetyData.safetyLimits.maxCommentsPerHour}
            </div>
            <div>
              <span className="font-medium">Upvotes per hour:</span> {safetyData.safetyLimits.maxUpvotesPerHour}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {safetyData.accountHealth.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Safety Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {safetyData.accountHealth.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
