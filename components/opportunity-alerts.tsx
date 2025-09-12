"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bell, Plus, Search, ExternalLink, MessageCircle, ArrowUp, Clock, Target, Loader2 } from "lucide-react"

interface OpportunityAlert {
  id: string
  name: string
  keywords: string[]
  subreddits: string[]
  minUpvotes?: number
  maxAge?: number
  excludeKeywords?: string[]
  isActive: boolean
  alertType: string
  notificationMethod: string
  createdAt: string
  lastTriggered?: string
}

interface Opportunity {
  id: string
  postTitle: string
  postUrl: string
  subreddit: string
  upvotes: number
  comments: number
  age: number
  matchedKeywords: string[]
  score: number
  actionSuggestion: string
  createdAt: string
}

export function OpportunityAlerts() {
  const [alerts, setAlerts] = useState<OpportunityAlert[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    keywords: "",
    subreddits: "",
    minUpvotes: "",
    maxAge: "",
    excludeKeywords: "",
    alertType: "keyword",
    notificationMethod: "dashboard",
  })

  useEffect(() => {
    fetchAlerts()
    fetchOpportunities()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/opportunities/alerts")
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }
  }

  const fetchOpportunities = async () => {
    try {
      const response = await fetch("/api/opportunities/list")
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities)
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoading(false)
    }
  }

  const scanForOpportunities = async () => {
    setScanning(true)
    try {
      const response = await fetch("/api/opportunities/scan", { method: "POST" })
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities)
      }
    } catch (error) {
      console.error("Error scanning opportunities:", error)
    } finally {
      setScanning(false)
    }
  }

  const createAlert = async () => {
    try {
      const response = await fetch("/api/opportunities/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          keywords: formData.keywords.split(",").map((k) => k.trim()),
          subreddits: formData.subreddits.split(",").map((s) => s.trim()),
          minUpvotes: formData.minUpvotes ? Number.parseInt(formData.minUpvotes) : undefined,
          maxAge: formData.maxAge ? Number.parseInt(formData.maxAge) : undefined,
          excludeKeywords: formData.excludeKeywords
            ? formData.excludeKeywords.split(",").map((k) => k.trim())
            : undefined,
          alertType: formData.alertType,
          notificationMethod: formData.notificationMethod,
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({
          name: "",
          keywords: "",
          subreddits: "",
          minUpvotes: "",
          maxAge: "",
          excludeKeywords: "",
          alertType: "keyword",
          notificationMethod: "dashboard",
        })
        fetchAlerts()
      }
    } catch (error) {
      console.error("Error creating alert:", error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "upvote":
        return <ArrowUp className="h-4 w-4" />
      case "comment":
        return <MessageCircle className="h-4 w-4" />
      case "both":
        return <Target className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Opportunity Alerts</h2>
          <p className="text-muted-foreground">Monitor Reddit for engagement opportunities</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={scanForOpportunities} disabled={scanning} variant="outline">
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan Now
              </>
            )}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Opportunity Alert</DialogTitle>
                <DialogDescription>Set up monitoring for specific keywords and subreddits</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tech Discussions"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="e.g., javascript, react, programming"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subreddits">Subreddits (comma-separated)</Label>
                  <Textarea
                    id="subreddits"
                    value={formData.subreddits}
                    onChange={(e) => setFormData({ ...formData, subreddits: e.target.value })}
                    placeholder="e.g., programming, javascript, webdev"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minUpvotes">Min Upvotes</Label>
                    <Input
                      id="minUpvotes"
                      type="number"
                      value={formData.minUpvotes}
                      onChange={(e) => setFormData({ ...formData, minUpvotes: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAge">Max Age (hours)</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      value={formData.maxAge}
                      onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                      placeholder="24"
                    />
                  </div>
                </div>
                <Button onClick={createAlert} className="w-full">
                  Create Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="alerts">My Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          {opportunities.length === 0 ? (
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                No opportunities found. Create some alerts and scan for opportunities to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{opportunity.postTitle}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>r/{opportunity.subreddit}</span>
                          <span className="flex items-center">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            {opportunity.upvotes}
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {opportunity.comments}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.round(opportunity.age)}h ago
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(opportunity.score)}`}>
                            {opportunity.score}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center">
                          {getActionIcon(opportunity.actionSuggestion)}
                          <span className="ml-1 capitalize">{opportunity.actionSuggestion}</span>
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.matchedKeywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={opportunity.postUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Post
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                No alerts created yet. Create your first alert to start monitoring opportunities.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{alert.name}</CardTitle>
                      <Badge variant={alert.isActive ? "default" : "secondary"}>
                        {alert.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {alert.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Subreddits</h4>
                      <div className="flex flex-wrap gap-1">
                        {alert.subreddits.map((subreddit) => (
                          <Badge key={subreddit} variant="secondary" className="text-xs">
                            r/{subreddit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {alert.minUpvotes && (
                        <div>
                          <span className="font-medium">Min Upvotes:</span> {alert.minUpvotes}
                        </div>
                      )}
                      {alert.maxAge && (
                        <div>
                          <span className="font-medium">Max Age:</span> {alert.maxAge}h
                        </div>
                      )}
                    </div>
                    {alert.lastTriggered && (
                      <div className="text-sm text-muted-foreground">
                        Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
