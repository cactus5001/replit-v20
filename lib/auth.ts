// Authentication utilities - using Supabase in production, mock in development
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    full_name: string
  }
}

// Helper function to check if we have a configured database
export const hasConfiguredDatabase = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co'
}