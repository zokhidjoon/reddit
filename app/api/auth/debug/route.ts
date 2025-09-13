import { NextResponse } from "next/server"

export async function GET() {
  const envCheck = {
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    REDDIT_CLIENT_ID: !!process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: !!process.env.REDDIT_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json({
    message: "Environment variables check",
    variables: envCheck,
    timestamp: new Date().toISOString(),
  })
}
