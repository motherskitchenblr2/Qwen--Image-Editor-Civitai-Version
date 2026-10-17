"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Layers,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Dice5,
  ExternalLink,
  Info,
  ChevronDown,
} from "lucide-react";
import LiveAiModelSelector from "@/app/components/LiveAiModelSelector";
import PromptActionButtons from "@/app/components/PromptActionButtons";
import { LiveAiModel } from "@/app/lib/aiModelRegistry";
import { LoRAItem, BackendLoRA } from "./LoraModal";

interface ControlPanelProps {
  studioMode: "edit" | "generate";
  setStudioMode: (mode: "edit" | "generate") => void;
  selectedStudioModel: string;
  setSelectedStudioModel: (id: string) => void;
  prompt: string;
  setPrompt: (v: string | ((prev: string) => string)) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string | ((prev: string) => string)) => void;
  handleEnhancePrompt: () => void;
  isEnhancingPrompt: boolean;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
  trueCfgScale: number;
  setTrueCfgScale: (v: number) => void;
  guidanceScale: number;
  setGuidanceScale: (v: number) => void;
  steps: number;
  setSteps: (v: number) => void;
  seed: number | "";
  setSeed: (v: number | "") => void;
  activeLoras: LoRAItem[];
  setActiveLoras: React.Dispatch<React.SetStateAction<LoRAItem[]>>;
  availableLoras: BackendLoRA[];
  onOpenLoraModal: () => void;
  handleFuseLora: (loras?: LoRAItem[]) => void;
  handleUnloadLoras: () => void;
  isFusingLora: boolean;
  fusedStatusMessage: string;
  isConnected: boolean;
  isModelReady: boolean;
  modelStatusMessage: string;
  handleGenerate: () => void;
  isGenerating: boolean;
  originalImage: string | null;
  generationStatusText: string;
  generationProgress: number;
  generationElapsed: number;
  onSwitchToCloud: () => void;
}

