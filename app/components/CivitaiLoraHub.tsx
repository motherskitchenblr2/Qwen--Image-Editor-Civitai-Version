"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
  Tag,
  ThumbsUp,
  ArrowRight,
  Filter,
  Flame,
  Clock,
  Star,
  ChevronDown,
  FolderOpen,
} from "lucide-react";

export interface CivitaiModelItem {
  id: number;
  name: string;
  description: string;
  creator: {
    username: string;
    image: string | null;
  };
  tags: string[];
  stats: {
    downloadCount: number;
    thumbsUpCount: number;
    commentCount: number;
  };
  version: {
    id: number;
    name: string;
    baseModel: string;
    downloadUrl: string;
    trainedWords: string[];
    fileName: string;
    sizeMB: string;
  };
  allVersions: Array<{
    id: number;
    name: string;
    baseModel: string;
    downloadUrl: string;
    trainedWords: string[];
    fileName: string;
    sizeMB: string;
  }>;
  images: Array<{
    id: number;
    url: string;
    width: number;
    height: number;
    type?: string;
    nsfwLevel?: number;
  }>;
}

interface CivitaiLoraHubProps {
  backendUrl: string;
  isConnected: boolean;
  isModelReady?: boolean;
  availableLoras: Array<{ name: string; filename: string; size_mb: number; is_active: boolean }>;
  onLoraDownloaded: (loraName: string) => void;
  onSelectForStudio: (loraFilename: string, triggerWords?: string[]) => void;
}

const POPULAR_TAGS = [
  "All",
  "Cyberpunk",
  "Style",
  "Detail",
  "Enhancer",
  "Anime",
  "Concept",
  "Character",
  "Photorealism",
  "Clothing",
];

const BASE_MODELS = ["All", "SDXL 1.0", "Flux.1 D", "SD 1.5", "Pony"];

