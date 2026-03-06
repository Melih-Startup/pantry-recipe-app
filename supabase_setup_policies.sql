-- Step 3: Enable Row Level Security (run after tables are created)
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies to allow all operations
CREATE POLICY "Allow all operations on pantry_items" ON public.pantry_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on recipes" ON public.recipes
  FOR ALL USING (true) WITH CHECK (true);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx ON public.pantry_items(user_id);
CREATE INDEX IF NOT EXISTS pantry_items_created_at_idx ON public.pantry_items(created_at);
CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON public.recipes(created_at);

-- Step 6: Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create triggers to auto-update updated_at
CREATE TRIGGER set_updated_at_pantry_items
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_recipes
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();








