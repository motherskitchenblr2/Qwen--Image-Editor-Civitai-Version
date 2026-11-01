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
  Paintbrush,
  UserCheck,
  Scissors,
  Maximize2,
  Eraser,
  Wand2,
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
  selectedStudioProvider?: string;
  setSelectedStudioProvider?: (id: string) => void;
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
  selectedStudioProvider,
  setSelectedStudioProvider,
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
    if (setSelectedStudioProvider && model.providerId) {
      setSelectedStudioProvider(model.providerId);
    }
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

  // Collapsed by default on mobile so prompt and primary model selectors remain immediately accessible
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Studio Workflow Palette State
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<"lora" | "inpaint" | "face" | "background" | "upscale">("lora");
  const [inpaintBrushSize, setInpaintBrushSize] = useState<number>(24);
  const [inpaintModeActive, setInpaintModeActive] = useState<boolean>(false);
  const [faceRestoreActive, setFaceRestoreActive] = useState<boolean>(false);
  const [faceFidelity, setFaceFidelity] = useState<number>(0.8);
  const [bgUtilityMode, setBgUtilityMode] = useState<"none" | "remove" | "studio" | "cyberpunk" | "nature">("none");
  const [upscaleFactor, setUpscaleFactor] = useState<"off" | "2x" | "4x">("off");

  // Workflow Handlers
  const toggleInpaintMode = (active?: boolean) => {
    const next = active !== undefined ? active : !inpaintModeActive;
    setInpaintModeActive(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studio-inpaint-toggle", { detail: { active: next } }));
      if (next && window.innerWidth < 768) {
        window.dispatchEvent(new CustomEvent("switch-studio-mobile-view", { detail: "canvas" }));
      }
    }
  };

  const updateBrushSize = (size: number) => {
    setInpaintBrushSize(size);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studio-brush-radius", { detail: { radius: size } }));
    }
  };

  const handleClearMaskTrigger = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studio-clear-mask"));
    }
    showToast("Canvas inpaint mask cleared", "info");
  };

  const toggleFaceRestore = () => {
    const next = !faceRestoreActive;
    setFaceRestoreActive(next);
    if (next) {
      setPrompt((prev) => (prev.includes("CodeFormer") ? prev : `${prev}, CodeFormer face restoration, crisp photorealistic facial geometry, 8k eyes`));
      showToast(`👤 CodeFormer Face Restore active (fidelity: ${faceFidelity})`, "success");
    } else {
      showToast("Face Restore disabled", "info");
    }
  };

  const handleApplyBackground = (mode: "remove" | "studio" | "cyberpunk" | "nature") => {
    setBgUtilityMode(mode);
    if (mode === "remove") {
      setPrompt((prev) => `${prev}, transparent pure backdrop, clean studio cutout, isolated subject`);
      showToast("✂️ Applied background removal / cutout prompt tag", "success");
    } else if (mode === "studio") {
      setPrompt((prev) => `${prev}, clean professional photography studio backdrop, soft cinematic rim light`);
      showToast("✂️ Replaced backdrop with professional studio lighting", "success");
    } else if (mode === "cyberpunk") {
      setPrompt((prev) => `${prev}, cyberpunk neon metropolis backdrop, volumetric fog, high-contrast cyan magenta rim lighting`);
      showToast("✂️ Replaced backdrop with cyberpunk cityscape", "success");
    } else if (mode === "nature") {
      setPrompt((prev) => `${prev}, lush cinematic golden hour nature backdrop, soft bokeh`);
      showToast("✂️ Replaced backdrop with golden hour nature bokeh", "success");
    }
  };

  const handleToggleUpscale = (factor: "off" | "2x" | "4x") => {
    setUpscaleFactor(factor);
    if (factor !== "off") {
      if (steps < 8) setSteps(Math.min(steps + 4, 30));
      showToast(`🔍 ${factor} Super-Resolution Upscaling armed`, "success");
    } else {
      showToast("Upscaling disabled", "info");
    }
  };

  const isGenerateDisabled =
    isGenerating ||
    (selectedStudioModel === "kaggle-gpu" && !isConnected) ||
    (studioMode === "edit" && !originalImage);

  const renderActionButton = (isMobileBar = false) => (
    <div className={`space-y-2 ${isMobileBar ? "w-full max-w-lg mx-auto" : "w-full"}`}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerateDisabled}
        title={
          studioMode === "edit" && !originalImage
            ? "Upload an image to enable editing"
            : undefined
        }
        className={`w-full py-3.5 rounded-xl border text-sm flex flex-col items-center justify-center gap-0.5 transition ${
          isGenerateDisabled
            ? "border-slate-750 bg-slate-900/80 text-slate-350 font-medium cursor-not-allowed"
            : "border-cyan-500/50 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 active:scale-[0.99]"
        }`}
      >
        <span className="flex items-center gap-2 font-semibold">
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
        </span>
      </button>

      {studioMode === "edit" && !originalImage && (
        <p className="text-slate-400 text-xs font-normal text-center">
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
          {/* ── 🧰 Studio Workflow Palette ── */}
          <div className="space-y-3 pt-2 border-t border-cyan-500/30 lg:border-t-0 lg:pt-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center gap-1.5">
                <span className="text-sm">🧰</span>
                <span>Studio Workflow Palette</span>
              </label>
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Dual T4 Accelerated
              </span>
            </div>

            {/* 5-Tool Horizontal Scrollable Tab Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setActiveWorkflowTab("lora")}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeWorkflowTab === "lora"
                    ? "bg-purple-600/30 border border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>LoRA Fusion</span>
                {activeLoras.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-purple-500 text-black text-[9px] font-black flex items-center justify-center">
                    {activeLoras.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkflowTab("inpaint")}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeWorkflowTab === "inpaint"
                    ? "bg-rose-600/30 border border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                <span>Inpaint &amp; Erase</span>
                {inpaintModeActive && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkflowTab("face")}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeWorkflowTab === "face"
                    ? "bg-emerald-600/30 border border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Face Restore</span>
                {faceRestoreActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkflowTab("background")}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeWorkflowTab === "background"
                    ? "bg-amber-600/30 border border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Background</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkflowTab("upscale")}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeWorkflowTab === "upscale"
                    ? "bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upscale {upscaleFactor !== "off" ? `(${upscaleFactor})` : ""}</span>
              </button>
            </div>

            {/* Dynamic Tool Drawer Panel */}
            <div className="p-3.5 rounded-2xl bg-black/75 border border-slate-800/90 shadow-inner">
              {/* Tool 1: LoRA Fusion Stack */}
              {activeWorkflowTab === "lora" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>LoRA Fusion Stack</span>
                      <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.2 rounded-full border border-purple-500/40">
                        {activeLoras.length}/3
                      </span>
                    </span>
                    <button
                      onClick={onOpenLoraModal}
                      className="text-xs text-cyan-300 hover:text-white font-bold flex items-center gap-1 transition"
                    >
                      <span>Manage Hub</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

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
                            className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
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
                          className="flex-1 min-h-[44px] py-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black text-xs font-black rounded-xl transition shadow-[0_0_18px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                        >
                          {isFusingLora ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 fill-black" />
                          )}
                          <span>
                            {isFusingLora
                              ? "Fusing VRAM..."
                              : !isModelReady && isConnected
                              ? "Warming Up..."
                              : "Fuse Stack into GPU"}
                          </span>
                        </button>
                        <button
                          onClick={handleUnloadLoras}
                          disabled={isFusingLora || !isConnected}
                          className="min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
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
              )}

              {/* Tool 2: Inpaint & Erase */}
              {activeWorkflowTab === "inpaint" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                      <span>Canvas Inpainting Brush</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("switch-studio-mobile-view", { detail: "canvas" }));
                        }
                      }}
                      className="text-[11px] text-cyan-300 font-bold hover:underline lg:hidden"
                    >
                      Switch to Canvas 🖼️
                    </button>
                  </div>

                  {/* Brush Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleInpaintMode()}
                    className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      inpaintModeActive
                        ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                        : "bg-slate-900 border border-rose-500/40 text-rose-200 hover:bg-slate-850"
                    }`}
                  >
                    <Paintbrush className="w-4 h-4 text-rose-300" />
                    <span>{inpaintModeActive ? "✓ Brush Overlay Active (Click to Disable)" : "Enable Canvas Brush Overlay"}</span>
                  </button>

                  {/* Brush Size Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Brush Radius:</span>
                      <span className="font-mono font-bold text-rose-300">{inpaintBrushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="2"
                      value={inpaintBrushSize}
                      onChange={(e) => updateBrushSize(parseInt(e.target.value))}
                      className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>10px (Fine)</span>
                      <span>45px</span>
                      <span>80px (Broad)</span>
                    </div>
                  </div>

                  {/* Clear Mask Action Button */}
                  <button
                    type="button"
                    onClick={handleClearMaskTrigger}
                    className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Eraser className="w-3.5 h-3.5 text-rose-400" />
                    <span>Clear Canvas Mask</span>
                  </button>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    💡 Paint red mask directly on the canvas to selectively edit or erase that region.
                  </p>
                </div>
              )}

              {/* Tool 3: Face Restore & Clarity */}
              {activeWorkflowTab === "face" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CodeFormer &amp; GFPGAN Engine</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      faceRestoreActive
                        ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}>
                      {faceRestoreActive ? "ARMED" : "OFF"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFaceRestore}
                    className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      faceRestoreActive
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : "bg-slate-900 border border-emerald-500/40 text-emerald-200 hover:bg-slate-850"
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-300" />
                    <span>{faceRestoreActive ? "✓ Face Restoration Active" : "1-Click Enable Face Restoration"}</span>
                  </button>

                  {/* Fidelity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Restoration Fidelity:</span>
                      <span className="font-mono font-bold text-emerald-300">{faceFidelity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={faceFidelity}
                      onChange={(e) => setFaceFidelity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.1 (Creative)</span>
                      <span>0.8 (Recommended)</span>
                      <span>1.0 (Strict Identity)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tool 4: Background Utility */}
              {activeWorkflowTab === "background" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>Background Manipulation Utility</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyBackground("remove")}
                      className="min-h-[44px] p-2.5 rounded-xl bg-slate-900 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-400/60 text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1 transition"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>✂️ Remove BG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBackground("studio")}
                      className="min-h-[44px] p-2.5 rounded-xl bg-slate-900 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-400/60 text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1 transition"
                    >
                      <span>🏢 Studio Rimlight</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBackground("cyberpunk")}
                      className="min-h-[44px] p-2.5 rounded-xl bg-slate-900 hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-400/60 text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1 transition"
                    >
                      <span>🌆 Cyberpunk City</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBackground("nature")}
                      className="min-h-[44px] p-2.5 rounded-xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-400/60 text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1 transition"
                    >
                      <span>🌿 Golden Bokeh</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    💡 Instantly adjusts prompts to isolate subject or render realistic multi-environment backdrops.
                  </p>
                </div>
              )}

              {/* Tool 5: Upscale Engine */}
              {activeWorkflowTab === "upscale" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Super-Resolution Upscale Engine</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      upscaleFactor !== "off"
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}>
                      {upscaleFactor.toUpperCase()}
                    </span>
                  </div>

                  {/* 3-Way Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUpscale("off")}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition border ${
                        upscaleFactor === "off"
                          ? "bg-slate-800 border-cyan-400 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Native 1x
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUpscale("2x")}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition border ${
                        upscaleFactor === "2x"
                          ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      ⚡ 2x (2K)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUpscale("4x")}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition border ${
                        upscaleFactor === "4x"
                          ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      💎 4x (4K Ultra)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Dual T4 GPU multi-tile super-resolution with clarity preservation.
                  </p>
                </div>
              )}
            </div>
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

    {/* ── Mobile Sticky Bottom Action Bar (Streamlined, No Duplicate Badge, Safe Area Padding) ── */}
    <div className="fixed bottom-0 left-0 right-0 p-3 pb-4 pb-safe pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/90 z-40 lg:hidden shadow-[0_-12px_32px_rgba(0,0,0,0.9)]">
      <div className="w-full max-w-lg mx-auto">
        {renderActionButton(true)}
      </div>
    </div>
  </div>
  );
}
