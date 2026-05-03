"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Upload, X, Sparkles, Loader2, Trash2, Download,
  XCircle, RefreshCw, Plus, LayoutTemplate, Layers, ChevronDown, CreditCard,
  Users, Grid3X3, User,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type TemplateType = "single" | "multi_person" | "pose_collage"

interface Template {
  id: string
  name: string
  reference_image_url: string
  description?: string
  template_type: TemplateType
  collage_rows: number
  collage_cols: number
  created_at: string
}

interface AIJob {
  id: string
  type?: "image" | "angle"
  parent_job_id?: string | null
  prompt: string
  input_image_urls: string[]
  task_id: string | null
  status: "pending" | "processing" | "success" | "failed"
  result_urls: string[]
  error_msg: string | null
  dress_length?: string
  collage_group_id?: string | null
  collage_cell_index?: number | null
  collage_rows?: number | null
  collage_cols?: number | null
  created_at: string
}

const DRESS_LENGTHS = ["Mini", "Short", "Midi", "Maxi", "Floor"]
const STATUS_CFG = {
  pending:    { label: "Queued",     color: "bg-gray-100 text-gray-600",     spin: false },
  processing: { label: "Generating", color: "bg-yellow-100 text-yellow-700", spin: true  },
  success:    { label: "Done",       color: "bg-green-100 text-green-700",   spin: false },
  failed:     { label: "Failed",     color: "bg-red-100 text-red-600",       spin: false },
}

const TEMPLATE_TYPE_CFG: Record<TemplateType, { label: string; Icon: typeof User; hint: string }> = {
  single:       { label: "Single Model",  Icon: User,     hint: "1 person in photo — standard try-on" },
  multi_person: { label: "Two Models",    Icon: Users,    hint: "2+ people in one photo — same dress on all" },
  pose_collage: { label: "Pose Grid",     Icon: Grid3X3,  hint: "Grid of poses — generates one result per cell" },
}

// ── Canvas utilities ──────────────────────────────────────────────────────────

async function compressAndConvert(file: File, maxPx = 1800, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx }
      const canvas = document.createElement("canvas")
      canvas.width = width; canvas.height = height
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error("Conversion failed"))
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
      }, "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")) }
    img.src = url
  })
}

// Split a collage image into individual cells
async function splitCollageIntoCells(
  imageUrl: string,
  rows: number,
  cols: number
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const cellW = Math.floor(img.width / cols)
      const cellH = Math.floor(img.height / rows)
      const files: File[] = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas")
          canvas.width = cellW
          canvas.height = cellH
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH)
          // Synchronous toDataURL for simplicity (cells are small)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88)
          const byteStr = atob(dataUrl.split(",")[1])
          const arr = new Uint8Array(byteStr.length)
          for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i)
          files.push(new File([arr], `cell-${r}-${c}.jpg`, { type: "image/jpeg" }))
        }
      }
      resolve(files)
    }
    img.onerror = reject
    img.src = imageUrl
  })
}

// Stitch result images back into the original grid layout
async function assembleCollage(
  resultUrls: (string | null)[],
  rows: number,
  cols: number
): Promise<string> {
  const cellW = 600
  const cellH = 800
  const canvas = document.createElement("canvas")
  canvas.width = cellW * cols
  canvas.height = cellH * rows
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#f9f9f9"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await Promise.all(
    resultUrls.map((url, i) => {
      if (!url) return Promise.resolve()
      const r = Math.floor(i / cols)
      const c = i % cols
      return new Promise<void>((res) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          const scale = Math.min(cellW / img.width, cellH / img.height)
          const w = img.width * scale
          const h = img.height * scale
          ctx.drawImage(img, c * cellW + (cellW - w) / 2, r * cellH + (cellH - h) / 2, w, h)
          res()
        }
        img.onerror = () => res()
        img.src = url
      })
    })
  )
  return canvas.toDataURL("image/jpeg", 0.88)
}

// ── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({ t, selected, onSelect, onDelete }: {
  t: Template; selected?: boolean; onSelect: () => void; onDelete?: () => void
}) {
  const { Icon } = TEMPLATE_TYPE_CFG[t.template_type || "single"]
  return (
    <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={e => e.key === "Enter" && onSelect()}
      className={`relative group rounded-xl overflow-hidden aspect-[9/16] border-2 transition-all w-full cursor-pointer ${selected ? "border-[#FFDC00] shadow-lg" : "border-transparent hover:border-gray-200"}`}>
      <img src={t.reference_image_url} alt={t.name} className="w-full h-full object-contain bg-gray-100" />
      {selected && <div className="absolute inset-0 bg-[#FFDC00]/20 flex items-end justify-center pb-2"><span className="text-[10px] bg-[#FFDC00] text-black font-bold px-2 py-0.5 rounded-full">Selected</span></div>}
      <div className="absolute top-1.5 left-1.5">
        <span className="bg-black/60 text-white rounded-full p-1 flex"><Icon className="w-2.5 h-2.5" /></span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2 py-1.5">
        <p className="text-[10px] text-white font-medium truncate">{t.name}</p>
      </div>
      {onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

// ── New template dialog ───────────────────────────────────────────────────────
function NewTemplateDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [templateType, setTemplateType] = useState<TemplateType>("single")
  const [collageRows, setCollageRows] = useState(3)
  const [collageCols, setCollageCols] = useState(3)
  const [img, setImg] = useState<{ file: File; preview: string; uploadedUrl?: string; uploading: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setName(""); setDesc(""); setImg(null); setError(null); setTemplateType("single") }

  const handleFile = async (files: FileList | null) => {
    if (!files?.[0]) return
    const f = files[0]
    setImg({ file: f, preview: URL.createObjectURL(f), uploading: true })
    const compressed = await compressAndConvert(f)
    const fd = new FormData(); fd.append("file", compressed)
    const res = await fetch("/api/ai-content/upload?type=template", { method: "POST", body: fd })
    const { url } = res.ok ? await res.json() : {}
    setImg(prev => prev ? { ...prev, uploadedUrl: url, uploading: false } : null)
  }

  const save = async () => {
    if (!name.trim()) return setError("Name required")
    if (!img?.uploadedUrl) return setError("Upload a photo first")
    setSaving(true); setError(null)
    const res = await fetch("/api/ai-content/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        reference_image_url: img.uploadedUrl,
        description: desc.trim() || null,
        template_type: templateType,
        collage_rows: templateType === "pose_collage" ? collageRows : 1,
        collage_cols: templateType === "pose_collage" ? collageCols : 1,
      }),
    })
    setSaving(false)
    if (!res.ok) return setError("Failed to save")
    reset(); setOpen(false); onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black font-semibold gap-1.5">
          <Plus className="w-3.5 h-3.5" />New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm font-semibold">New Template</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          {/* Type picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Template Type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(TEMPLATE_TYPE_CFG) as [TemplateType, typeof TEMPLATE_TYPE_CFG[TemplateType]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setTemplateType(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${templateType === key ? "border-[#FFDC00] bg-[#FFDC00]/10" : "border-gray-200 hover:border-gray-300"}`}>
                  <cfg.Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium text-gray-700 leading-tight">{cfg.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">{TEMPLATE_TYPE_CFG[templateType].hint}</p>
          </div>

          {/* Grid size (pose_collage only) */}
          {templateType === "pose_collage" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Grid Size</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={6} value={collageRows} onChange={e => setCollageRows(+e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                <span className="text-gray-400 text-sm">×</span>
                <input type="number" min={1} max={6} value={collageCols} onChange={e => setCollageCols(+e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                <span className="text-xs text-gray-400">{collageRows * collageCols} cells = {collageRows * collageCols * 41} credits</span>
              </div>
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {templateType === "pose_collage" ? "Pose Grid Image" : "Model Photo"} <span className="text-red-400">*</span>
            </label>
            {img ? (
              <div className="relative flex justify-center bg-gray-100 rounded-xl overflow-hidden">
                <div className={`${templateType === "pose_collage" ? "aspect-square w-40" : "aspect-[9/16] w-32"}`}>
                  <img src={img.preview} alt="" className="w-full h-full object-contain" />
                </div>
                {img.uploading && <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /><p className="text-xs text-gray-500">Uploading...</p></div>}
                {!img.uploading && img.uploadedUrl && <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">Uploaded</div>}
                <button onClick={() => setImg(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-[#FFDC00] transition-colors">
                <Upload className="w-5 h-5" />
                <span className="text-xs">Upload {templateType === "pose_collage" ? "collage image" : "model photo"}</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Name <span className="text-red-400">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={templateType === "multi_person" ? "e.g. Two models — studio" : "e.g. Front-facing model"} className="text-sm border-gray-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. 3×3 grid, grey bg" className="text-sm border-gray-200" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <Button onClick={save} disabled={saving || !name.trim() || !img?.uploadedUrl}
            className="w-full bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black font-semibold h-10 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Multi-select template picker ──────────────────────────────────────────────
function TemplatePicker({ templates, selected, onToggle }: {
  templates: Template[]
  selected: Template[]
  onToggle: (t: Template) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedIds = new Set(selected.map(t => t.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${selected.length > 0 ? "border-[#FFDC00] bg-[#FFDC00]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
          {selected.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selected.slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-1.5">
                  <img src={t.reference_image_url} alt="" className="w-6 h-8 object-contain rounded bg-gray-100" />
                  <span className="text-xs font-medium text-black">{t.name}</span>
                </div>
              ))}
              {selected.length > 3 && <span className="text-xs text-gray-400">+{selected.length - 3} more</span>}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Choose model templates...</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Select Templates
            {selected.length > 0 && <span className="ml-2 text-[#FFDC00]">{selected.length} selected</span>}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-400 -mt-1 mb-2">Tap to toggle. Each template = 1+ credits depending on type.</p>
        {templates.length === 0 ? (
          <div className="py-12 text-center">
            <LayoutTemplate className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No templates yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pt-1 pb-2">
            {templates.map(t => (
              <TemplateCard key={t.id} t={t} selected={selectedIds.has(t.id)} onSelect={() => onToggle(t)} />
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <button onClick={() => setOpen(false)}
              className="w-full bg-[#FFDC00] text-black text-sm font-semibold py-2.5 rounded-xl">
              Confirm {selected.length} template{selected.length > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Collage history card (pose_collage grouped result) ────────────────────────
function CollageGroupCard({ jobs, onDelete, onDownload }: {
  jobs: AIJob[]
  onDelete: (id: string) => void
  onDownload: (url: string, id: string) => void
}) {
  const sorted = [...jobs].sort((a, b) => (a.collage_cell_index ?? 0) - (b.collage_cell_index ?? 0))
  const rows = jobs[0]?.collage_rows || 1
  const cols = jobs[0]?.collage_cols || 1
  const allDone = sorted.every(j => j.status === "success")
  const anyFailed = sorted.some(j => j.status === "failed")
  const anyActive = sorted.some(j => j.status === "pending" || j.status === "processing")
  const [assembled, setAssembled] = useState<string | null>(null)

  useEffect(() => {
    if (!allDone) return
    const urls = sorted.map(j => j.result_urls?.[0] ?? null)
    assembleCollage(urls, rows, cols).then(setAssembled)
  }, [allDone])  // eslint-disable-line

  const overallStatus = anyActive ? "processing" : anyFailed ? "failed" : allDone ? "success" : "processing"
  const cfg = STATUS_CFG[overallStatus]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
      <div className="relative bg-gray-100 aspect-square">
        {assembled ? (
          <img src={assembled} alt="" className="w-full h-full object-contain" />
        ) : anyActive ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#FFDC00] animate-spin" />
            <p className="text-[10px] text-gray-400">{sorted.filter(j => j.status === "success").length}/{sorted.length} done</p>
          </div>
        ) : (
          <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {sorted.map((j, i) => (
              <div key={i} className="overflow-hidden bg-gray-200 border border-gray-100">
                {j.result_urls?.[0]
                  ? <img src={j.result_urls[0]} alt="" className="w-full h-full object-contain" />
                  : <div className="w-full h-full flex items-center justify-center"><XCircle className="w-3 h-3 text-red-300" /></div>
                }
              </div>
            ))}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {assembled && (
            <button onClick={() => {
              const a = document.createElement("a"); a.href = assembled
              a.download = "collage-result.jpg"; a.click()
            }} className="bg-black/60 text-white rounded-full p-1 hover:bg-black/80"><Download className="w-2.5 h-2.5" /></button>
          )}
          <button onClick={() => sorted.forEach(j => onDelete(j.id))}
            className="bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80"><Trash2 className="w-2.5 h-2.5" /></button>
        </div>
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.spin && <Loader2 className="w-2 h-2 animate-spin" />}{cfg.label}
          </span>
          <span className="text-[10px] text-gray-400">{rows}×{cols} grid</span>
        </div>
        <p className="text-[9px] text-gray-300 mt-1">
          {new Date(jobs[0].created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}

// ── Job detail modal (angles) ─────────────────────────────────────────────────
const ANGLE_LABELS = ["Front", "Side", "Back", "Detail"]

function JobDetailModal({ job, onClose, onDeleteJob, refreshCredits }: {
  job: AIJob
  onClose: () => void
  onDeleteJob: (id: string) => void
  refreshCredits: () => void
}) {
  const [angleJobs, setAngleJobs] = useState<AIJob[]>([])
  const [selectedCount, setSelectedCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAngles = useCallback(async () => {
    const res = await fetch(`/api/ai-content/jobs?parentId=${job.id}`)
    if (res.ok) setAngleJobs(await res.json())
  }, [job.id])

  useEffect(() => { fetchAngles() }, [fetchAngles])

  useEffect(() => {
    const hasActive = angleJobs.some(j => j.status === "pending" || j.status === "processing")
    if (hasActive && !modalPollRef.current) {
      modalPollRef.current = setInterval(fetchAngles, 6000)
    } else if (!hasActive && modalPollRef.current) {
      clearInterval(modalPollRef.current); modalPollRef.current = null
    }
    return () => { if (modalPollRef.current) { clearInterval(modalPollRef.current); modalPollRef.current = null } }
  }, [angleJobs, fetchAngles])

  const handleGenerateAngles = async () => {
    setGenerating(true); setError(null)
    try {
      const res = await fetch("/api/ai-content/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, count: selectedCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      await fetchAngles()
      refreshCredits()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setGenerating(false)
    }
  }

  const cfg = STATUS_CFG[job.status]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.spin && <Loader2 className="w-2 h-2 animate-spin" />}{cfg.label}
            </span>
            {job.dress_length && <span className="text-xs text-gray-500 capitalize">{job.dress_length}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-36 shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                {job.status === "success" && job.result_urls[0] ? (
                  <img src={job.result_urls[0]} alt="" className="w-full h-full object-contain" />
                ) : job.status === "processing" || job.status === "pending" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-[#FFDC00] animate-spin" />
                    <p className="text-[10px] text-gray-400">Generating...</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><XCircle className="w-6 h-6 text-red-300" /></div>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Input images</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(job.input_image_urls || []).slice(0, 6).map((url, i) => (
                  <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={url} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {job.status === "success" && job.result_urls[0] && (
                  <button onClick={() => { const a = document.createElement("a"); a.href = job.result_urls[0]; a.download = `gen-${job.id}.jpg`; a.click() }}
                    className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100">
                    <Download className="w-3 h-3" />Download
                  </button>
                )}
                <button onClick={() => { onDeleteJob(job.id); onClose() }}
                  className="flex items-center gap-1 text-xs text-red-400 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-100">
                  <Trash2 className="w-3 h-3" />Delete
                </button>
              </div>
            </div>
          </div>

          {job.status === "success" && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-gray-800">Generate Angles</p>
                  <p className="text-[10px] text-gray-400">Different poses and views — 10 credits each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedCount(c => Math.max(1, c - 1))}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-medium">−</button>
                  <span className="text-sm font-bold text-black w-4 text-center">{selectedCount}</span>
                  <button onClick={() => setSelectedCount(c => Math.min(4, c + 1))}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm font-medium">+</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {ANGLE_LABELS.slice(0, selectedCount).map(l => (
                  <span key={l} className="text-[10px] bg-[#FFDC00]/20 text-yellow-800 px-2 py-0.5 rounded-full font-medium">{l}</span>
                ))}
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button onClick={handleGenerateAngles} disabled={generating}
                className="w-full bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {generating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</>
                  : <><Sparkles className="w-3.5 h-3.5" />Generate {selectedCount} angle{selectedCount > 1 ? "s" : ""} — {selectedCount * 10} credits</>
                }
              </button>
            </div>
          )}

          {angleJobs.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-800 mb-3">Angle Variations</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {angleJobs.map((aj, i) => {
                  const acfg = STATUS_CFG[aj.status]
                  return (
                    <div key={aj.id} className="space-y-1">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                        {aj.status === "success" && aj.result_urls[0] ? (
                          <img src={aj.result_urls[0]} alt="" className="w-full h-full object-contain" />
                        ) : aj.status === "processing" || aj.status === "pending" ? (
                          <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#FFDC00] animate-spin" /></div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><XCircle className="w-5 h-5 text-red-300" /></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{ANGLE_LABELS[i] ?? `Angle ${i + 1}`}</span>
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full ${acfg.color}`}>{acfg.label}</span>
                      </div>
                      {aj.status === "success" && aj.result_urls[0] && (
                        <button onClick={() => { const a = document.createElement("a"); a.href = aj.result_urls[0]; a.download = `angle-${i + 1}-${aj.id}.jpg`; a.click() }}
                          className="w-full text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg py-1 hover:bg-gray-100 flex items-center justify-center gap-1">
                          <Download className="w-2.5 h-2.5" />Save
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIContentPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "templates" | "history">("generate")
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [dressLength, setDressLength] = useState("")
  const [promptNote, setPromptNote] = useState("")
  // Product images: staged locally, uploaded at generate time
  const [productImages, setProductImages] = useState<{ file: File; preview: string }[]>([])
  const [generating, setGenerating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<AIJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [credits, setCredits] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const cached = localStorage.getItem("ft_credits_balance")
    return cached !== null ? Number(cached) : null
  })
  const [selectedJob, setSelectedJob] = useState<AIJob | null>(null)
  const addlImgRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevJobsRef = useRef<AIJob[]>([])

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/credits")
      if (res.ok) {
        const balance = (await res.json()).credits_balance
        setCredits(balance)
        localStorage.setItem("ft_credits_balance", String(balance))
      }
    } catch {}
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-content/templates")
      if (res.ok) setTemplates(await res.json())
    } catch {}
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-content/jobs")
      if (res.ok) setJobs(await res.json())
    } catch {}
    setLoadingJobs(false)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => { fetchJobs() }, [fetchJobs])
  useEffect(() => { fetchCredits() }, [fetchCredits])

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "pending" || j.status === "processing")
    const justCompleted = jobs.some(j =>
      (j.status === "success" || j.status === "failed") &&
      prevJobsRef.current.some(p => p.id === j.id && (p.status === "pending" || p.status === "processing"))
    )
    prevJobsRef.current = jobs
    if (justCompleted) { fetchJobs(); fetchCredits() }
    if (hasActive && !pollRef.current) pollRef.current = setInterval(fetchJobs, 8000)
    else if (!hasActive && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [jobs, fetchJobs, fetchCredits])

  const uploadFile = async (file: File, type: "template" | "input" = "input") => {
    const compressed = await compressAndConvert(file)
    const fd = new FormData(); fd.append("file", compressed)
    const res = await fetch(`/api/ai-content/upload?type=${type}`, { method: "POST", body: fd })
    if (!res.ok) return null
    return (await res.json()).url as string
  }

  const CREDITS_PER_JOB = 30
  // Calculate total credit cost
  const totalJobs = selectedTemplates.reduce((sum, t) => {
    if (t.template_type === "pose_collage") return sum + (t.collage_rows || 1) * (t.collage_cols || 1)
    return sum + 1
  }, 0)
  const totalCost = totalJobs * CREDITS_PER_JOB

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) return setFormError("Select at least one template.")
    if (!dressLength) return setFormError("Select a dress length.")
    if (productImages.length === 0) return setFormError("Add at least one dress photo.")
    if (credits !== null && credits < totalCost) {
      return setFormError(`Not enough credits. Need ${totalCost}, have ${credits}.`)
    }
    setFormError(null); setGenerating(true)

    try {
      // Upload product images
      // For multi_person: use the FIRST (best) photo as productImageUrl
      // For single/pose_collage: build a collage if multiple, else use single
      const firstProductUrl = await uploadFile(productImages[0].file)
      if (!firstProductUrl) throw new Error("Failed to upload product image")

      let collageImageUrl: string | null = null
      if (productImages.length > 1) {
        // Build canvas collage
        const canvas = document.createElement("canvas")
        const cols = 2
        const rows = Math.ceil(productImages.length / cols)
        const cellW = 600; const cellH = 800
        canvas.width = cellW * cols; canvas.height = cellH * rows
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await Promise.all(productImages.map((pi, i) => new Promise<void>(res => {
          const img = new Image()
          img.onload = () => {
            const col = i % cols; const row = Math.floor(i / cols)
            const scale = Math.min(cellW / img.width, cellH / img.height)
            const w = img.width * scale; const h = img.height * scale
            ctx.drawImage(img, col * cellW + (cellW - w) / 2, row * cellH + (cellH - h) / 2, w, h)
            res()
          }
          img.src = pi.preview
        })))

        const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.88))
        const collageFile = new File([blob], "product-collage.jpg", { type: "image/jpeg" })
        collageImageUrl = await uploadFile(collageFile)
      }

      // For pose_collage templates: split and upload cells
      const poseCells: { templateId: string; cells: string[]; rows: number; cols: number }[] = []
      for (const t of selectedTemplates) {
        if (t.template_type === "pose_collage") {
          const rows = t.collage_rows || 1
          const cols = t.collage_cols || 1
          const cells = await splitCollageIntoCells(t.reference_image_url, rows, cols)
          const uploadedCells: string[] = []
          for (const cell of cells) {
            const url = await uploadFile(cell)
            if (url) uploadedCells.push(url)
          }
          poseCells.push({ templateId: t.id, cells: uploadedCells, rows, cols })
        }
      }

      const res = await fetch("/api/ai-content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateIds: selectedTemplates.map(t => t.id),
          productImageUrl: firstProductUrl,
          collageImageUrl: collageImageUrl || firstProductUrl,
          poseCells,
          dressLength,
          promptNote: promptNote.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      setProductImages([])
      setDressLength("")
      setPromptNote("")
      setSelectedTemplates([])
      setLoadingJobs(true)
      setActiveTab("history")
      await Promise.all([fetchJobs(), fetchCredits()])
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  const deleteJob = async (id: string) => {
    await fetch(`/api/ai-content/jobs?id=${id}`, { method: "DELETE" })
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/ai-content/templates?id=${id}`, { method: "DELETE" })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setSelectedTemplates(prev => prev.filter(t => t.id !== id))
  }

  const handleDownload = async (url: string, jobId: string) => {
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], `gen-${jobId}.jpg`, { type: "image/jpeg" })
      const compressed = await compressAndConvert(file, 2400, 0.88)
      const a = document.createElement("a")
      a.href = URL.createObjectURL(compressed); a.download = compressed.name; a.click()
    } catch { window.open(url, "_blank") }
  }

  const activeCount = jobs.filter(j => j.status === "pending" || j.status === "processing").length

  // Group pose_collage jobs
  const collageGroups = new Map<string, AIJob[]>()
  const standaloneJobs: AIJob[] = []
  for (const j of jobs) {
    if (j.collage_group_id) {
      const existing = collageGroups.get(j.collage_group_id) || []
      collageGroups.set(j.collage_group_id, [...existing, j])
    } else {
      standaloneJobs.push(j)
    }
  }

  const tabs = [
    { key: "generate" as const, label: "Generate",       icon: Sparkles },
    { key: "templates" as const, label: `Templates${templates.length ? ` (${templates.length})` : ""}`, icon: LayoutTemplate },
    { key: "history" as const,  label: `History${jobs.length ? ` (${jobs.length})` : ""}`,   icon: Layers },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-16 lg:top-0 z-40">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFDC00]" />
            <h1 className="text-base font-bold text-black">AI Content</h1>
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />{activeCount} generating
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Credits indicator */}
            <Link href="/admin/billing" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:border-[#FFDC00] rounded-full px-3 py-1.5 transition-colors">
              <CreditCard className="w-3 h-3" />
              {credits !== null
                ? <><span className="font-bold text-black">{credits.toLocaleString()}</span> credits</>
                : "Credits"
              }
            </Link>
            <Button variant="outline" size="sm" onClick={fetchJobs} className="border-gray-200 text-gray-500 h-8 w-8 p-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-6 flex border-t border-gray-100">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === key ? "border-[#FFDC00] text-black" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">

        {/* ── GENERATE TAB ── */}
        {activeTab === "generate" && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">New Generation</h2>
            <div className="space-y-4">

              {/* Template picker */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Model Templates <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1">(select multiple for batch)</span>
                </label>
                <TemplatePicker
                  templates={templates}
                  selected={selectedTemplates}
                  onToggle={t => setSelectedTemplates(prev =>
                    prev.some(s => s.id === t.id) ? prev.filter(s => s.id !== t.id) : [...prev, t]
                  )}
                />
                {selectedTemplates.some(t => t.template_type === "multi_person") && (
                  <p className="text-[10px] text-blue-600 mt-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Two-model template: the same dress will be applied to ALL people in the photo
                  </p>
                )}
                {selectedTemplates.some(t => t.template_type === "pose_collage") && (
                  <p className="text-[10px] text-purple-600 mt-1.5 flex items-center gap-1">
                    <Grid3X3 className="w-3 h-3" /> Pose grid: each cell generates separately, results assembled into a grid
                  </p>
                )}
              </div>

              {/* Dress length */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Dress Length <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {DRESS_LENGTHS.map(l => (
                    <button key={l} onClick={() => setDressLength(l.toLowerCase())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${dressLength === l.toLowerCase() ? "bg-[#FFDC00] border-[#FFDC00] text-black" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product photos */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Dress Photos <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1">
                    {selectedTemplates.some(t => t.template_type === "multi_person")
                      ? "(first photo used — two-model mode)"
                      : "(up to 7 — merged into collage if multiple)"}
                  </span>
                </label>
                {productImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {productImages.map((img, i) => (
                      <div key={i} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={img.preview} alt="" className="w-full h-full object-contain" />
                        {i === 0 && selectedTemplates.some(t => t.template_type === "multi_person") && (
                          <div className="absolute bottom-0 left-0 right-0 bg-[#FFDC00]/90 text-[8px] text-black font-bold text-center py-0.5">PRIMARY</div>
                        )}
                        <button onClick={() => setProductImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                    {productImages.length > 1 && (
                      <div className="col-span-5 text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3" />{productImages.length} photos merged into collage
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => addlImgRef.current?.click()} disabled={productImages.length >= 7}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-xs text-gray-400 hover:border-[#FFDC00] hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40">
                  <Upload className="w-3.5 h-3.5" />Add dress photos
                </button>
                <input ref={addlImgRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    if (!e.target.files) return
                    const toAdd = Array.from(e.target.files).slice(0, 7 - productImages.length)
                    setProductImages(prev => [...prev, ...toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
                  }} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <Textarea value={promptNote} onChange={e => setPromptNote(e.target.value)}
                  placeholder="e.g. keep the belt visible, show back detail..." className="min-h-[60px] text-xs resize-none border-gray-200" />
              </div>

              {/* Summary */}
              {selectedTemplates.length > 0 && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500 space-y-1.5">
                  <div className="flex justify-between"><span>AI model</span><span className="font-medium text-gray-700">nano-banana-pro · 2K · 9:16</span></div>
                  {dressLength && <div className="flex justify-between"><span>Length</span><span className="font-medium text-gray-700 capitalize">{dressLength}</span></div>}
                  {productImages.length > 1 && !selectedTemplates.some(t => t.template_type === "multi_person") && (
                    <div className="flex justify-between"><span>Product photos</span><span className="font-medium text-gray-700">{productImages.length} → collage</span></div>
                  )}
                  {selectedTemplates.map(t => {
                    const jobs = t.template_type === "pose_collage" ? (t.collage_rows || 1) * (t.collage_cols || 1) : 1
                    return (
                      <div key={t.id} className="flex justify-between">
                        <span className="truncate max-w-[140px]">{t.name}</span>
                        <span className="font-medium text-gray-700">{jobs} × 41 = {jobs * 41} credits</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                    <span className="font-medium text-gray-700">Total credits</span>
                    <span className={`font-bold ${credits !== null && credits < totalCost ? "text-red-500" : "text-black"}`}>
                      {totalCost} {credits !== null ? `(${credits} available)` : ""}
                    </span>
                  </div>
                </div>
              )}

              {formError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}

              <Button onClick={handleGenerate}
                disabled={generating || selectedTemplates.length === 0 || !dressLength || productImages.length === 0}
                className="w-full bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black font-semibold h-10 disabled:opacity-50">
                {generating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Preparing & sending...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate{totalCost > 0 ? ` — ${totalCost} credits` : ""}</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {activeTab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
              <NewTemplateDialog onSaved={fetchTemplates} />
            </div>
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <LayoutTemplate className="w-10 h-10 text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm mb-4">No templates yet.</p>
                <NewTemplateDialog onSaved={fetchTemplates} />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {templates.map(t => (
                  <TemplateCard key={t.id} t={t} selected={selectedTemplates.some(s => s.id === t.id)}
                    onSelect={() => {
                      setSelectedTemplates(prev =>
                        prev.some(s => s.id === t.id) ? prev.filter(s => s.id !== t.id) : [...prev, t]
                      )
                      setActiveTab("generate")
                    }}
                    onDelete={() => deleteTemplate(t.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div>
            {loadingJobs ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-[9/16] bg-gray-100" /><div className="p-2.5 space-y-1.5"><div className="h-2.5 bg-gray-100 rounded w-2/3" /></div>
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Sparkles className="w-10 h-10 text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm">No generations yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {/* Collage groups first */}
                {Array.from(collageGroups.entries()).map(([groupId, groupJobs]) => (
                  <CollageGroupCard key={groupId} jobs={groupJobs} onDelete={deleteJob} onDownload={handleDownload} />
                ))}
                {/* Standalone jobs */}
                {standaloneJobs.map(job => {
                  const cfg = STATUS_CFG[job.status]
                  return (
                    <div key={job.id} onClick={() => setSelectedJob(job)} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group cursor-pointer hover:shadow-md hover:border-gray-200 transition-all">
                      <div className="relative bg-gray-100 aspect-[9/16]">
                        {job.status === "success" && job.result_urls[0] ? (
                          <img src={job.result_urls[0]} alt="" className="w-full h-full object-contain" />
                        ) : job.status === "processing" || job.status === "pending" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-[#FFDC00] animate-spin" />
                            <p className="text-[10px] text-gray-400">Generating...</p>
                          </div>
                        ) : job.input_image_urls?.[1] ? (
                          <img src={job.input_image_urls[1]} alt="" className="w-full h-full object-contain opacity-30" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><XCircle className="w-6 h-6 text-red-300" /></div>
                        )}
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {job.status === "success" && job.result_urls[0] && (
                            <button onClick={e => { e.stopPropagation(); handleDownload(job.result_urls[0], job.id) }}
                              className="bg-black/60 text-white rounded-full p-1 hover:bg-black/80"><Download className="w-2.5 h-2.5" /></button>
                          )}
                          <button onClick={e => { e.stopPropagation(); deleteJob(job.id) }}
                            className="bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80"><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.spin && <Loader2 className="w-2 h-2 animate-spin" />}{cfg.label}
                          </span>
                          {job.dress_length && <span className="text-[10px] text-gray-400 capitalize">{job.dress_length}</span>}
                        </div>
                        {job.status === "failed" && job.error_msg && <p className="text-[9px] text-red-400 mt-1 truncate">{job.error_msg}</p>}
                        <p className="text-[9px] text-gray-300 mt-1.5">
                          {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onDeleteJob={id => { deleteJob(id); setSelectedJob(null) }}
          refreshCredits={fetchCredits}
        />
      )}
    </div>
  )
}
