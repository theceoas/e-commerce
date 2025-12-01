-- Check for triggers on the profiles table
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement as trigger_definition
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'profiles'
    OR 
    event_object_table = 'users' -- Check if there's a trigger on auth.users that inserts into profiles
;

-- Also check specifically for triggers on auth.users (requires different query usually, but let's try this)
-- Triggers on auth.users are common for profile creation
SELECT 
    tgname as trigger_name
FROM 
    pg_trigger
WHERE 
    tgrelid = 'auth.users'::regclass;
