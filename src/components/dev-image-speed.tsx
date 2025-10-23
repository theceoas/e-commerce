"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

interface Metric {
  url: string
  duration: number // ms
  transferSize?: number // bytes
  encodedBodySize?: number // bytes
  initiatorType?: string
}

function avg(nums: number[]) {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(1)} ${sizes[i]}`
}

export function DevImageSpeed({ title = "Image Speed" }: { title?: string }) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const observerRef = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return

    // Collect existing entries (buffered) and future ones
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[]
      const newMetrics: Metric[] = entries
        .filter((e) => e.initiatorType === "img")
        .map((e) => ({
          url: e.name,
          duration: e.duration,
          transferSize: (e as any).transferSize,
          encodedBodySize: (e as any).encodedBodySize,
          initiatorType: e.initiatorType,
        }))
      if (newMetrics.length) {
        setMetrics((prev) => [...prev, ...newMetrics])
      }
    })

    try {
      obs.observe({ type: "resource", buffered: true })
      observerRef.current = obs
    } catch (e) {
      // Some browsers may not support buffered.
      console.warn("PerformanceObserver not fully supported", e)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const supabaseMetrics = useMemo(() => metrics.filter(m => /supabase\.co|storage\/v1/.test(m.url)), [metrics])
  const pageMetrics = useMemo(() => metrics.filter(m => !/supabase\.co|storage\/v1/.test(m.url)), [metrics])

  const slowest = useMemo(() => {
    const all = metrics.slice().sort((a, b) => b.duration - a.duration)
    return all[0]
  }, [metrics])

  if (process.env.NODE_ENV === "production") return null

  return (
    <div style={{
      position: "fixed",
      bottom: 12,
      left: 12,
      zIndex: 9999,
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 12,
      maxWidth: 360,
      backdropFilter: "saturate(120%) blur(6px)",
    }}>
      <div style={{fontWeight: 600, marginBottom: 6}}>{title}</div>
      <div>Images observed: {metrics.length}</div>
      <div>Avg duration (all): {avg(metrics.map(m => m.duration))} ms</div>
      <div>Avg duration (Supabase): {avg(supabaseMetrics.map(m => m.duration))} ms</div>
      {slowest ? (
        <div style={{marginTop: 6}}>
          <div style={{opacity: 0.85}}>Slowest: {Math.round(slowest.duration)} ms</div>
          <div style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340}}>
            {slowest.url}
          </div>
          <div style={{opacity: 0.85}}>
            Size: {formatBytes(slowest.transferSize)} (encoded {formatBytes(slowest.encodedBodySize)})
          </div>
        </div>
      ) : null}
    </div>
  )
}