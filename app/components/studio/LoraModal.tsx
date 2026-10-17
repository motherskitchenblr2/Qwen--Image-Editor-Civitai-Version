"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  X,
  Plus,
  Trash2,
  Check,
  Copy,
  Zap,
  RefreshCw,
  FolderOpen,
  Download,
  ExternalLink,
  Sliders,
  Sparkles,
} from "lucide-react";

export interface LoRAItem {
  name: string;
  scale: number;
}

export interface BackendLoRA {
  name: string;
  filename: string;
  size_mb: number;
  is_active: boolean;
  scale?: number;
  trigger_words?: string;
  base_model?: string;
  category?: string;
}

interface LoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLoras: BackendLoRA[];
  activeLoras: LoRAItem[];
  onToggleLora: (lora: BackendLoRA) => void;
  onUpdateLoraScale: (name: string, scale: number) => void;
  onInjectTriggers: (triggers: string) => void;
  onFuseLoras: () => void;
  onUnloadLoras: () => void;
  isFusing: boolean;
  isModelReady: boolean;
  isConnected: boolean;
  onBrowseLocal: () => void;
  isUploadingLocal: boolean;
  uploadProgress: number;
  civitaiUrl: string;
  setCivitaiUrl: (v: string) => void;
  loraCustomName: string;
  setLoraCustomName: (v: string) => void;
  onQuickDownload: () => void;
  isDownloading: boolean;
  onOpenCivitaiHub: () => void;
}

