"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface CommentOption {
  text: string
  analysis: {
    isAppropriate: boolean
    riskLevel: "low" | "medium" | "high"
    suggestions?: string[]
    flaggedTerms?: string[]
  }
}

export function AICommentGenerator() {
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [subreddit, setSubreddit] = useState("")
  const [tone, setTone] = useState("casual")
  const [comments, setComments] = useState<CommentOption[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedComment, setSelectedComment] = useState<string | null>(null)

  const generateComments = async () => {
    if (!postTitle || !subreddit) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postTitle,
          postContent,
          subreddit,
          tone,
          generateMultiple: true,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate comments")

      const data = await response.json()
      setComments(data.comments)
    } catch (error) {
      console.error("Error generating comments:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "high":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Comment Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postTitle">Post Title</Label>
              <Input
                id="postTitle"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Enter the Reddit post title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subreddit">Subreddit</Label>
              <Input
                id="subreddit"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                placeholder="e.g., technology, askreddit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postContent">Post Content (Optional)</Label>
            <Textarea
              id="postContent"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Paste the post content for better context..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Comment Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generateComments} disabled={!postTitle || !subreddit || isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Comments...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Comments
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {comments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Comments</h3>
          {comments.map((comment, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getRiskIcon(comment.analysis.riskLevel)}
                    <Badge variant={comment.analysis.isAppropriate ? "default" : "destructive"}>
                      {comment.analysis.isAppropriate ? "Safe" : "Risky"}
                    </Badge>
                    <span className={`text-sm font-medium ${getRiskColor(comment.analysis.riskLevel)}`}>
                      {comment.analysis.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  <Button
                    variant={selectedComment === comment.text ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedComment(selectedComment === comment.text ? null : comment.text)}
                  >
                    {selectedComment === comment.text ? "Selected" : "Select"}
                  </Button>
                </div>

                <div className="bg-gray-50 p-3 rounded-md mb-3">
                  <p className="text-sm">{comment.text}</p>
                </div>

                {comment.analysis.suggestions && comment.analysis.suggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Suggestions:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {comment.analysis.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {comment.analysis.flaggedTerms && comment.analysis.flaggedTerms.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700">Flagged Terms:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comment.analysis.flaggedTerms.map((term, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedComment && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <h4 className="font-medium text-green-800 mb-2">Selected Comment:</h4>
            <p className="text-sm text-green-700">{selectedComment}</p>
            <Button className="mt-3" size="sm">
              Use This Comment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
