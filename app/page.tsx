export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Redix</h1>
          <p className="text-gray-600">Build your Reddit reputation with AI-powered insights</p>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">🚀 Get Started</h3>
            <p className="text-sm text-orange-700">
              Connect your Reddit account to start building your reputation with AI-powered content suggestions.
            </p>
          </div>

          <a
            href="/auth/signin"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-block"
          >
            Connect Reddit Account
          </a>

          <div className="text-xs text-gray-500 mt-4">
            <p>✓ Secure OAuth authentication</p>
            <p>✓ AI-powered content analysis</p>
            <p>✓ Reputation tracking & insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}
