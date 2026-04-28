"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Upload, X, Sparkles, Loader2, Trash2, Download,
  XCircle, RefreshCw, Plus, LayoutTemplate, Layers, ChevronDown,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Template {
  id: string; name: string; reference_image_url: string; description?: string; created_at: string
}
interface AIJob {
  id: string; prompt: string; input_image_urls: string[]
  task_id: string | null; status: "pending"|"processing"|"success"|"failed"
  result_urls: string[]; error_msg: string | null; dress_length?: string; created_at: string
}

const DRESS_LENGTHS = ["Mini","Short","Midi","Maxi","Floor"]
const STATUS_CFG = {
  pending:    { label:"Queued",     color:"bg-gray-100 text-gray-600",    spin:false },
  processing: { label:"Generating", color:"bg-yellow-100 text-yellow-700", spin:true  },
  success:    { label:"Done",       color:"bg-green-100 text-green-700",   spin:false },
  failed:     { label:"Failed",     color:"bg-red-100 text-red-600",       spin:false },
}

// ── Canvas compress + convert to JPEG ─────────────────────────────────────────
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
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type:"image/jpeg" }))
      }, "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")) }
    img.src = url
  })
}

// ── Tiny template card ────────────────────────────────────────────────────────
function TemplateCard({ t, selected, onSelect, onDelete }: {
  t: Template; selected?: boolean; onSelect: () => void; onDelete?: () => void
}) {
  return (
    <button onClick={onSelect}
      className={`relative group rounded-xl overflow-hidden aspect-[9/16] border-2 transition-all w-full ${selected ? "border-[#FFDC00] shadow-lg" : "border-transparent hover:border-gray-200"}`}>
      <img src={t.reference_image_url} alt={t.name} className="w-full h-full object-contain bg-gray-100" />
      {selected && <div className="absolute inset-0 bg-[#FFDC00]/20 flex items-end justify-center pb-2"><span className="text-[10px] bg-[#FFDC00] text-black font-bold px-2 py-0.5 rounded-full">Selected</span></div>}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2 py-1.5">
        <p className="text-[10px] text-white font-medium truncate">{t.name}</p>
      </div>
      {onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </button>
  )
}

// ── New template dialog ────────────────────────────────────────────────────────
function NewTemplateDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [img, setImg] = useState<{ file: File; preview: string; uploadedUrl?: string; uploading: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setName(""); setDesc(""); setImg(null); setError(null) }

  const handleFile = async (files: FileList | null) => {
    if (!files?.[0]) return
    const f = files[0]
    setImg({ file: f, preview: URL.createObjectURL(f), uploading: true })
    const compressed = await compressAndConvert(f)
    const fd = new FormData(); fd.append("file", compressed)
    const res = await fetch("/api/ai-content/upload?type=template", { method:"POST", body:fd })
    const { url } = res.ok ? await res.json() : {}
    setImg(prev => prev ? { ...prev, uploadedUrl: url, uploading: false } : null)
  }

  const save = async () => {
    if (!name.trim()) return setError("Name required")
    if (!img?.uploadedUrl) return setError("Upload a photo first")
    setSaving(true); setError(null)
    const res = await fetch("/api/ai-content/templates", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name:name.trim(), reference_image_url:img.uploadedUrl, description:desc.trim()||null }),
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
        <DialogHeader><DialogTitle className="text-sm font-semibold">New Model Template</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          {/* Photo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Model Photo <span className="text-red-400">*</span></label>
            {img ? (
              <div className="relative flex justify-center bg-gray-100 rounded-xl overflow-hidden">
                <div className="aspect-[9/16] w-32">
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
                <span className="text-xs">Upload model photo</span>
                <span className="text-[10px] text-gray-300">Auto-compressed to JPG</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Name <span className="text-red-400">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front-facing model" className="text-sm border-gray-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Full body, white bg" className="text-sm border-gray-200" />
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

// ── Template picker dialog ─────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect }: {
  templates: Template[]; selected: Template | null; onSelect: (t: Template) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${selected ? "border-[#FFDC00] bg-[#FFDC00]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
          {selected ? (
            <div className="flex items-center gap-2.5">
              <img src={selected.reference_image_url} alt="" className="w-8 h-10 object-contain rounded bg-gray-100" />
              <span className="font-medium text-black text-sm">{selected.name}</span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Choose a model template...</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-sm font-semibold">Select Model Template</DialogTitle></DialogHeader>
        {templates.length === 0 ? (
          <div className="py-12 text-center">
            <LayoutTemplate className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No templates yet. Create one first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pt-1 pb-2">
            {templates.map(t => (
              <TemplateCard key={t.id} t={t} selected={selected?.id === t.id}
                onSelect={() => { onSelect(t); setOpen(false) }} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AIContentPage() {
  const [activeTab, setActiveTab] = useState<"generate"|"templates"|"history">("generate")
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template|null>(null)
  const [dressLength, setDressLength] = useState("")
  const [promptNote, setPromptNote] = useState("")
  const [additionalImages, setAdditionalImages] = useState<{ file:File; preview:string; url:string; uploading:boolean }[]>([])
  const [generating, setGenerating] = useState(false)
  const [formError, setFormError] = useState<string|null>(null)
  const [jobs, setJobs] = useState<AIJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const addlImgRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const prevJobsRef = useRef<AIJob[]>([])

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

  useEffect(() => {
    const hasActive = jobs.some(j => j.status==="pending" || j.status==="processing")
    const justCompleted = jobs.some(j =>
      (j.status==="success" || j.status==="failed") &&
      prevJobsRef.current.some(p => p.id===j.id && (p.status==="pending" || p.status==="processing"))
    )
    prevJobsRef.current = jobs
    if (justCompleted) fetchJobs()
    if (hasActive && !pollRef.current) pollRef.current = setInterval(fetchJobs, 8000)
    else if (!hasActive && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [jobs, fetchJobs])

  const uploadFile = async (file: File, type: "template" | "input" = "input") => {
    const compressed = await compressAndConvert(file)
    const fd = new FormData(); fd.append("file", compressed)
    const res = await fetch(`/api/ai-content/upload?type=${type}`, { method:"POST", body:fd })
    if (!res.ok) return null
    return (await res.json()).url as string
  }

  const handleAddlImgs = async (files: FileList | null) => {
    if (!files) return
    const toAdd = Array.from(files).slice(0, 7 - additionalImages.length)
    const previews = toAdd.map(f => ({ file:f, preview:URL.createObjectURL(f), url:"", uploading:true }))
    setAdditionalImages(prev => [...prev, ...previews])
    for (const f of toAdd) {
      const url = await uploadFile(f)
      setAdditionalImages(prev => prev.map(img => img.file===f ? { ...img, url:url||"", uploading:false } : img))
    }
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return setFormError("Select a template first.")
    if (!dressLength) return setFormError("Select a dress length.")
    if (additionalImages.some(i => i.uploading)) return setFormError("Wait for uploads to finish.")
    setFormError(null); setGenerating(true)
    try {
      const urls = additionalImages.map(i => i.url).filter(u => u.startsWith("http"))
      const res = await fetch("/api/ai-content/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ templateId:selectedTemplate.id, additionalImageUrls:urls, dressLength, promptNote:promptNote.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setAdditionalImages([]); setDressLength(""); setPromptNote("")
      setLoadingJobs(true)
      setActiveTab("history")
      await fetchJobs()
    } catch(e) { setFormError(e instanceof Error ? e.message : "Something went wrong") }
    finally { setGenerating(false) }
  }

  const deleteJob = async (id: string) => {
    await fetch(`/api/ai-content/jobs?id=${id}`, { method:"DELETE" })
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/ai-content/templates?id=${id}`, { method:"DELETE" })
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedTemplate?.id === id) setSelectedTemplate(null)
  }

  const handleDownload = async (url: string, jobId: string) => {
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], `gen-${jobId}.jpg`, { type:"image/jpeg" })
      const compressed = await compressAndConvert(file, 2400, 0.88)
      const a = document.createElement("a")
      a.href = URL.createObjectURL(compressed); a.download = compressed.name; a.click()
    } catch { window.open(url, "_blank") }
  }

  const activeCount = jobs.filter(j => j.status==="pending" || j.status==="processing").length

  const tabs = [
    { key:"generate" as const, label:"Generate", icon:Sparkles },
    { key:"templates" as const, label:`Templates${templates.length ? ` (${templates.length})` : ""}`, icon:LayoutTemplate },
    { key:"history" as const, label:`History${jobs.length ? ` (${jobs.length})` : ""}`, icon:Layers },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
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
          <Button variant="outline" size="sm" onClick={fetchJobs} className="border-gray-200 text-gray-500 h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="px-6 flex border-t border-gray-100">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab===key ? "border-[#FFDC00] text-black" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">

        {/* ── GENERATE TAB ── */}
        {activeTab==="generate" && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">New Generation</h2>

            <div className="space-y-4">
              {/* Template picker */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Model Template <span className="text-red-400">*</span></label>
                <TemplatePicker templates={templates} selected={selectedTemplate} onSelect={setSelectedTemplate} />
              </div>

              {/* Dress length */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Dress Length <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {DRESS_LENGTHS.map(l => (
                    <button key={l} onClick={() => setDressLength(l.toLowerCase())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${dressLength===l.toLowerCase() ? "bg-[#FFDC00] border-[#FFDC00] text-black" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dress photos */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Dress Photos <span className="text-gray-400 font-normal">(up to 7)</span>
                </label>
                {additionalImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {additionalImages.map((img, i) => (
                      <div key={i} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={img.preview} alt="" className="w-full h-full object-contain" />
                        {img.uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-3 h-3 animate-spin text-gray-400" /></div>}
                        <button onClick={() => setAdditionalImages(prev => prev.filter((_, j) => j!==i))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => addlImgRef.current?.click()} disabled={additionalImages.length >= 7}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-xs text-gray-400 hover:border-[#FFDC00] hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Upload className="w-3.5 h-3.5" />Add dress photos
                </button>
                <input ref={addlImgRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleAddlImgs(e.target.files)} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <Textarea value={promptNote} onChange={e => setPromptNote(e.target.value)}
                  placeholder="e.g. keep the belt visible, show back detail..." className="min-h-[60px] text-xs resize-none border-gray-200" />
              </div>

              {/* Summary */}
              {selectedTemplate && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500 space-y-1.5">
                  <div className="flex justify-between"><span>Model</span><span className="font-medium text-gray-700">nano-banana-pro · 2K · 9:16</span></div>
                  <div className="flex justify-between"><span>Template</span><span className="font-medium text-gray-700 truncate ml-6">{selectedTemplate.name}</span></div>
                  {dressLength && <div className="flex justify-between"><span>Length</span><span className="font-medium text-gray-700 capitalize">{dressLength}</span></div>}
                </div>
              )}

              {formError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}

              <Button onClick={handleGenerate} disabled={generating || !selectedTemplate || !dressLength}
                className="w-full bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black font-semibold h-10 disabled:opacity-50">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {activeTab==="templates" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{templates.length} template{templates.length!==1?"s":""}</p>
              <NewTemplateDialog onSaved={fetchTemplates} />
            </div>
            {templates.length===0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <LayoutTemplate className="w-10 h-10 text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm mb-4">No templates yet.</p>
                <NewTemplateDialog onSaved={fetchTemplates} />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {templates.map(t => (
                  <TemplateCard key={t.id} t={t} selected={selectedTemplate?.id===t.id}
                    onSelect={() => { setSelectedTemplate(t); setActiveTab("generate") }}
                    onDelete={() => deleteTemplate(t.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab==="history" && (
          <div>
            {loadingJobs ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-[9/16] bg-gray-100" />
                    <div className="p-2.5 space-y-1.5"><div className="h-2.5 bg-gray-100 rounded w-2/3" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : jobs.length===0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Sparkles className="w-10 h-10 text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm">No generations yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {jobs.map(job => {
                  const cfg = STATUS_CFG[job.status]
                  return (
                    <div key={job.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                      <div className="relative bg-gray-100 aspect-[9/16]">
                        {job.status==="success" && job.result_urls[0] ? (
                          <img src={job.result_urls[0]} alt="" className="w-full h-full object-contain" />
                        ) : job.status==="processing" || job.status==="pending" ? (
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
                          {job.status==="success" && job.result_urls[0] && (
                            <button onClick={() => handleDownload(job.result_urls[0], job.id)}
                              className="bg-black/60 text-white rounded-full p-1 hover:bg-black/80"><Download className="w-2.5 h-2.5" /></button>
                          )}
                          <button onClick={() => deleteJob(job.id)}
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
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{job.prompt}</p>
                        {job.status==="failed" && job.error_msg && <p className="text-[9px] text-red-400 mt-1 truncate">{job.error_msg}</p>}
                        <p className="text-[9px] text-gray-300 mt-1.5">
                          {new Date(job.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
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
    </div>
  )
}