export default function ControlPanel({
  studioMode,
  setStudioMode,
  selectedStudioModel,
  setSelectedStudioModel,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  handleEnhancePrompt,
  isEnhancingPrompt,
  showToast,
  trueCfgScale,
  setTrueCfgScale,
  guidanceScale,
  setGuidanceScale,
  steps,
  setSteps,
  seed,
  setSeed,
  activeLoras,
  setActiveLoras,
  availableLoras,
  onOpenLoraModal,
  handleFuseLora,
  handleUnloadLoras,
  isFusingLora,
  fusedStatusMessage,
  isConnected,
  isModelReady,
  modelStatusMessage,
  handleGenerate,
  isGenerating,
  originalImage,
  generationStatusText,
  generationProgress,
  generationElapsed,
  onSwitchToCloud,
}: ControlPanelProps) {
  // Determine if the selected model is distilled / turbo
  const isDistilledOrTurbo =
    selectedStudioModel === "kaggle-gpu" ||
    selectedStudioModel === "nano-banana" ||
    selectedStudioModel === "cf-flux" ||
    selectedStudioModel.toLowerCase().includes("turbo") ||
    selectedStudioModel.toLowerCase().includes("schnell");

  // Calibrate defaults whenever model changes
  const applyModelCalibratedDefaults = (modelId: string) => {
    const isTurbo =
      modelId === "kaggle-gpu" ||
      modelId === "nano-banana" ||
      modelId === "cf-flux" ||
      modelId.toLowerCase().includes("turbo") ||
      modelId.toLowerCase().includes("schnell");

    if (isTurbo) {
      // Rapid/Distilled Pipeline: low step, low guidance
      if (steps > 12 || steps === 1) setSteps(6);
      if (trueCfgScale > 2.5) setTrueCfgScale(1.0);
      if (guidanceScale > 2.5) setGuidanceScale(1.0);
    } else {
      // Classical Diffusion Pipeline: 20-30 steps, 5.0-7.0 guidance
      if (steps <= 8 || steps === 1) setSteps(25);
      if (trueCfgScale <= 1.5) setTrueCfgScale(6.0);
      if (guidanceScale <= 1.5) setGuidanceScale(5.0);
    }
  };

  const handleModelChange = (model: LiveAiModel) => {
    setSelectedStudioModel(model.id);
    applyModelCalibratedDefaults(model.id);
  };

  // Step presets based on model family
  const stepPresets = isDistilledOrTurbo
    ? [
        { s: 4, label: "⚡ 4 Steps", sub: "Rapid (15s)" },
        { s: 6, label: "6 Steps", sub: "Balanced" },
        { s: 8, label: "8 Steps", sub: "High Quality" },
        { s: 12, label: "12 Steps", sub: "Max Detail" },
      ]
    : [
        { s: 15, label: "15 Steps", sub: "Fast Draft" },
        { s: 20, label: "20 Steps", sub: "Standard" },
        { s: 25, label: "25 Steps", sub: "High Quality" },
        { s: 30, label: "30 Steps", sub: "Ultra Detail" },
      ];

  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  const isGenerateDisabled =
    isGenerating ||
    (selectedStudioModel === "kaggle-gpu" && (!originalImage || !isConnected)) ||
    (studioMode === "edit" && !originalImage && selectedStudioModel !== "kaggle-gpu");

  const renderActionButton = (isMobileBar = false) => (
    <div className={`space-y-2 ${isMobileBar ? "w-full max-w-lg mx-auto" : "w-full"}`}>
      <button
        onClick={handleGenerate}
        disabled={isGenerateDisabled}
        title={
          studioMode === "edit" && !originalImage
            ? "Upload an image to enable editing"
            : undefined
        }
        className={`w-full h-11 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
          isGenerateDisabled
            ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
            : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 active:scale-[0.99]"
        }`}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
            <span>Synthesizing Diffusion...</span>
          </>
        ) : studioMode === "generate" ? (
          <>
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Generate Image</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-current" />
            <span>Apply Image Edit</span>
          </>
        )}
      </button>

      {studioMode === "edit" && !originalImage && (
        <p className="text-[11px] text-slate-400 text-center font-medium">
          Upload an image to enable editing
        </p>
      )}

      {/* Progress Bar & Status */}
      {isGenerating && (
        <div className="bg-black/90 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] p-2.5 rounded-2xl space-y-1.5 animate-neon-cyan">
          <div className="flex justify-between items-center text-xs">
            <span className="text-cyan-300 font-bold truncate flex-1 min-w-0 pr-2">
              {generationStatusText}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-emerald-300 text-[11px] font-mono font-bold">
                {generationElapsed}s
              </span>
              <span className="text-white font-mono font-extrabold">{generationProgress}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
            <div
              className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              style={{ width: `${Math.max(4, Math.min(100, generationProgress))}%` }}
            />
          </div>
          {generationElapsed > 45 && (
            <div className="pt-1.5 border-t border-amber-500/30 flex items-center justify-between text-[11px] text-amber-300">
              <span className="truncate pr-2">Taking longer than expected (~45s+).</span>
              <button
                type="button"
                onClick={onSwitchToCloud}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/60 rounded text-[10px] font-bold text-amber-200 transition-colors flex-shrink-0"
              >
                ⚡ Switch to Cloud AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-full">
      {/* ── Studio Mode Segmented Switch (Aligned with Canvas Toolbar) ── */}
      <div className="min-h-[48px] h-12 flex items-center gap-1.5 bg-black/80 p-1.5 rounded-2xl border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.15)] w-full shrink-0">
        <button
          type="button"
          onClick={() => setStudioMode("generate")}
          className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            studioMode === "generate"
              ? "bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
              : "text-slate-300 hover:text-cyan-300"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>🎨 Generate Image</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioMode("edit")}
          className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            studioMode === "edit"
              ? "bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
              : "text-slate-300 hover:text-cyan-300"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>✨ Edit Image</span>
        </button>
      </div>

      {/* ── Main Controls Card ── */}
      <div className="flex flex-col gap-4 sm:gap-5 bg-slate-950/85 border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.18)] hover:shadow-[0_0_35px_rgba(6,182,212,0.28)] p-3.5 sm:p-5 rounded-3xl w-full max-w-full overflow-hidden transition-all duration-300">

      {/* ── AI Engine Model Selector ── */}
      <div className="space-y-1.5">
        <LiveAiModelSelector
          activeModelId={selectedStudioModel}
          onSelectModel={handleModelChange}
          mode={studioMode}
          compact={true}
        />
      </div>

      {/* ── Prompts Section with Consolidated Icon Toolbar ── */}
      <div className="space-y-3.5">
        {/* Main Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-black text-white flex items-center gap-1.5">
              <span>{studioMode === "generate" ? "Generation Prompt" : "Edit Prompt"}</span>
            </label>
            <PromptActionButtons
              prompt={prompt}
              onUpdatePrompt={setPrompt}
              negativePrompt={negativePrompt}
              onUpdateNegativePrompt={setNegativePrompt}
              onEnhance={handleEnhancePrompt}
              isEnhancing={isEnhancingPrompt}
              showToast={showToast}
            />
          </div>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              studioMode === "generate"
                ? "Describe the masterpiece to generate from scratch..."
                : "e.g. Turn the jacket into red leather, add cyberpunk neon highlights"
            }
            className="w-full bg-slate-900/90 border border-cyan-500/35 hover:border-cyan-400/70 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-300">Negative Prompt</label>
            <PromptActionButtons
              prompt={prompt}
              onUpdatePrompt={setPrompt}
              negativePrompt={negativePrompt}
              onUpdateNegativePrompt={setNegativePrompt}
              isNegativeBar={true}
              showToast={showToast}
            />
          </div>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="blurry, distorted, low quality, deformed, artifacts..."
            className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/40 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition"
          />
        </div>
      </div>

      {/* ── Collapsible Accordion Trigger (Mobile Only, Always Expanded on Desktop) ── */}
      <div className="pt-2 border-t border-cyan-500/30">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs font-bold text-slate-200 transition-all shadow-sm lg:hidden active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-cyan-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold tracking-wide">⚙️ Advanced Parameters &amp; Sliders</span>
          </span>
          <span className="flex items-center gap-2">
            {activeLoras.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/50 text-[10px] font-mono font-bold">
                {activeLoras.length} LoRA{activeLoras.length > 1 ? "s" : ""}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isAdvancedOpen ? "rotate-180 text-cyan-400" : ""}`} />
          </span>
        </button>

        {/* ── Advanced Content (Collapsible on Mobile, Expanded on Desktop) ── */}
        <div className={`${isAdvancedOpen ? "block" : "hidden"} lg:block space-y-4 pt-3 lg:pt-0`}>
          {/* ── LoRA Stack Management Section ── */}
          <div className="space-y-2.5 pt-2 border-t border-cyan-500/30 lg:border-t-0 lg:pt-0">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>LoRA Stacking</span>
            <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.2 rounded-full border border-purple-500/40">
              {activeLoras.length}/3
            </span>
          </label>
          <button
            onClick={onOpenLoraModal}
            className="text-xs text-cyan-300 hover:text-white font-bold flex items-center gap-1 transition"
          >
            <span>Manage Hub</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Active LoRA Chips / Weight Sliders */}
        {activeLoras.length === 0 ? (
          <div
            onClick={onOpenLoraModal}
            className="p-3 bg-black/60 border border-dashed border-purple-500/30 hover:border-purple-400 rounded-2xl cursor-pointer text-center space-y-1 transition group"
          >
            <p className="text-xs text-purple-200 font-bold group-hover:text-white transition">
              + Add LoRAs from Hub (27+ Cached)
            </p>
            <p className="text-[10px] text-slate-400">
              Stack up to 3 compatible LoRAs with independent weight controls.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeLoras.map((lora, idx) => (
              <div
                key={idx}
                className="bg-black/75 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)] p-2.5 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white truncate max-w-[190px]" title={lora.name}>
                    {lora.name}
                  </span>
                  <button
                    onClick={() => setActiveLoras((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-400 transition"
                    title="Remove from stack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Weight:</span>
                  <span className="text-purple-300 font-mono font-bold">{lora.scale}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={lora.scale}
                  onChange={(e) => {
                    const newScale = parseFloat(e.target.value);
                    setActiveLoras((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, scale: newScale } : item))
                    );
                  }}
                  className="w-full accent-purple-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ))}

            {/* Fuse & Unload Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleFuseLora(activeLoras)}
                disabled={isFusingLora || !isConnected || !isModelReady}
                title={
                  !isModelReady && isConnected
                    ? `GPU pipeline is warming up: ${modelStatusMessage}`
                    : "Fuse active LoRAs into GPU"
                }
                className="flex-1 py-1.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black text-xs font-black rounded-xl transition shadow-[0_0_18px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
              >
                {isFusingLora ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-black" />
                )}
                <span>
                  {isFusingLora
                    ? "Fusing..."
                    : !isModelReady && isConnected
                    ? "Warming Up..."
                    : "Fuse Stack into GPU"}
                </span>
              </button>
              <button
                onClick={handleUnloadLoras}
                disabled={isFusingLora || !isConnected}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Fused Status Message */}
        {fusedStatusMessage && (
          <div
            className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
              isFusingLora
                ? "bg-purple-950/80 border-purple-500/80 text-purple-200 shadow-sm"
                : "bg-emerald-950/80 border-emerald-500/80 text-emerald-200 shadow-sm"
            }`}
          >
            {isFusingLora ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{fusedStatusMessage}</span>
          </div>
        )}
      </div>

      {/* ── Calibrated Adaptive Sliders Section ── */}
      <div className="space-y-4 pt-2 border-t border-cyan-500/30">
        {/* True-CFG Scale */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white font-medium flex items-center gap-1">
              <span>CFG / Dynamic Scale</span>
              {isDistilledOrTurbo && (
                <span className="text-[10px] text-cyan-400 font-mono">(Calibrated 1.0 for Distilled)</span>
              )}
            </span>
            <span className="font-bold text-cyan-300 font-mono">{trueCfgScale}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max={isDistilledOrTurbo ? "3.0" : "8.0"}
            step="0.2"
            value={trueCfgScale}
            onChange={(e) => setTrueCfgScale(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Guidance Scale */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white font-medium flex items-center gap-1">
              <span>Guidance Scale</span>
              {isDistilledOrTurbo && (
                <span className="text-[10px] text-cyan-400 font-mono">(Calibrated 1.0)</span>
              )}
            </span>
            <span className="font-bold text-cyan-300 font-mono">{guidanceScale}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max={isDistilledOrTurbo ? "4.0" : "12.0"}
            step="0.2"
            value={guidanceScale}
            onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Inference Steps & Adaptive Quick Presets */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white font-medium">Inference Steps</span>
            <span className="font-bold text-cyan-300 font-mono">{steps}</span>
          </div>
          <input
            type="range"
            min={isDistilledOrTurbo ? "2" : "10"}
            max={isDistilledOrTurbo ? "20" : "50"}
            step="1"
            value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {stepPresets.map((preset) => (
              <button
                key={preset.s}
                type="button"
                onClick={() => setSteps(preset.s)}
                className={`py-1 px-1 rounded-xl text-center border transition-all ${
                  steps === preset.s
                    ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-black shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:text-white"
                }`}
              >
                <div className="text-[11px] font-bold leading-tight">{preset.label}</div>
                <div className="text-[9px] text-cyan-300/70 leading-tight">{preset.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seed input */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <label className="text-xs text-white font-medium flex items-center gap-1">
            <Dice5 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Seed</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Random"
              value={seed}
              onChange={(e) => setSeed(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="w-24 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
              className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950 border border-cyan-500/30 text-xs rounded-xl text-cyan-300 transition"
              title="Randomize seed"
            >
              🎲
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* ── Desktop Primary Action Button ── */}
      <div className="hidden lg:block pt-2 border-t border-cyan-500/30">
        {renderActionButton(false)}
      </div>
    </div>

    {/* ── Mobile Sticky Bottom Action Bar ── */}
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
      {renderActionButton(true)}
    </div>
  </div>
  );
}
