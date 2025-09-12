"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, Star, CheckCircle, Clock, Target, Gift } from "lucide-react"

interface TrustProgressData {
  currentLevel: {
    level: number
    name: string
    description: string
    benefits: {
      features: string[]
      maxActionsPerHour: number
      maxActionsPerDay: number
    }
  }
  nextLevel?: {
    level: number
    name: string
    description: string
    requirements: {
      minAccountAge: number
      minKarma: number
      minSuccessfulActions: number
      minSuccessRate: number
      maxWarnings: number
    }
  }
  progress: {
    accountAge: { current: number; required: number; met: boolean }
    karma: { current: number; required: number; met: boolean }
    successfulActions: { current: number; required: number; met: boolean }
    successRate: { current: number; required: number; met: boolean }
    warnings: { current: number; required: number; met: boolean }
  }
  overallProgress: number
  canLevelUp: boolean
  leveledUp?: boolean
  newLevel?: any
}

export function TrustProgress() {
  const [trustData, setTrustData] = useState<TrustProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLevelUp, setShowLevelUp] = useState(false)

  useEffect(() => {
    fetchTrustProgress()
  }, [])

  const fetchTrustProgress = async () => {
    try {
      const response = await fetch("/api/trust/progress")
      if (response.ok) {
        const data = await response.json()
        setTrustData(data)
        if (data.leveledUp) {
          setShowLevelUp(true)
        }
      }
    } catch (error) {
      console.error("Error fetching trust progress:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatFeatureName = (feature: string) => {
    return feature
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 0.8) return "text-green-600"
    if (progress >= 0.5) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!trustData) {
    return (
      <Alert>
        <Trophy className="h-4 w-4" />
        <AlertDescription>Unable to load trust progress. Please try again.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {showLevelUp && trustData.newLevel && (
        <Alert className="border-green-200 bg-green-50">
          <Trophy className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Congratulations!</strong> You've reached {trustData.newLevel.name} (Level {trustData.newLevel.level}
            )!
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-green-600 hover:text-green-700"
              onClick={() => setShowLevelUp(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Level */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <CardTitle>Trust Level</CardTitle>
            </div>
            <Badge variant="default" className="text-lg px-3 py-1">
              Level {trustData.currentLevel.level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">{trustData.currentLevel.name}</h3>
            <p className="text-muted-foreground">{trustData.currentLevel.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Actions per hour:</span> {trustData.currentLevel.benefits.maxActionsPerHour}
            </div>
            <div>
              <span className="font-medium">Actions per day:</span> {trustData.currentLevel.benefits.maxActionsPerDay}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Gift className="h-4 w-4 mr-1" />
              Available Features
            </h4>
            <div className="flex flex-wrap gap-2">
              {trustData.currentLevel.benefits.features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {formatFeatureName(feature)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Level */}
      {trustData.nextLevel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <CardTitle>Progress to {trustData.nextLevel.name}</CardTitle>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getProgressColor(trustData.overallProgress)}`}>
                  {Math.round(trustData.overallProgress * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={trustData.overallProgress * 100} className="h-3" />

            <div className="space-y-3">
              {Object.entries(trustData.progress).map(([key, requirement]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {requirement.met ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {key === "successRate"
                        ? `${Math.round(requirement.current * 100)}%`
                        : requirement.current.toLocaleString()}
                      {" / "}
                      {key === "successRate"
                        ? `${Math.round(requirement.required * 100)}%`
                        : key === "warnings"
                          ? `≤${requirement.required}`
                          : requirement.required.toLocaleString()}
                    </div>
                    <Badge variant={requirement.met ? "default" : "secondary"} className="text-xs">
                      {requirement.met ? "Complete" : "In Progress"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {trustData.canLevelUp && (
              <Alert className="border-green-200 bg-green-50">
                <Star className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Ready to level up!</strong> All requirements met. Your level will be updated automatically.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Max Level Reached */}
      {!trustData.nextLevel && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 text-yellow-600 mx-auto" />
              <h3 className="text-xl font-semibold text-yellow-800">Maximum Trust Level Reached!</h3>
              <p className="text-yellow-700">
                You've achieved the highest trust level and unlocked all features. Keep up the excellent work!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
