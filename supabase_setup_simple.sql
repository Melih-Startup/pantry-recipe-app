-- Step 1: Create pantry_items table (run this first)
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);








