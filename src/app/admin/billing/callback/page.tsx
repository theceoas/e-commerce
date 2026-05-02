'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Module-level — survives React Strict Mode's unmount/remount cycle
const verifiedRefs = new Set<string>()

export default function BillingCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const [newBalance, setNewBalance] = useState<number | null>(null)

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference) {
      setStatus('error')
      setMessage('No payment reference found.')
      return
    }

    // Prevent double-call from React Strict Mode unmount/remount
    if (verifiedRefs.has(reference)) return
    verifiedRefs.add(reference)

    // Extract packageId from reference: ft-credits-{packageId}-{timestamp}
    const parts = reference.split('-')
    // format: ft-credits-growth-1234567890 or ft-credits-business-...
    // parts[0]=ft, parts[1]=credits, parts[2]=packageId, rest=timestamp
    const packageId = parts[2]

    fetch('/api/billing/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, packageId }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus('success')
          setNewBalance(data.new_balance)
          localStorage.setItem('ft_credits_balance', String(data.new_balance))
          setMessage(`${data.credits_added?.toLocaleString() ?? ''} credits added to your account.`)
          setTimeout(() => router.replace('/admin/billing'), 3000)
        } else {
          // 409 = already processed (webhook beat us to it) — treat as success
          if (data.error?.includes('already')) {
            setStatus('success')
            setMessage('Payment already processed. Credits have been added.')
            setTimeout(() => router.replace('/admin/billing'), 3000)
          } else {
            setStatus('error')
            setMessage(data.error || 'Verification failed.')
          }
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Network error. Please contact support if credits were not added.')
      })
  }, [searchParams, router])

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Verifying payment...</h2>
            <p className="text-sm text-gray-400">This will only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Payment successful</h2>
            <p className="text-sm text-gray-500 mb-3">{message}</p>
            {newBalance !== null && (
              <p className="text-2xl font-bold text-gray-900 mb-4">
                {newBalance.toLocaleString()} <span className="text-sm font-normal text-gray-400">credits</span>
              </p>
            )}
            <p className="text-xs text-gray-400">Redirecting you back...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-5">{message}</p>
            <Link href="/admin/billing" className="inline-flex items-center justify-center w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
              Back to Billing
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
