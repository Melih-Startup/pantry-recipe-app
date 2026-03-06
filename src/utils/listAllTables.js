// Try to list all tables using Supabase REST API directly
import { supabase } from '../lib/supabase'

export const listAllTables = async () => {
  try {
    // Try to query information_schema to get table names
    // Note: This might not work due to RLS, but worth trying
    const { data, error } = await supabase.rpc('get_table_names')
    
    if (!error && data) {
      return data
    }
  } catch (e) {
    console.log('RPC method not available')
  }

  // Alternative: Try common table patterns
  const possibleTables = [
    'pantry',
    'pantry_items', 
    'pantryitems',
    'items',
    'ingredients',
    'recipes',
    'recipe',
    'recipe_list',
    'recipelist',
    'food_items',
    'grocery',
    'grocery_list',
    'shopping_list',
    'meal_plan',
    'meal_plans'
  ]

  const foundTables = []
  
  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0) // Just check if table exists
      
      if (!error) {
        foundTables.push(tableName)
      }
    } catch (e) {
      // Table doesn't exist or access denied
    }
  }

  return foundTables
}








