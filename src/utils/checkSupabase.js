// Utility to check what tables exist in Supabase
import { supabase } from '../lib/supabase'

export const checkSupabaseTables = async () => {
  const results = {
    connected: false,
    tables: [],
    errors: []
  }

  // Test connection
  try {
    // Try to query a system table or make a simple query
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1)
    
    results.connected = !error || error.code !== 'PGRST116' // PGRST116 means table doesn't exist, but connection works
  } catch (err) {
    results.errors.push(`Connection test: ${err.message}`)
  }

  // Common table names to try
  const commonTableNames = [
    'pantry_items',
    'pantry',
    'items',
    'pantryItems',
    'ingredients',
    'recipes',
    'recipe',
    'recipe_list',
    'users',
    'profiles'
  ]

  // Try each table name
  for (const tableName of commonTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (!error) {
        results.tables.push({
          name: tableName,
          exists: true,
          rowCount: data?.length || 0
        })
      } else if (error.code === 'PGRST116') {
        // Table doesn't exist - that's fine
        results.tables.push({
          name: tableName,
          exists: false
        })
      } else {
        results.tables.push({
          name: tableName,
          exists: 'unknown',
          error: error.message
        })
      }
    } catch (err) {
      results.tables.push({
        name: tableName,
        exists: 'error',
        error: err.message
      })
    }
  }

  return results
}