export default function LoraModal({
  isOpen,
  onClose,
  availableLoras,
  activeLoras,
  onToggleLora,
  onUpdateLoraScale,
  onInjectTriggers,
  onFuseLoras,
  onUnloadLoras,
  isFusing,
  isModelReady,
  isConnected,
  onBrowseLocal,
  isUploadingLocal,
  uploadProgress,
  civitaiUrl,
  setCivitaiUrl,
  loraCustomName,
  setLoraCustomName,
  onQuickDownload,
  isDownloading,
  onOpenCivitaiHub,
}: LoraModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);

  const categories = ["all", "Qwen", "SDXL", "Flux", "Style", "Character"];

  // Filtered LoRAs
  const filteredLoras = useMemo(() => {
    return availableLoras.filter((lora) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        lora.name.toLowerCase().includes(q) ||
        lora.filename.toLowerCase().includes(q) ||
        (lora.trigger_words && lora.trigger_words.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      const catLower = selectedCategory.toLowerCase();
      const nameLower = lora.name.toLowerCase();
      const fnLower = lora.filename.toLowerCase();
      return (
        nameLower.includes(catLower) ||
        fnLower.includes(catLower) ||
        (lora.base_model && lora.base_model.toLowerCase().includes(catLower)) ||
        (lora.category && lora.category.toLowerCase().includes(catLower))
      );
    });
  }, [availableLoras, searchQuery, selectedCategory]);

  const handleCopyTrigger = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrigger(text);
    setTimeout(() => setCopiedTrigger(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="bg-slate-950 border border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.25)] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-purple-500/30 bg-black/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                LoRA Studio &amp; Multi-Stack Manager
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/50">
                  {availableLoras.length} Available
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Stack up to 3 LoRAs simultaneously with independent weight tuning &amp; 1-click trigger injection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCivitaiHub}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-200 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <span>Explore Civitai Hub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-LoRA Active Stack Banner */}
        <div className="px-5 sm:px-6 py-3 bg-black/70 border-b border-purple-500/20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Active LoRA Stack ({activeLoras.length}/3)
            </span>
            <div className="flex items-center gap-2">
              {activeLoras.length > 0 && (
                <button
                  onClick={onUnloadLoras}
                  disabled={isFusing || !isConnected}
                  className="text-[11px] text-slate-400 hover:text-rose-300 font-bold transition"
                >
                  Clear Stack
                </button>
              )}
              <button
                onClick={onFuseLoras}
                disabled={isFusing || !isConnected || !isModelReady || activeLoras.length === 0}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black text-xs font-black rounded-lg transition shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-40"
              >
                {isFusing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-black" />
                )}
                <span>
                  {isFusing
                    ? "Fusing..."
                    : !isModelReady && isConnected
                    ? "Warming Up..."
                    : "Fuse Stack into GPU"}
                </span>
              </button>
            </div>
          </div>

          {activeLoras.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              No LoRAs in active stack. Select up to 3 from below to blend multiple styles, concepts, or characters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {activeLoras.map((lora, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-purple-500/50 p-2.5 rounded-xl flex flex-col gap-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[170px]" title={lora.name}>
                      {lora.name}
                    </span>
                    <button
                      onClick={() => onToggleLora({ name: lora.name, filename: lora.name, size_mb: 0, is_active: false })}
                      className="text-slate-400 hover:text-rose-400 transition"
                      title="Remove from stack"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Weight:</span>
                    <span className="text-cyan-300 font-mono font-bold">{lora.scale}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={lora.scale}
                    onChange={(e) => onUpdateLoraScale(lora.name, parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls Bar: Search & Category Filter */}
        <div className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, trigger, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-purple-500/25 border border-purple-400 text-purple-200 shadow-sm"
                    : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* LoRA Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 no-scrollbar">
          {filteredLoras.length === 0 ? (
            <div className="col-span-full text-center py-12 space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No LoRAs match your search</p>
              <p className="text-xs text-slate-400">
                Try a different keyword or download more LoRAs via the Civitai Hub.
              </p>
            </div>
          ) : (
            filteredLoras.map((lora, idx) => {
              const inStack = activeLoras.some((l) => l.name === lora.name);
              return (
                <div
                  key={idx}
                  className={`bg-slate-900/70 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                    inStack
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] bg-cyan-950/20"
                      : "border-slate-800 hover:border-purple-500/50 hover:bg-slate-900"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2" title={lora.name}>
                        {lora.name}
                      </h4>
                      <span className="shrink-0 text-[10px] font-mono text-slate-400 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                        {lora.size_mb} MB
                      </span>
                    </div>

                    {lora.is_active && (
                      <span className="inline-block text-[9px] font-mono font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/60 px-2 py-0.5 rounded-full">
                        ⚡ ACTIVE IN VRAM
                      </span>
                    )}

                    {lora.trigger_words && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] text-purple-300/80 mb-0.5">
                          <span>Trigger Words:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyTrigger(lora.trigger_words!)}
                              className="hover:text-white transition"
                              title="Copy triggers"
                            >
                              {copiedTrigger === lora.trigger_words ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => onInjectTriggers(lora.trigger_words!)}
                              className="text-cyan-300 hover:text-white font-bold transition ml-1"
                              title="Insert into active prompt"
                            >
                              + Insert
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-mono text-purple-200 bg-black/50 p-1.5 rounded-lg border border-purple-500/30 line-clamp-2">
                          {lora.trigger_words}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => onToggleLora(lora)}
                      disabled={!inStack && activeLoras.length >= 3}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                        inStack
                          ? "bg-rose-500/20 border border-rose-500/60 text-rose-300 hover:bg-rose-500/30"
                          : activeLoras.length >= 3
                          ? "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
                          : "bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/60 text-purple-200"
                      }`}
                    >
                      {inStack ? (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Stack</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Quick URL Downloader & Local Upload */}
        <div className="px-5 sm:px-6 py-3.5 bg-black/80 border-t border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onBrowseLocal}
              disabled={isUploadingLocal || !isConnected}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isUploadingLocal ? `Uploading (${uploadProgress}%)` : "Browse Local File (.safetensors)"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Civitai URL or ID"
              value={civitaiUrl}
              onChange={(e) => setCivitaiUrl(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-full sm:w-60"
            />
            <button
              onClick={onQuickDownload}
              disabled={!civitaiUrl || !isConnected || isDownloading}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0"
            >
              {isDownloading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
