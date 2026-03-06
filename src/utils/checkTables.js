// Helper to check what tables exist in Supabase
// This can help identify your table structure even without the anon key initially

export const checkSupabaseConnection = async (supabaseUrl) => {
  if (!supabaseUrl) {
    return { error: 'No Supabase URL provided' }
  }

  // Try to fetch table information
  // Note: This might require the anon key, but we can at least test the connection
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': 'temp', // This won't work but will show us the error
      }
    })
    return { url: supabaseUrl, status: response.status }
  } catch (error) {
    return { error: error.message, url: supabaseUrl }
  }
}








