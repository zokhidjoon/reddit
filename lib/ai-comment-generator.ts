import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createServerClient } from "@/lib/supabase/server"

export interface CommentGenerationOptions {
  postTitle: string
  postContent: string
  subreddit: string
  userStyle?: string
  tone?: "casual" | "professional" | "enthusiastic" | "analytical"
  maxLength?: number
}

export interface CommentAnalysis {
  isAppropriate: boolean
  riskLevel: "low" | "medium" | "high"
  suggestions?: string[]
  flaggedTerms?: string[]
}

export class AICommentGenerator {
  private model = openai("gpt-4o-mini")

  async generateComment(options: CommentGenerationOptions): Promise<string> {
    const { postTitle, postContent, subreddit, userStyle = "", tone = "casual", maxLength = 200 } = options

    const prompt = this.buildCommentPrompt(postTitle, postContent, subreddit, userStyle, tone, maxLength)

    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
        maxTokens: Math.floor(maxLength * 1.5), // Rough token estimation
      })

      return text.trim()
    } catch (error) {
      console.error("Error generating comment:", error)
      throw new Error("Failed to generate comment")
    }
  }

  async analyzeComment(comment: string, subreddit: string): Promise<CommentAnalysis> {
    const prompt = `
Analyze this Reddit comment for safety and appropriateness:

Comment: "${comment}"
Subreddit: r/${subreddit}

Evaluate:
1. Does it sound natural and human-like?
2. Is it appropriate for the subreddit?
3. Does it avoid spam/bot-like language?
4. Risk level for account safety

Respond in JSON format:
{
  "isAppropriate": boolean,
  "riskLevel": "low" | "medium" | "high",
  "suggestions": ["suggestion1", "suggestion2"],
  "flaggedTerms": ["term1", "term2"]
}
`

    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("Error analyzing comment:", error)
      return {
        isAppropriate: false,
        riskLevel: "high",
        suggestions: ["Failed to analyze - manual review required"],
        flaggedTerms: [],
      }
    }
  }

  async analyzeUserStyle(userId: string): Promise<string> {
    const supabase = createServerClient()

    // Get user's recent comments for style analysis
    const { data: recentComments } = await supabase
      .from("karma_tasks")
      .select("task_data")
      .eq("user_id", userId)
      .eq("task_type", "comment")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10)

    if (!recentComments || recentComments.length === 0) {
      return "No previous comment style available"
    }

    const comments = recentComments
      .map((task) => task.task_data?.comment_text)
      .filter(Boolean)
      .join("\n\n")

    const prompt = `
Analyze these Reddit comments to identify the user's writing style:

${comments}

Identify:
1. Tone and personality
2. Common phrases or expressions
3. Sentence structure preferences
4. Level of formality
5. Typical comment length

Provide a concise style guide (2-3 sentences) for generating similar comments.
`

    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
      })

      return text.trim()
    } catch (error) {
      console.error("Error analyzing user style:", error)
      return "Casual, friendly tone with natural conversational style"
    }
  }

  private buildCommentPrompt(
    postTitle: string,
    postContent: string,
    subreddit: string,
    userStyle: string,
    tone: string,
    maxLength: number,
  ): string {
    return `
You are helping generate a natural, engaging Reddit comment. 

POST CONTEXT:
Title: ${postTitle}
Content: ${postContent.substring(0, 500)}${postContent.length > 500 ? "..." : ""}
Subreddit: r/${subreddit}

STYLE REQUIREMENTS:
- Tone: ${tone}
- Max length: ${maxLength} characters
- User style: ${userStyle || "Natural, conversational"}

SAFETY RULES:
- Sound completely human and natural
- Be genuinely helpful or engaging
- Avoid generic phrases like "Great post!" or "Thanks for sharing!"
- Don't mention upvoting, karma, or Reddit mechanics
- Match the subreddit's culture and expectations
- Add value to the conversation

Generate a single, natural comment that feels authentic and adds value to the discussion. Do not include quotes or formatting - just the raw comment text.
`
  }

  async generateMultipleOptions(options: CommentGenerationOptions, count = 3): Promise<string[]> {
    const comments: string[] = []

    for (let i = 0; i < count; i++) {
      try {
        const comment = await this.generateComment(options)
        comments.push(comment)

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error generating comment ${i + 1}:`, error)
      }
    }

    return comments
  }
}

export const aiCommentGenerator = new AICommentGenerator()