export default function CivitaiLoraHub({
  backendUrl,
  isConnected,
  isModelReady = false,
  availableLoras,
  onLoraDownloaded,
  onSelectForStudio,
}: CivitaiLoraHubProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTag, setActiveTag] = useState<string>("All");
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<string>("Most Downloaded");

  const [models, setModels] = useState<CivitaiModelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Infinite Scroll states
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Download states: { [modelId_or_versionId]: { state: 'idle'|'downloading'|'completed'|'error', msg?: string } }
  const [downloadStates, setDownloadStates] = useState<Record<string, { status: string; message?: string }>>({});
  const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);

  // Direct URL paste
  const [directUrl, setDirectUrl] = useState<string>("");
  const [directName, setDirectName] = useState<string>("");
  const [isDirectDownloading, setIsDirectDownloading] = useState<boolean>(false);

  // Local LoRA upload
  const localHubInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLocal, setIsUploadingLocal] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".safetensors")) {
      alert("Please select a valid .safetensors LoRA file.");
      if (localHubInputRef.current) localHubInputRef.current.value = "";
      return;
    }

    if (!backendUrl || !isConnected) {
      // Register local file metadata and trigger words in Next.js Vault registry
      const safeFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const cleanFilename = safeFilename.endsWith(".safetensors") ? safeFilename : `${safeFilename}.safetensors`;
      try {
        await fetch("/api/vault/loras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name.replace(".safetensors", ""),
            filename: cleanFilename,
            size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          }),
        });
      } catch {}

      onLoraDownloaded(cleanFilename);
      alert(`✅ Local LoRA "${file.name}" registered in Studio Vault! (Turn on Kaggle GPU when ready to fuse into Tesla T4 VRAM).`);
      if (localHubInputRef.current) localHubInputRef.current.value = "";
      return;
    }

    setIsUploadingLocal(true);
    setUploadProgress(0);

    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(".safetensors", ""));

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${cleanUrl}/api/loras/upload`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error during file upload."));
        xhr.send(formData);
      });

      const safeFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const cleanFilename = safeFilename.endsWith(".safetensors") ? safeFilename : `${safeFilename}.safetensors`;

      try {
        await fetch("/api/vault/loras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name.replace(".safetensors", ""),
            filename: cleanFilename,
            size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          }),
        });
      } catch {}

      onLoraDownloaded(cleanFilename);
      alert(`✅ Local LoRA "${file.name}" uploaded successfully! It is now available in your LoRA Model Dropdown in Studio.`);
    } catch (err: any) {
      alert(`Upload error: ${err.message || err}`);
    } finally {
      setIsUploadingLocal(false);
      setUploadProgress(0);
      if (localHubInputRef.current) localHubInputRef.current.value = "";
    }
  };

  // Version selection per model
  const [selectedVersions, setSelectedVersions] = useState<Record<number, number>>({});

  const fetchModels = async (query = searchQuery, tag = activeTag, baseM = selectedBaseModel, sort = sortOrder) => {
    setIsLoading(true);
    setError(null);
    setNextCursor(null);
    setHasMore(true);
    try {
      const q = query.trim() || (tag !== "All" ? tag : "");
      const params = new URLSearchParams();
      if (q) params.append("query", q);
      params.append("sort", sort);
      if (baseM !== "All") params.append("baseModel", baseM);
      params.append("limit", "16");
      params.append("nsfw", "true");

      const res = await fetch(`/api/civitai?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const newItems = data.items || [];
      setModels(newItems);
      const cursor = data.metadata?.nextCursor || null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor));
    } catch (e: any) {
      console.error("Civitai fetch error:", e);
      setError(e.message || "Failed to load Civitai LoRA models");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNextPage = async () => {
    if (isLoading || isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const q = searchQuery.trim() || (activeTag !== "All" ? activeTag : "");
      const params = new URLSearchParams();
      if (q) params.append("query", q);
      params.append("sort", sortOrder);
      if (selectedBaseModel !== "All") params.append("baseModel", selectedBaseModel);
      params.append("limit", "16");
      params.append("nsfw", "true");
      params.append("cursor", nextCursor);

      const res = await fetch(`/api/civitai?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const newItems = data.items || [];
      if (newItems.length > 0) {
        setModels((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueItems = newItems.filter((m: CivitaiModelItem) => !existingIds.has(m.id));
          return [...prev, ...uniqueItems];
        });
      }
      const cursor = data.metadata?.nextCursor || null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor));
    } catch (e: any) {
      console.error("Civitai next page error:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [activeTag, selectedBaseModel, sortOrder]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading && !isLoadingMore && nextCursor) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, nextCursor, searchQuery, activeTag, selectedBaseModel, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchModels();
  };

  const isDownloaded = (fileName: string, modelName: string) => {
    const cleanFile = fileName.replace(".safetensors", "").toLowerCase();
    const cleanModel = modelName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    return availableLoras.some((l) => {
      const lName = l.name.toLowerCase();
      const lFile = l.filename.replace(".safetensors", "").toLowerCase();
      return lName === cleanFile || lFile === cleanFile || lName.includes(cleanModel);
    });
  };

  const handleDownloadModel = async (model: CivitaiModelItem, versionOverride?: any) => {
    const version = versionOverride || model.version;
    const downloadKey = `${model.id}_${version.id}`;
    const cleanName = `${model.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const triggerWordStr = (version.trainedWords || []).join(", ");

    if (!backendUrl || !isConnected) {
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { status: "downloading", message: "Starting direct browser download..." },
      }));

      // Direct browser download of .safetensors from Civitai with zero GPU dependency
      const anchor = document.createElement("a");
      anchor.href = version.downloadUrl;
      anchor.download = version.fileName || `${cleanName}.safetensors`;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Register LoRA in local Next.js Vault catalog so trigger words and metadata persist
      try {
        await fetch("/api/vault/loras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: model.name,
            filename: version.fileName || `${cleanName}.safetensors`,
            size_mb: parseFloat(version.sizeMB) || 0,
            trigger_words: triggerWordStr,
          }),
        });
      } catch {}

      onLoraDownloaded(version.fileName || `${cleanName}.safetensors`);
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { status: "completed", message: "Downloaded to device & registered!" },
      }));
      return;
    }

    setDownloadStates((prev) => ({
      ...prev,
      [downloadKey]: { status: "downloading", message: "Saving to Google Drive Vault..." },
    }));

    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/loras/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: version.downloadUrl,
          name: cleanName,
          trigger_words: triggerWordStr,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Download failed on GPU backend");
      }

      const data = await res.json();
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { status: "completed", message: "Saved to Drive & Ready!" },
      }));

      // Notify parent to refresh available LoRAs
      onLoraDownloaded(data.filename || `${cleanName}.safetensors`);
    } catch (e: any) {
      console.error("LoRA download error:", e);
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { status: "error", message: e.message },
      }));
    }
  };

  const handleDirectDownload = async () => {
    if (!directUrl.trim()) return;
    setIsDirectDownloading(true);
    try {
      const safeName = directName.trim() || `civitai_lora_${Date.now()}`;
      if (backendUrl && isConnected) {
        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const res = await fetch(`${cleanUrl}/api/loras/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: directUrl.trim(),
            name: safeName,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Download failed on GPU backend");
        }

        const data = await res.json();
        setDirectUrl("");
        setDirectName("");
        onLoraDownloaded(data.filename || `${safeName}.safetensors`);
        alert(`✅ LoRA "${data.name}" successfully downloaded and saved to 5 TB Google Drive Vault!`);
      } else {
        // Direct browser download when GPU is offline
        const anchor = document.createElement("a");
        anchor.href = directUrl.trim();
        anchor.download = `${safeName}.safetensors`;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        // Register in vault metadata
        try {
          await fetch("/api/vault/loras", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: safeName,
              filename: `${safeName}.safetensors`,
              size_mb: 0,
            }),
          });
        } catch {}

        onLoraDownloaded(`${safeName}.safetensors`);
        setDirectUrl("");
        setDirectName("");
        alert(`✅ Direct download started in browser for "${safeName}" and registered in Vault!`);
      }
    } catch (e: any) {
      alert(`Download notice: ${e.message}`);
    } finally {
      setIsDirectDownloading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrigger(text);
    setTimeout(() => setCopiedTrigger(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-fadeIn">
      {/* ── Header Banner ────────────────────────────────────────── */}
      <div className="bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18)] rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/15 border border-cyan-400 rounded-full text-xs font-bold text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Civitai.red Live LoRA Explorer
              </div>
              {isConnected && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isModelReady
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-neon-emerald"
                    : "bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-neon-amber"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isModelReady ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
                  <span>{isModelReady ? "Dual T4 GPU Ready" : "Dual T4 Warming Up (~60s)"}</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              Browse, Download &amp; Fuse LoRAs to 5 TB Vault
            </h2>
            <p className="text-xs text-cyan-200/80 max-w-2xl leading-relaxed">
              Explore thousands of community-crafted LoRAs directly from Civitai.red. Download in seconds straight to
              your persistent Google Drive Vault (`AI_Storage/loras/`) and inject them dynamically into the Dual Tesla T4
              pipeline with zero restart.
            </p>
          </div>

          {/* Action Cards: Browse Local LoRA + Direct Civitai Download */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Browse & Upload Local LoRA */}
            <input
              type="file"
              ref={localHubInputRef}
              onChange={handleLocalUpload}
              accept=".safetensors"
              className="hidden"
            />
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 w-full sm:w-64 shadow-lg">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                Upload Local LoRA
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Select downloaded <code className="text-emerald-400">.safetensors</code> from your local disk/phone to upload into GPU storage.
              </p>
              <button
                onClick={() => localHubInputRef.current?.click()}
                disabled={isUploadingLocal || !isConnected}
                className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/80 text-emerald-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
              >
                {isUploadingLocal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Uploading {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Browse Local File</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Direct Link Input */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2 w-full sm:w-72 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Direct Civitai Download
              </span>
              <input
                type="text"
                placeholder="Paste Civitai / Civitai.red URL or ID"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Custom filename (optional)"
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={handleDirectDownload}
                  disabled={!directUrl.trim() || isDirectDownloading}
                  title={
                    isConnected
                      ? "Download and save to 5 TB Google Drive Vault on Kaggle GPU"
                      : "Direct browser download to your device (GPU offline)"
                  }
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold rounded-lg transition disabled:opacity-40"
                >
                  {isDirectDownloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Civitai.red LoRAs (e.g. Cyberpunk, Neon Glow, Analog Film, Watercolor)..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition shadow-inner"
            />
          </div>

          {/* Base Model Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Base:</span>
            <select
              value={selectedBaseModel}
              onChange={(e) => setSelectedBaseModel(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              {BASE_MODELS.map((bm) => (
                <option key={bm} value={bm} className="bg-slate-900 text-slate-200">
                  {bm}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
            <span className="text-slate-400">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="Most Downloaded" className="bg-slate-900 text-slate-200">
                Most Downloaded
              </option>
              <option value="Highest Rated" className="bg-slate-900 text-slate-200">
                Highest Rated
              </option>
              <option value="Newest" className="bg-slate-900 text-slate-200">
                Newest
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs rounded-2xl transition shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setActiveTag(tag);
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                activeTag === tag
                  ? "bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status / Info Feedback ──────────────────────────────── */}
      <div className="bg-slate-900/90 border border-cyan-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-cyan-300">
          <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>
            <strong>Civitai Explorer Active (Serverless):</strong> Browse, search, inspect trigger words, and download <span className="font-mono text-cyan-200">.safetensors</span> directly to your device with zero GPU required.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
            isConnected
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/60"
              : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}>
            {isConnected ? "⚡ GPU Vault Sync: ON" : "🌐 Browser Direct: ACTIVE"}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-900/60 p-4 rounded-2xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* ── Live Civitai Gallery Grid (Large Thumbnails) ──────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden animate-pulse flex flex-col h-[480px]"
            >
              <div className="w-full h-72 bg-slate-800" />
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                </div>
                <div className="h-9 bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No LoRA models found</p>
          <p className="text-xs text-slate-500">Try adjusting your search terms or base model filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.map((model) => {
            const currentVersionId = selectedVersions[model.id] || model.version.id;
            const currentVersion =
              model.allVersions.find((v) => v.id === currentVersionId) || model.version;

            const primaryItem = model.images && model.images[0];
            const primaryImage =
              primaryItem?.url ||
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
            const isVideo =
              primaryItem?.type === "video" ||
              Boolean(primaryImage.match(/\.(mp4|webm)$/i));

            const downloadKey = `${model.id}_${currentVersion.id}`;
            const downloadState = downloadStates[downloadKey];
            const alreadyInVault = isDownloaded(currentVersion.fileName, model.name);

            return (
              <div
                key={model.id}
                className="group bg-slate-950/85 hover:bg-slate-950 border border-cyan-500/35 hover:border-cyan-400 rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:-translate-y-1"
              >
                {/* ── Large Thumbnail / Video Preview with Overlay Badges ── */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                  {isVideo ? (
                    <video
                      src={primaryImage}
                      muted
                      autoPlay
                      loop
                      playsInline
                      {...({ referrerPolicy: "no-referrer" } as any)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <img
                      src={primaryImage}
                      alt={model.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-semibold text-cyan-300">
                      {currentVersion.baseModel}
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-full text-[10px] text-slate-300 font-medium">
                      <Download className="w-3 h-3 text-cyan-400" />
                      <span>{model.stats.downloadCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-md text-[10px] text-slate-300 font-mono">
                      {currentVersion.sizeMB} MB
                    </span>
                    {alreadyInVault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/90 text-black text-[10px] font-bold rounded-md shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        In Vault
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Card Content ── */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-slate-900/80">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-sm text-slate-100 group-hover:text-cyan-300 transition line-clamp-1" title={model.name}>
                        {model.name}
                      </h3>
                      <a
                        href={`https://civitai.red/models/${model.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-cyan-400 transition flex-shrink-0"
                        title="View on Civitai.red"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      by <span className="text-slate-300 font-medium">{model.creator.username}</span>
                    </p>

                    {/* Version Selector if multiple versions exist */}
                    {model.allVersions.length > 1 && (
                      <div className="pt-1">
                        <select
                          value={currentVersionId}
                          onChange={(e) =>
                            setSelectedVersions((prev) => ({
                              ...prev,
                              [model.id]: Number(e.target.value),
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                        >
                          {model.allVersions.map((v) => (
                            <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                              {v.name} ({v.baseModel} - {v.sizeMB} MB)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Trigger Words */}
                    {currentVersion.trainedWords && currentVersion.trainedWords.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Trigger Words:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {currentVersion.trainedWords.slice(0, 3).map((w, idx) => (
                            <button
                              key={idx}
                              onClick={() => copyToClipboard(w)}
                              className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-[10px] text-cyan-300 font-mono flex items-center gap-1 transition"
                              title="Click to copy trigger word"
                            >
                              {copiedTrigger === w ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                              <span>{w}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Action Buttons ── */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                    {downloadState?.status === "downloading" ? (
                      <button
                        disabled
                        className="w-full py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Saving to Drive Vault...</span>
                      </button>
                    ) : alreadyInVault ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectForStudio(currentVersion.fileName, currentVersion.trainedWords)}
                          className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Use in Studio</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDownloadModel(model, currentVersion)}
                          title="Re-download / update"
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          onClick={() => handleDownloadModel(model, currentVersion)}
                          className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black rounded-xl text-xs font-bold transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                          title={
                            isConnected
                              ? "Download directly to 5 TB Google Drive Vault on Kaggle GPU"
                              : "Download .safetensors directly to your device via browser (Zero GPU required)"
                          }
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isConnected ? "Save to Drive Vault" : "Download to Device"}</span>
                        </button>
                        <button
                          onClick={() => onSelectForStudio(currentVersion.fileName, currentVersion.trainedWords)}
                          title="Inject trigger words and use in Studio immediately"
                          className="px-2.5 py-2 bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Infinite Scroll Sentinel & Loader ── */}
          <div ref={observerTarget} className="col-span-full py-8 flex flex-col items-center justify-center min-h-[60px]">
            {isLoadingMore && (
              <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-cyan-500/30 rounded-full shadow-lg">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">Loading more LoRA models...</span>
              </div>
            )}
            {!hasMore && models.length > 0 && (
              <div className="text-center text-xs text-slate-500 py-2">
                All available models loaded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
