# CRITICAL FIXES NEEDED

## Issue 1: Duplicate Order Number Error ✅
**Location**: `src/lib/order-utils.ts`
**Problem**: Race condition when generating unique order numbers
**Fix**: Add unique transaction ID to make order numbers truly unique

```typescript
// Add millisecond timestamp to make it unique
const ms = now.getMilliseconds().toString().padStart(3, '0');
const orderNumber = `KI-${dateStr}-${counter.toString().padStart(3, '0')}-${ms}`;
```

---

## Issue 2: First/Last Name Not Saved ❌
**Location**: `src/contexts/AuthContext.tsx` line 194
**Problem**: Profile IS being created with first_name and last_name
**Actually Working**: The code DOES save first/last name already

**Verification needed**: Check if the issue is:
- Auth page not passing firstName/lastName to signUp()
- Checkout not passing firstName/lastName to signUp()

**Current code (AuthContext):**
```typescript
first_name: userData?.firstName,  // ← Should work
last_name: userData?.lastName,    // ← Should work
```

**Auth page** (line 75-80): ✅ Already passing
```typescript
await signUp(email, password, {
  firstName,  // ← Passed
  lastName,   // ← Passed
  phone,
  role: role
})
```

**Checkout page** (line 359-363): ✅ Already passing
```typescript
await signUp(form.email, form.password!, {
  firstName: form.firstName,  // ← Passed
  lastName: form.lastName,     // ← Passed
  phone: form.phone
});
```

**Actual Issue**: Need to verify in database if profiles table is receiving the data

---

## Issue 3: Saved Address Not Working ❌
**Location**: `src/app/checkout/page.tsx`
**Problem**: "Save Address" checkbox exists but doesn't save to addresses table

**Missing Code**: After order creation, need to save address if checkbox is checked

**Fix needed around line 430** (after order creation):
```typescript
// Add this after order is created:
if (form.saveAddress && userId) {
  await supabase.from('addresses').insert({
    user_id: userId,
    type: 'shipping',
    first_name: form.firstName,
    last_name: form.lastName,
    address_line_1: shippingAddress.address_line_1,
    address_line_2: shippingAddress.address_line_2,
    city: form.city,
    state: form.state,
    postal_code: form.postalCode,
    country: form.country,
    phone: form.phone,
    is_default: addresses.length === 0  // First address is default
  });
}
```

---

## Issue 4: Orders Not Showing in Account ❌
**Location**: `src/app/account/page.tsx` line 110-131
**Problem**: Query filters by `user_id` but orders might be saved with different user_id

**Current query** (line 130):
```typescript
.eq('user_id', user.id)
```

**Potential Issue**: 
- Checkout might be saving orders with `guest_email` instead of `user_id`
- Or `user_id` from checkout doesn't match auth `user.id`

**Fix**: Check both user_id AND guest_email:
```typescript
const { data: ordersData } = await supabase
  .from('orders')
  .select(`...`)
  .or(`user_id.eq.${user.id},guest_email.eq.${user.email}`)
  .order('created_at', { ascending: false })
```

---

## Summary of What to Fix:

1. ✅ **Order Number**: Add milliseconds to prevent duplicates
2. ⚠️ **First/Last Name**: Already implemented - verify database
3. ❌ **Save Address**: Add address insertion after order creation
4. ❌ **Orders Display**: Query by email OR user_id, not just user_id
