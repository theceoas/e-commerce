# Paystack Callback Not Firing - Analysis

## Problem
After Paystack payment succeeds, the system doesn't recognize the success and doesn't process the order.

## Root Cause
The `onSuccess` and `onClose` callbacks in the `paymentConfig` are being set in a `useEffect` hook. Due to React's closure behavior with dynamically imported components, the callbacks may be referencing stale function instances, especially when the component re-renders.

## Solution
1. Use `useCallback` to memoize the `handlePaymentSuccess` and `handlePaymentClose` functions
2. Ensure these callbacks are stable references that don't change on every render
3. This prevents the Paystack button from having stale or undefined callback references

## Files to Modify
- `src/app/checkout/page.tsx`: Wrap payment handlers in `useCallback`
