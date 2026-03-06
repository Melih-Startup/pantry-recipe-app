-- Simplified version WITHOUT foreign keys (in case foreign key causes issues)

-- Create pantry_items table
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id INTEGER
);

-- Create recipes table
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
  user_id INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all operations on pantry_items" ON public.pantry_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on recipes" ON public.recipes
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx ON public.pantry_items(user_id);
CREATE INDEX IF NOT EXISTS pantry_items_created_at_idx ON public.pantry_items(created_at);
CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON public.recipes(created_at);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_updated_at_pantry_items
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_recipes
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();








