# Redix - Reddit Reputation Builder

A Next.js application that helps users build and manage their Reddit reputation through strategic engagement and content optimization.

## Features

- Reddit OAuth authentication
- User reputation tracking
- Content optimization suggestions
- Engagement analytics
- Trust system for reliable interactions

## Environment Variables

This application requires several environment variables to function properly. Add these to your Vercel project settings or create a `.env.local` file for local development:

### Required Variables

\`\`\`env
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-nextauth-key-here

# Reddit OAuth (Get from https://www.reddit.com/prefs/apps)
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI API (Optional - for content optimization)
OPENAI_API_KEY=your-openai-api-key
\`\`\`

### Setup Instructions

#### 1. Generate NEXTAUTH_SECRET
\`\`\`bash
# Generate a secure random string
openssl rand -base64 32
\`\`\`

#### 2. Reddit OAuth Setup
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "web app" as the app type
4. Set the redirect URI to: `https://your-domain.vercel.app/api/auth/callback/reddit`
5. Copy the client ID and secret

#### 3. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Go to Settings > API to find your project URL and service role key
3. Run the SQL scripts in the `scripts/` folder to set up the database schema

#### 4. Vercel Deployment
1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables in Project Settings > Environment Variables
4. Deploy the application

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` with the required variables
4. Run the development server: `npm run dev`

### Database Schema

The application uses Supabase with the following main tables:
- `users` - User profiles and authentication
- `reddit_accounts` - Reddit account connections and tokens
- `user_reputation` - Reputation tracking and metrics
- `trust_scores` - Trust system for user interactions
- `opportunities` - Content and engagement opportunities

Run the SQL scripts in the `scripts/` folder to set up the complete schema.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js with Reddit OAuth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
