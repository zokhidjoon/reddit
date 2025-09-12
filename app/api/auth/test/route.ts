import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test if we can reach NextAuth endpoints
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

    // Test the providers endpoint
    const providersResponse = await fetch(`${baseUrl}/api/auth/providers`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    if (!providersResponse.ok) {
      throw new Error(`Providers endpoint failed: ${providersResponse.status} ${providersResponse.statusText}`)
    }

    const providersData = await providersResponse.json()

    // Test the session endpoint
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    if (!sessionResponse.ok) {
      throw new Error(`Session endpoint failed: ${sessionResponse.status} ${sessionResponse.statusText}`)
    }

    const sessionData = await sessionResponse.json()

    return NextResponse.json({
      success: true,
      message: "NextAuth endpoints are working correctly",
      providers: providersData,
      session: sessionData,
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ? "✓ Set" : "✗ Missing",
        REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ? "✓ Set" : "✗ Missing",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing",
      },
    })
  } catch (error) {
    console.error("NextAuth test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        environment: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ? "✓ Set" : "✗ Missing",
          REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ? "✓ Set" : "✗ Missing",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing",
        },
      },
      { status: 500 },
    )
  }
}
