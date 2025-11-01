import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Check for placeholder values
  if (!url || !key || url.includes('your-supabase-url') || key.includes('your-supabase-key')) {
    console.error("[v0] Supabase config error:", {
      url: url ? (url.includes('your-supabase-url') ? 'PLACEHOLDER_VALUE' : 'SET') : 'MISSING',
      key: key ? (key.includes('your-supabase-key') ? 'PLACEHOLDER_VALUE' : 'SET') : 'MISSING',
    })
    throw new Error(
      'Supabase environment variables are missing or contain placeholder values. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables.'
    )
  }
  
  return createBrowserClient(url, key)
}
