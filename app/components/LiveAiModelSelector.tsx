"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  Copy,
  Check,
  Lock,
  Unlock,
  Sliders,
  Image as ImageIcon,
  Flame,
  ArrowRight,
} from "lucide-react";
import { AiProviderPlatform, LiveAiModel, BASE_PROVIDERS } from "@/app/lib/aiModelRegistry";

interface LiveAiModelSelectorProps {
  activeModelId: string;
  onSelectModel: (model: LiveAiModel) => void;
  mode?: "generate" | "edit" | "text" | "all";
  compact?: boolean;
}

export default function LiveAiModelSelector({
  activeModelId,
  onSelectModel,
  mode = "all",
  compact = false,
}: LiveAiModelSelectorProps) {
  // Master provider data
  const [providers, setProviders] = useState<AiProviderPlatform[]>(BASE_PROVIDERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Cached Catalog");
  const [statusNotice, setStatusNotice] = useState<string>("");

  // Safeguard: Free Tier Safe Mode (Default TRUE as requested by user)
  const [isSafeMode, setIsSafeMode] = useState<boolean>(true);
  const [showEarningConfirm, setShowEarningConfirm] = useState<boolean>(false);

  // Selected filters
  const [selectedProviderId, setSelectedProviderId] = useState<string>("nanobanana");
  const [selectedModelId, setSelectedModelId] = useState<string>(activeModelId || "nano-banana");
  const [modalityFilter, setModalityFilter] = useState<"all" | "text2img" | "img2img" | "text">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Fetch live model registry
  const fetchLiveModels = async (forceRefresh = false) => {
    setIsLoading(true);
    setStatusNotice("");
    try {
      const url = `/api/models/live?free_only=${isSafeMode}&refresh=${forceRefresh}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.providers && Array.isArray(data.providers) && data.providers.length > 0) {
          setProviders(data.providers);
          setLastRefreshed(new Date().toLocaleTimeString());
          setStatusNotice(
            forceRefresh
              ? `✅ Synced ${data.total_models || 0} live models (${data.free_models_count || 0} free)`
              : ""
          );
        }
      }
    } catch (err: any) {
      console.warn("Live model fetch fallback to cached registry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveModels(false);
  }, [isSafeMode]);

  useEffect(() => {
    if (activeModelId && activeModelId !== selectedModelId) {
      setSelectedModelId(activeModelId);
      // Auto-detect provider if possible
      for (const p of providers) {
        const found = p.models.find((m) => m.id === activeModelId);
        if (found) {
          setSelectedProviderId(p.id);
          break;
        }
      }
    }
  }, [activeModelId, providers]);

  // Active provider object
  const currentProvider = useMemo(() => {
    return providers.find((p) => p.id === selectedProviderId) || providers[0];
  }, [providers, selectedProviderId]);

  // Filtered models for currently selected provider
  const availableProviderModels = useMemo(() => {
    if (!currentProvider) return [];
    return currentProvider.models.filter((m) => {
      // 1. Safeguard check
      if (isSafeMode && !m.isFree && !m.isFreeTier) return false;
      // 2. Modality filter
      if (modalityFilter === "text2img" && m.type !== "text2img" && m.type !== "both") return false;
      if (modalityFilter === "img2img" && m.type !== "img2img" && m.type !== "both") return false;
      if (modalityFilter === "text" && m.type !== "text" && m.type !== "multimodal") return false;
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesId = m.id.toLowerCase().includes(q);
        const matchesDesc = m.description.toLowerCase().includes(q);
        return matchesName || matchesId || matchesDesc;
      }
      return true;
    });
  }, [currentProvider, isSafeMode, modalityFilter, searchQuery]);

  // Currently selected model object
  const currentModel = useMemo(() => {
    for (const p of providers) {
      const match = p.models.find((m) => m.id === selectedModelId);
      if (match) return match;
    }
    return currentProvider?.models[0] || BASE_PROVIDERS[0].models[0];
  }, [providers, selectedModelId, currentProvider]);

  const handleApplyModel = (model: LiveAiModel) => {
    setSelectedModelId(model.id);
    onSelectModel(model);
  };

  const handleCopyId = () => {
    if (currentModel) {
      navigator.clipboard.writeText(currentModel.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const toggleSafeMode = () => {
    if (isSafeMode) {
      // Prompt user confirmation to unlock paid models
      setShowEarningConfirm(true);
    } else {
      // Instantly re-enable safe mode
      setIsSafeMode(true);
    }
  };

  const confirmEarningMode = () => {
    setIsSafeMode(false);
    setShowEarningConfirm(false);
  };

  if (compact) {
    return (
      <div className="space-y-2 p-3 bg-slate-950/90 rounded-2xl border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.12)]">
        {/* Header with Title and Safeguard badge */}
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-cyan-500/20">
          <label className="font-bold text-white flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Provider &amp; Model</span>
          </label>
          <button
            type="button"
            onClick={toggleSafeMode}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
              isSafeMode
                ? "bg-emerald-950/60 border-emerald-400 text-emerald-300"
                : "bg-amber-950/60 border-amber-400 text-amber-300"
            }`}
            title="Toggle Free Safeguard"
          >
            {isSafeMode ? "🟢 Free Only" : "⚡ Earning Mode"}
          </button>
        </div>

        {/* 1. Platform Dropdown */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Provider Platform</span>
            <span className="text-cyan-400 font-mono">{providers.length} Platforms</span>
          </span>
          <div className="relative">
            <select
              value={selectedProviderId}
              onChange={(e) => {
                const newProvId = e.target.value;
                setSelectedProviderId(newProvId);
                const prov = providers.find((p) => p.id === newProvId);
                if (prov && prov.models.length > 0) {
                  const defaultModel =
                    prov.models.find((m) => m.id === prov.defaultFreeModelId) || prov.models[0];
                  setSelectedModelId(defaultModel.id);
                  onSelectModel(defaultModel);
                }
              }}
              className="w-full bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white rounded-xl px-2.5 h-8 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer appearance-none pr-6"
            >
              {providers.map((p) => {
                const freeCount = p.models.filter((m) => m.isFree || m.isFreeTier).length;
                return (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-white">
                    {p.name} ({freeCount} Free)
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-cyan-400 text-[10px] font-bold">
              ▼
            </div>
          </div>
        </div>

        {/* 2. Model Dropdown */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Model</span>
            <span className="text-emerald-400 font-mono text-[9px]">{currentModel.pricingLabel}</span>
          </span>
          <div className="relative">
            <select
              value={selectedModelId}
              onChange={(e) => {
                const newModelId = e.target.value;
                setSelectedModelId(newModelId);
                const found = currentProvider.models.find((m) => m.id === newModelId);
                if (found) onSelectModel(found);
              }}
              className="w-full bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white rounded-xl px-2.5 h-8 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer appearance-none pr-6"
            >
              {availableProviderModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-950 text-white">
                  {m.name} &bull; {m.pricingLabel}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-cyan-400 text-[10px] font-bold">
              ▼
            </div>
          </div>
        </div>

        {/* Latency & Key status */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span className="text-cyan-300 font-mono">⚡ {currentModel.latency}</span>
          <span className="text-slate-400 text-[9px]">
            {currentModel.requiresApiKey ? "Requires API Key" : "🟢 No Key Required"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/90 border border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.18)] rounded-2xl p-4 sm:p-5 space-y-4 transition-all duration-300 relative overflow-hidden backdrop-blur-md">
      {/* ── Outer Neon Accent Glow ── */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Header & Safeguard Controller ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              Live AI Provider Platforms &amp; Free Model Hub
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time model synchronization across free-tier platforms. Pick your provider and model individually.
          </p>
        </div>

        {/* Free Tier Safe Mode Pill / Earning Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={toggleSafeMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shadow-md ${
              isSafeMode
                ? "bg-emerald-950/70 border-emerald-400/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                : "bg-amber-950/70 border-amber-400/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            }`}
            title="Toggle between Free Tier Safeguard and Earning Mode"
          >
            {isSafeMode ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>🟢 Free Safeguard: ON ($0 Cost)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>⚡ Earning Mode (Paid Unlocked)</span>
              </>
            )}
          </button>

          {/* Live Refresh Button */}
          <button
            onClick={() => fetchLiveModels(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 rounded-xl text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
            title="Refresh live models directly from AI providers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden md:inline">{isLoading ? "Syncing..." : "Sync Live"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal when switching off Free Safeguard */}
      {showEarningConfirm && (
        <div className="bg-amber-950/40 border border-amber-500/50 p-3.5 rounded-xl space-y-2 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Enable Earning Mode &amp; Unlock Paid Models?</span>
          </div>
          <p className="text-[11px] text-slate-300">
            You requested to stay on 100% Free / Free-Tier models until you are ready to earn. Turning this off will show paid models that consume API credits.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={confirmEarningMode}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg text-[10px] transition"
            >
              Confirm Earning Mode
            </button>
            <button
              onClick={() => setShowEarningConfirm(false)}
              className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-[10px] hover:text-white transition"
            >
              Keep Free Safeguard ON
            </button>
          </div>
        </div>
      )}

      {/* ── Main Dual Dropdown Row (Provider & Model) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Individual Provider Platform Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              1. Select AI Provider Platform
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {providers.length} Platforms Available
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedProviderId}
              onChange={(e) => {
                const newProvId = e.target.value;
                setSelectedProviderId(newProvId);
                const prov = providers.find((p) => p.id === newProvId);
                if (prov && prov.models.length > 0) {
                  // Default to the first available free model for this provider
                  const defaultModel =
                    prov.models.find((m) => m.id === prov.defaultFreeModelId) || prov.models[0];
                  setSelectedModelId(defaultModel.id);
                  onSelectModel(defaultModel);
                }
              }}
              className="w-full bg-slate-900/95 border border-cyan-500/40 hover:border-cyan-300 text-white rounded-xl px-3.5 h-10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-inner appearance-none pr-8"
            >
              {providers.map((p) => {
                const freeCount = p.models.filter((m) => m.isFree || m.isFreeTier).length;
                return (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-white py-1">
                    {p.name} &bull; {p.badge} ({freeCount} Free Models)
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-cyan-400 text-xs font-black">
              ▼
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="truncate max-w-[280px]">{currentProvider.description}</span>
            <a
              href={currentProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-200 inline-flex items-center gap-1 shrink-0 font-medium"
            >
              Docs <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* 2. Individual Model Dropdown for Selected Provider */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              2. Select Model from {currentProvider.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              {availableProviderModels.length} Models Ready
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedModelId}
              onChange={(e) => {
                const newModelId = e.target.value;
                setSelectedModelId(newModelId);
                const found = currentProvider.models.find((m) => m.id === newModelId);
                if (found) onSelectModel(found);
              }}
              className="w-full bg-slate-900/95 border border-cyan-500/40 hover:border-cyan-300 text-white rounded-xl px-3.5 h-10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-inner appearance-none pr-8"
            >
              {availableProviderModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-950 text-white py-1">
                  {m.name} &bull; {m.pricingLabel} &bull; {m.latency}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-cyan-400 text-xs font-black">
              ▼
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="text-emerald-300 font-mono font-bold">{currentModel.pricingLabel}</span>
            <span className="text-cyan-400 font-mono">{currentModel.latency} latency</span>
          </div>
        </div>
      </div>

      {/* ── Search & Modality Filter Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        {/* Modality Chips */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setModalityFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              modalityFilter === "all"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Modalities
          </button>
          <button
            onClick={() => setModalityFilter("text2img")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              modalityFilter === "text2img"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🎨 Text-to-Image
          </button>
          <button
            onClick={() => setModalityFilter("img2img")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              modalityFilter === "img2img"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ✨ Image-to-Image
          </button>
          <button
            onClick={() => setModalityFilter("text")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              modalityFilter === "text"
                ? "bg-cyan-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🧠 Reasoning / Prompt
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search model name or tag..."
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Selected Model Interactive Card ── */}
      <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              {currentModel.name}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400 text-emerald-300 text-[10px] font-bold font-mono">
              {currentModel.pricingLabel}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400 text-cyan-300 text-[10px] font-bold font-mono">
              {currentModel.badge}
            </span>
            {!currentModel.requiresApiKey && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400 text-amber-300 text-[10px] font-bold font-mono">
                ⚡ Keyless (Zero Config)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            {currentModel.description}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-0.5">
            <span>ID: <code className="text-cyan-300">{currentModel.id}</code></span>
            <span>&bull;</span>
            <span>Platform: <strong className="text-slate-200">{currentModel.providerName}</strong></span>
            <span>&bull;</span>
            <span>Latency: <strong className="text-cyan-400">{currentModel.latency}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleCopyId}
            className="px-2.5 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
            title="Copy Model Identifier"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedId ? "Copied" : "Copy ID"}</span>
          </button>

          <button
            onClick={() => handleApplyModel(currentModel)}
            className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Set as Active Engine</span>
          </button>
        </div>
      </div>

      {/* Status Notice Toast / Last Updated */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
        <span>{statusNotice || `Last synced with providers: ${lastRefreshed}`}</span>
        <span>Safe Mode: {isSafeMode ? "Zero Cost Guaranteed" : "All Models"}</span>
      </div>
    </div>
  );
}
