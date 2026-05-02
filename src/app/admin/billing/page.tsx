'use client'

import { useEffect, useState, useCallback } from 'react'
import { CreditCard, Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

// 30 credits per generation.
const PACKAGES = [
  { id: 'growth', label: 'Growth', credits: 1260, price: '₦22,500', gens: 42,  savings: null,       popular: false },
  { id: 'pro',    label: 'Pro',    credits: 1980, price: '₦35,000', gens: 66,  savings: '₦10,000',  popular: true  },
  { id: 'scale',  label: 'Scale',  credits: 3000, price: '₦54,000', gens: 100, savings: '₦13,500',  popular: false },
]

interface Transaction {
  id: string; type: string; amount: number; balance_after: number
  description: string | null; paystack_reference: string | null; created_at: string
}

const TX_COLOR: Record<string, string> = { purchase: '#16a34a', refund: '#16a34a', usage: '#dc2626', auto_topup: '#16a34a' }
const TX_LABEL: Record<string, string>  = { purchase: 'Purchase', refund: 'Refund', usage: 'Used', auto_topup: 'Top-up' }

export default function BillingPage() {
  const [balance, setBalance] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const cached = localStorage.getItem('ft_credits_balance')
    return cached !== null ? Number(cached) : null
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/balance')
      if (res.ok) {
        const data = await res.json()
        setBalance(data.credits_balance)
        localStorage.setItem('ft_credits_balance', String(data.credits_balance))
        setTransactions(data.transactions)
      }
    } catch {}
    setLoadingTx(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function buyPackage(pkg: typeof PACKAGES[0]) {
    if (buying) return
    setBuying(pkg.id)
    try {
      const res = await fetch('/api/billing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      })
      const data = await res.json()
      if (res.ok && data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        showToast(data.error ?? 'Could not start payment', 'error')
        setBuying(null)
      }
    } catch {
      showToast('Network error. Try again.', 'error')
      setBuying(null)
    }
  }

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-2xl sm:max-w-sm ${toast.type === 'success' ? 'bg-green-800 border border-green-700' : 'bg-red-800 border border-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Back link */}
        <div className="mb-6">
          <Link href="/admin/ai-content" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to AI Content
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" /> Credits & Billing
          </h1>
          <p className="text-sm text-gray-500">41 credits per generation. Each pose grid cell counts as one generation.</p>
        </div>

        {/* Balance card */}
        <div className="bg-gray-900 rounded-2xl p-5 sm:p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Current Balance</p>
            {balance === null ? (
              <div className="w-28 sm:w-32 h-9 sm:h-10 bg-gray-700 rounded-lg animate-pulse" />
            ) : (
              <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums leading-none">
                {balance.toLocaleString()}
                <span className="text-base sm:text-lg font-normal text-gray-400 ml-2">credits</span>
              </p>
            )}
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFDC00]/15 border border-[#FFDC00]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFDC00]" />
          </div>
        </div>

        {/* Packages */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Up Credits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {PACKAGES.map(pkg => (
              <div key={pkg.id} className={`relative bg-white rounded-xl border-2 p-4 sm:p-5 flex flex-col gap-3 ${pkg.popular ? 'border-[#FFDC00] shadow-sm' : 'border-gray-100'}`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFDC00] text-black text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                {/* Mobile: side by side. Desktop: stacked */}
                <div className="flex sm:block items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{pkg.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums leading-none">
                      {pkg.credits.toLocaleString()}
                      <span className="text-xs sm:text-sm font-normal text-gray-400 ml-1">credits</span>
                    </p>
                  </div>
                  <div className="sm:hidden text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">{pkg.price}</p>
                    <p className="text-xs text-gray-500">{pkg.gens} gens</p>
                  </div>
                </div>

                <div className="hidden sm:block space-y-0.5">
                  <p className="text-xs text-gray-600 font-medium">{pkg.gens} generations</p>
                  {pkg.savings ? (
                    <p className="text-xs text-green-600 font-medium">Save {pkg.savings}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Base rate</p>
                  )}
                </div>

                <div className="flex sm:block items-center gap-3 mt-auto">
                  <p className="hidden sm:block text-2xl font-bold text-gray-900 mb-3">{pkg.price}</p>
                  {pkg.savings && (
                    <p className="sm:hidden text-xs text-green-600 font-medium shrink-0">Save {pkg.savings}</p>
                  )}
                  <button
                    onClick={() => buyPackage(pkg)}
                    disabled={!!buying}
                    className={`flex-1 sm:w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      pkg.popular
                        ? 'bg-[#FFDC00] text-black hover:bg-yellow-300'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {buying === pkg.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening...</>
                      : `Buy ${pkg.label}`
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Credits never expire. Automatically refunded if a generation fails.</p>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Transaction History</h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {loadingTx ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Date', 'Description', 'Type', 'Credits', 'Balance'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 max-w-[180px] truncate">{tx.description ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ color: TX_COLOR[tx.type] ?? '#666', background: `${TX_COLOR[tx.type] ?? '#666'}18` }}>
                            {TX_LABEL[tx.type] ?? tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold tabular-nums"
                          style={{ color: TX_COLOR[tx.type] ?? '#333' }}>
                          {tx.type === 'usage' ? `-${tx.amount}` : `+${tx.amount}`}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 tabular-nums">{tx.balance_after.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
