"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Lightbulb,
  ShieldAlert,
  Copy,
  Trash2,
  Check,
  RefreshCw,
  Dices,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  generateSmartNegativePrompt,
  getRandomPromptArchetype,
  PROMPT_ARCHETYPES,
} from "@/app/lib/promptIntelligence";

interface PromptActionButtonsProps {
  prompt: string;
  onUpdatePrompt: (newPrompt: string) => void;
  negativePrompt?: string;
  onUpdateNegativePrompt?: (newNegativePrompt: string) => void;
  onEnhance?: () => Promise<void> | void;
  isEnhancing?: boolean;
  isNegativeBar?: boolean;
  className?: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function PromptActionButtons({
  prompt,
  onUpdatePrompt,
  negativePrompt,
  onUpdateNegativePrompt,
  onEnhance,
  isEnhancing = false,
  isNegativeBar = false,
  className = "",
  showToast,
}: PromptActionButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingNegative, setIsGeneratingNegative] = useState(false);
  const [showArchetypesDropdown, setShowArchetypesDropdown] = useState(false);
  const [negativeInsight, setNegativeInsight] = useState<string | null>(null);

  // 1. Copy Prompt text to clipboard
  const handleCopy = async () => {
    const textToCopy = isNegativeBar ? (negativePrompt || "") : prompt;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (showToast) showToast("Copied to clipboard", "info");
    } catch (e) {
      console.warn("Clipboard copy error:", e);
    }
  };

  // 2. Clear current field
  const handleClear = () => {
    if (isNegativeBar) {
      if (onUpdateNegativePrompt) onUpdateNegativePrompt("");
    } else {
      onUpdatePrompt("");
    }
    if (showToast) showToast("Cleared", "info");
  };

  // 3. Roll Random Inspiring Prompt Archetype
  const handleRandomInspire = () => {
    const item = getRandomPromptArchetype();
    onUpdatePrompt(item.prompt);
    if (onUpdateNegativePrompt && item.suggestedNegative) {
      onUpdateNegativePrompt(item.suggestedNegative);
    }
    if (showToast) {
      showToast(`✨ Generated: ${item.name}`, "success");
    }
  };

  // 4. Smart Negative Prompt Generator (Analyzes Positive Prompt)
  const handleSmartNegativeGeneration = async () => {
    if (!onUpdateNegativePrompt) return;
    if (!prompt.trim()) {
      if (showToast) showToast("Enter a positive prompt first to analyze aesthetics", "info");
      return;
    }

    setIsGeneratingNegative(true);
    try {
      // First, get instantaneous smart analysis from local ontology
      const localResult = generateSmartNegativePrompt(prompt);

      // Attempt AI enrichment from active serverless copilot
      const activeCopilot = localStorage.getItem("sentinel_active_copilot") || "mistral";
      const res = await fetch("/api/sentinel/negative-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: activeCopilot,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalNegatives = data.negativePrompt || localResult.negativePrompt;
        onUpdateNegativePrompt(finalNegatives);
        setNegativeInsight(data.explanation || localResult.explanation);
        if (showToast) {
          showToast(`🛡️ Tailored Negative Prompt generated! (${data.detectedAesthetics?.join(", ") || "Analyzed"})`, "success");
        }
      } else {
        onUpdateNegativePrompt(localResult.negativePrompt);
        setNegativeInsight(localResult.explanation);
        if (showToast) {
          showToast("🛡️ Smart Negative Prompt generated!", "success");
        }
      }
    } catch (e) {
      const fallback = generateSmartNegativePrompt(prompt);
      onUpdateNegativePrompt(fallback.negativePrompt);
      setNegativeInsight(fallback.explanation);
      if (showToast) showToast("🛡️ Smart Negative Prompt generated!", "success");
    } finally {
      setIsGeneratingNegative(false);
      setTimeout(() => setNegativeInsight(null), 8000);
    }
  };

  // If this is for the Negative Prompt Bar
  if (isNegativeBar) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {onUpdateNegativePrompt && (
          <button
            type="button"
            onClick={handleSmartNegativeGeneration}
            disabled={isGeneratingNegative || !prompt.trim()}
            className="group relative flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 hover:border-amber-400 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_14px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-40"
            title="Smart Analysis: Deduce exact negative styles (e.g. cartoon, anime, clay, silicon) from positive prompt"
          >
            <ShieldAlert className={`w-3 h-3 ${isGeneratingNegative ? "animate-spin text-amber-400" : "text-amber-400 group-hover:scale-110 transition-transform"}`} />
            <span>{isGeneratingNegative ? "Analyzing..." : "🛡️ Smart Auto-Negative"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          disabled={!negativePrompt}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition active:scale-95 disabled:opacity-30"
          title="Copy negative prompt"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!negativePrompt}
          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition disabled:opacity-30"
          title="Clear negative prompt"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        {negativeInsight && (
          <span className="text-[10px] text-amber-300/90 font-mono animate-fadeIn flex items-center gap-1">
            <Info className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[280px] sm:max-w-md">{negativeInsight}</span>
          </span>
        )}
      </div>
    );
  }

  // Standard Positive Prompt Bar Buttons
  return (
    <div className={`relative flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* 1. Prompt Enhancer Button */}
      {onEnhance && (
        <button
          type="button"
          onClick={onEnhance}
          disabled={isEnhancing || !prompt.trim()}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/60 hover:border-cyan-400 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.25)] hover:shadow-[0_0_15px_rgba(6,182,212,0.45)] transition active:scale-95 disabled:opacity-40"
          title="AI Enhance Prompt: Adds rich textures, cinematic lighting, and composition depth"
        >
          <Sparkles className={`w-3 h-3 ${isEnhancing ? "animate-spin text-cyan-400" : "fill-cyan-400 text-cyan-400"}`} />
          <span>{isEnhancing ? "Enhancing..." : "⚡ AI Enhance"}</span>
        </button>
      )}

      {/* 2. Prompt Generator / Inspire Archetypes Dropdown */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={handleRandomInspire}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:text-white bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/50 hover:border-purple-400 rounded-lg shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_14px_rgba(168,85,247,0.4)] transition active:scale-95"
          title="Randomly generate masterwork prompt + smart negative combo"
        >
          <Dices className="w-3 h-3 text-purple-400" />
          <span>🎲 Inspire</span>
        </button>
        <button
          type="button"
          onClick={() => setShowArchetypesDropdown((prev) => !prev)}
          className="px-1 py-1 text-purple-300 hover:text-white bg-purple-950/70 border-y border-r border-purple-500/50 rounded-r-lg transition -ml-1 text-[10px]"
          title="Browse Prompt Archetypes"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Archetypes Dropdown Menu */}
        {showArchetypesDropdown && (
          <div className="absolute left-0 mt-1 w-64 bg-slate-950 border border-purple-500/40 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn backdrop-blur-xl">
            <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider px-2 py-1 border-b border-purple-500/20 flex items-center justify-between">
              <span>Master Prompt Presets</span>
              <button
                onClick={() => setShowArchetypesDropdown(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
              {PROMPT_ARCHETYPES.map((arch) => (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => {
                    onUpdatePrompt(arch.prompt);
                    if (onUpdateNegativePrompt && arch.suggestedNegative) {
                      onUpdateNegativePrompt(arch.suggestedNegative);
                    }
                    setShowArchetypesDropdown(false);
                    if (showToast) showToast(`Loaded: ${arch.name}`, "success");
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-950/60 text-xs text-slate-200 transition group"
                >
                  <p className="font-semibold text-purple-200 group-hover:text-purple-300 truncate">
                    {arch.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{arch.category}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Smart Negative Generator from Positive Button */}
      {onUpdateNegativePrompt && (
        <button
          type="button"
          onClick={handleSmartNegativeGeneration}
          disabled={isGeneratingNegative || !prompt.trim()}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 hover:border-amber-400 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_14px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-40"
          title="Analyze positive prompt & populate negative prompt bar with unwanted styles to suppress"
        >
          <ShieldAlert className={`w-3 h-3 ${isGeneratingNegative ? "animate-spin text-amber-400" : "text-amber-400"}`} />
          <span>{isGeneratingNegative ? "Analyzing..." : "🛡️ Auto-Negative"}</span>
        </button>
      )}

      {/* 4. Copy Prompt */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={!prompt}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition active:scale-95 disabled:opacity-30"
        title="Copy positive prompt"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>

      {/* 5. Clear Prompt */}
      <button
        type="button"
        onClick={handleClear}
        disabled={!prompt}
        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition disabled:opacity-30"
        title="Clear prompt"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
