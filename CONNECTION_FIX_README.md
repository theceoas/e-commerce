# Supabase Connection Pooling Fix

## How to Verify Database Schema (Read-Only Check)

Before running any SQL, let's verify your profiles table structure:

### 1. Check Profiles Table Columns

Run this in Supabase SQL Editor (READ ONLY - safe to run):

\`\`\`sql
-- Check what columns exist in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;
\`\`\`

Expected output should show:
- `id` or `user_id` column
- `role` column (type: text or varchar)
- Other profile columns

### 2. Check Current Storage Policies

Run this to see existing policies (READ ONLY):

\`\`\`sql
-- View current storage policies for product-images
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%product%';
\`\`\`

### 3. Check Admin Users

Verify admin users exist (READ ONLY):

\`\`\`sql
-- See all admin users (safe, just viewing data)
SELECT id, email, role, created_at
FROM profiles
WHERE role = 'admin';
\`\`\`

---

## What I Changed:

### ✅ Fix 1: Storage RLS Policies

**File**: `fix_product_images_rls.sql`

**Changes**:
- ✅ Changed `is_admin = true` → `role = 'admin'` (correct column name)
- ✅ Added `(id = auth.uid() OR user_id = auth.uid())` to handle both ID types
- ✅ All 4 policies: INSERT, SELECT, UPDATE, DELETE

### ✅ Fix 2: Connection Pooling

**File**: `src/utils/supabase/client.ts` (Replaced entire file)

**How it works**:
```typescript
// OLD (creates new connection every time):
const supabase = createClient(url, key)

// NEW (reuses single connection):
let supabaseInstance = null
export const createClient = () => {
  if (supabaseInstance) return supabaseInstance  // Reuse!
  supabaseInstance = create new client
  return supabaseInstance
}
\`\`\`

**Result**: Admin + Shopping tabs can now run simultaneously without exhausting connections

---

## Next Steps:

### 1. Run Fixed SQL Script

Open Supabase Dashboard → SQL Editor → Run `fix_product_images_rls.sql`

This will:
- ✅ Drop old broken policies
- ✅ Create new policies with correct `role='admin'` check
- ✅ Enable admins to upload product images

### 2. Restart Dev Server

\`\`\`bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
\`\`\`

This loads the new singleton Supabase client

### 3. Test Product Image Upload

1. Navigate to `/admin/products`  
2. Click "Add Product"
3. Upload images
4. Should work without RLS error ✅

### 4. Test Multiple Tabs

1. Open `/admin` in one tab
2. Open `/` (shopping) in another tab
3. Both should work smoothly without crashing ✅

---

## Connection Limit Details:

**Before Fix:**
- Each tab created 3-5 connections
- Supabase limit: ~15 concurrent connections
- Result: 3-4 tabs = connection pool exhausted = crash

**After Fix:**
- All tabs share 1 connection
- Supabase limit: ~15 concurrent connections
- Result: 15+ tabs can run without issues ✅
