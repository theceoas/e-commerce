-- Create a robust trigger to sync Auth Metadata to Profiles
-- This ensures that when a user signs up, their profile is created with the correct data automatically

-- 1. Create the function that handles the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone,
    role
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'customer') -- Default to customer
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if it exists to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verify the trigger was created
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'on_auth_user_created';
