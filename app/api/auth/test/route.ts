import { NextResponse } from "next/server"

export async function GET() {
  try {
    const requiredEnvVars = {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
      REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required environment variables: ${missingVars.join(", ")}`,
          environment: {
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || "❌ Missing",
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing",
            REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ? "✅ Set" : "❌ Missing",
            REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ? "✅ Set" : "❌ Missing",
          },
        },
        { status: 500 },
      )
    }

    // Test if we can reach NextAuth endpoints
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}`

    return NextResponse.json({
      success: true,
      message: "Environment variables are properly configured",
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || `Auto-detected: ${baseUrl}`,
        NEXTAUTH_SECRET: "✅ Set",
        REDDIT_CLIENT_ID: "✅ Set",
        REDDIT_CLIENT_SECRET: "✅ Set",
      },
      baseUrl,
    })
  } catch (error) {
    console.error("NextAuth test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        environment: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL || "❌ Missing",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing",
          REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ? "✅ Set" : "❌ Missing",
          REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ? "✅ Set" : "❌ Missing",
        },
      },
      { status: 500 },
    )
  }
}
