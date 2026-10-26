"use client";

import React, { useState, useRef } from "react";
import {
  Sparkles,
  Zap,
  Image as ImageIcon,
  Sliders,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
  Cpu,
  Flame,
  Plus,
} from "lucide-react";
import LiveAiModelSelector from "./LiveAiModelSelector";
import PromptActionButtons from "./PromptActionButtons";
import { LiveAiModel } from "@/app/lib/aiModelRegistry";
import {
  isNsfwContent,
  isImageFileNsfw,
  isNsfwModeActive,
  triggerNsfwBlockedModal,
} from "@/app/lib/nsfwFilter";

export interface AiModelConfig {
  id: string;
  name: string;
  provider: string;
  badge: string;
  type: "text2img" | "img2img" | "both";
  latency: string;
  status: "active" | "ready" | "quota_notice" | "coming_soon";
  description: string;
  accentColor: string;
}

const AVAILABLE_MODELS: AiModelConfig[] = [
  {
    id: "mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF",
    name: "Qwen2-VL 2B Junior Copilot",
    provider: "mradermacher / Hugging Face",
    badge: "⚡ JUNIOR VL • LOADS FIRST",
    type: "both",
    latency: "~1.1s",
    status: "active",
    description: "Abliterated Junior Vision-Language model (2B parameter GGUF) for ultra-fast visual comprehension, prompt rewriting, and image reasoning. Prioritized to load first before heavier DiT engines.",
    accentColor: "from-cyan-400 to-blue-500",
  },
  {
    id: "nano-banana",
    name: "Nano Banana Turbo",
    provider: "Nano Neural Edge",
    badge: "⚡ Sub-2s Ultra Fast",
    type: "both",
    latency: "~1.5s",
    status: "active",
    description: "Compact ultra-fast neural generator optimized for rapid concepting and real-time generation.",
    accentColor: "from-amber-400 to-yellow-500",
  },
  {
    id: "google-imagen",
    name: "Google Imagen 3",
    provider: "Google AI Studio",
    badge: "Photorealistic DiT",
    type: "text2img",
    latency: "~3.8s",
    status: "active",
    description: "Google AI Studio premier high-fidelity neural image synthesis with superb text rendering and realism.",
    accentColor: "from-blue-500 to-indigo-500",
  },
  {
    id: "qwen-cloud",
    name: "Alibaba Qwen-Image",
    provider: "Alibaba ModelStudio",
    badge: "Native Qwen DiT",
    type: "both",
    latency: "~5.0s",
    status: "active",
    description: "Alibaba DashScope official cloud API for text-to-image synthesis and precision image-to-image editing.",
    accentColor: "from-orange-500 to-red-500",
  },
  {
    id: "cf-lucid",
    name: "Cloudflare Lucid Origin",
    provider: "Leonardo / Workers AI",
    badge: "Edge Serverless",
    type: "text2img",
    latency: "~3.0s",
    status: "active",
    description: "Serverless Workers AI running Leonardo Lucid Origin at edge GPUs worldwide with zero cold start.",
    accentColor: "from-cyan-500 to-blue-500",
  },
  {
    id: "cf-flux",
    name: "Flux 1 Schnell",
    provider: "Black Forest Labs / Cloudflare",
    badge: "12B DiT Architecture",
    type: "text2img",
    latency: "~3.5s",
    status: "active",
    description: "State-of-the-art 12-billion parameter rectified flow transformer for supreme prompt adherence.",
    accentColor: "from-purple-500 to-indigo-500",
  },
  {
    id: "qwen-kaggle",
    name: "Dual Tesla T4 Kaggle",
    provider: "Local Kaggle Engine",
    badge: "LoRA Fusing Vault",
    type: "img2img",
    latency: "~18s",
    status: "ready",
    description: "Dual Nvidia Tesla T4 GPU cluster with 5 TB Google Drive LoRA storage and on-the-fly weights merging.",
    accentColor: "from-emerald-500 to-teal-500",
  },
  {
    id: "midjourney-v6",
    name: "Midjourney v6.1 API",
    provider: "Midjourney Bridge",
    badge: "Photorealistic Art",
    type: "both",
    latency: "~25s",
    status: "coming_soon",
    description: "Unrivaled cinematic lighting and hyper-detailed art synthesis. Ready to plug in your custom token.",
    accentColor: "from-pink-500 to-rose-500",
  },
  {
    id: "ideogram-v2",
    name: "Ideogram v2 Turbo",
    provider: "Ideogram AI",
    badge: "Supreme Typography",
    type: "text2img",
    latency: "~8s",
    status: "coming_soon",
    description: "Flawless text rendering in generated images, posters, banners, and logos. Custom slot ready.",
    accentColor: "from-fuchsia-500 to-purple-600",
  },
];

interface AiGeneratorHubProps {
  onSendToStudio?: (imageUrl: string, promptText: string) => void;
}

export default function AiGeneratorHub({ onSendToStudio }: AiGeneratorHubProps) {
  // Mode selection: "generate" (Text-to-Image) vs "edit" (Image-to-Image)
  const [activeMode, setActiveMode] = useState<"generate" | "edit">("generate");
  const [selectedModel, setSelectedModel] = useState<string>("mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF");

  // Inputs
  const [prompt, setPrompt] = useState<string>("Cyberpunk street samurai in neon rain, volumetric fog, 8k masterpiece");
  const [negativePrompt, setNegativePrompt] = useState<string>("blurry, deformed, bad anatomy, low quality");
  const [aspectRatio, setAspectRatio] = useState<string>("1024*1024");
  const [seed, setSeed] = useState<number | "">("");
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  // States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    const nsfwMode = isNsfwModeActive();
    if (!nsfwMode && isNsfwContent(prompt)) {
      triggerNsfwBlockedModal();
      return;
    }
    setIsEnhancingPrompt(true);
    try {
      const activeCopilot = typeof window !== "undefined" ? (localStorage.getItem("sentinel_active_copilot") || "mistral") : "mistral";
      const res = await fetch("/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: activeCopilot, nsfw_enabled: nsfwMode }),
      });
      if (res.status === 403) {
        triggerNsfwBlockedModal();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.enhancedPrompt) {
          setPrompt(data.enhancedPrompt);
        }
      }
    } catch (e) {
      console.warn("Failed to enhance prompt:", e);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter models according to selected mode
  const filteredModels = AVAILABLE_MODELS.filter((m) => {
    if (activeMode === "generate") return m.type === "text2img" || m.type === "both";
    return m.type === "img2img" || m.type === "both";
  });

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isNsfwModeActive() && isImageFileNsfw(file.name)) {
        triggerNsfwBlockedModal();
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExecute = async () => {
    if (!prompt.trim()) {
      setErrorMessage("Please enter an image prompt.");
      return;
    }
    const nsfwMode = isNsfwModeActive();
    if (!nsfwMode && (isNsfwContent(prompt) || isNsfwContent(negativePrompt))) {
      triggerNsfwBlockedModal();
      return;
    }

    if (activeMode === "edit" && !sourceImage) {
      setErrorMessage("Please upload a source image for Image-to-Image editing.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    const startTime = Date.now();

    try {
      let endpoint = "/api/generate";
      const payload: Record<string, any> = {
        prompt: prompt.trim(),
        negative_prompt: negativePrompt,
        model: selectedModel,
        mode: activeMode,
        size: aspectRatio,
        seed: seed === "" ? null : Number(seed),
        nsfw_enabled: nsfwMode,
      };

      if (activeMode === "edit" && sourceImage) {
        payload.image_base64 = sourceImage;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 403 || data.error === "NSFW Blocked by Admin") {
        triggerNsfwBlockedModal();
        setIsGenerating(false);
        return;
      }

      if (!res.ok) {
        if (data.code === "QUOTA_EXHAUSTED" || res.status === 402) {
          throw new Error(
            data.error || "Alibaba Cloud quota exhausted on free tier. Switched recommendation to Nano Banana."
          );
        }
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      const outputImg = data.image_url || data.image_base64;
      if (!outputImg) {
        throw new Error("No image data returned from generator engine.");
      }

      setGeneratedImage(outputImg);
      setLastLatency(Date.now() - startTime);
      setLastModelUsed(data.model || selectedModel);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3.5 sm:p-6 space-y-6 animate-fadeIn">
      {/* ── Top Header Banner ── */}
      <div className="bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18)] rounded-3xl p-5 sm:p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 flex-1 min-w-0 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400 text-cyan-300 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
            <span>Multi-Model AI Generator Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            AI Image Generator &amp; Precision Editor Hub
          </h2>
          <p className="text-xs sm:text-sm text-cyan-200/80 leading-relaxed">
            Generate and edit images instantly across Alibaba Qwen Cloud, Nano Banana Turbo, and Cloudflare Workers AI edge.
            Switch models freely and pipe results directly into the Studio Editor.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex flex-wrap md:flex-col gap-2 z-10 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-2 bg-black/80 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] px-3.5 py-2 rounded-xl text-xs">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-slate-300">Nano Banana:</span>
            <span className="text-amber-300 font-extrabold font-mono drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]">1.5s Ultra-Fast</span>
          </div>
          <div className="flex items-center gap-2 bg-black/80 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)] px-3.5 py-2 rounded-xl text-xs">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">Qwen Cloud:</span>
            <span className="text-cyan-300 font-extrabold font-mono drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">qwen-image / edit</span>
          </div>
        </div>
      </div>

      {/* ── Mode Selection Toolbar ── */}
      <div className="flex items-center gap-2 bg-black/80 p-1.5 rounded-2xl border border-cyan-500/35 shadow-[0_0_18px_rgba(6,182,212,0.18)] w-full sm:w-max">
        <button
          onClick={() => setActiveMode("generate")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 h-9 rounded-xl text-xs font-bold transition-all ${
            activeMode === "generate"
              ? "bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>🎨 Text-to-Image Generation</span>
        </button>
        <button
          onClick={() => setActiveMode("edit")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 h-9 rounded-xl text-xs font-bold transition-all ${
            activeMode === "edit"
              ? "bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>✨ Image-to-Image Editing</span>
        </button>
      </div>

      {/* ── Live AI Providers Platforms & Free Tier Model Selector ── */}
      <LiveAiModelSelector
        activeModelId={selectedModel}
        onSelectModel={(m: LiveAiModel) => setSelectedModel(m.id)}
        mode={activeMode}
      />

      {/* ── Main Studio Grid: Controls & Output ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 bg-slate-950/85 border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.18)] hover:shadow-[0_0_35px_rgba(6,182,212,0.28)] rounded-2xl p-5 space-y-4 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
            <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              {activeMode === "generate" ? "Text-to-Image Parameters" : "Image-to-Image Parameters"}
            </span>
            <span className="text-[11px] text-cyan-300 font-mono font-bold">
              Engine: <strong className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">{selectedModel}</strong>
            </span>
          </div>

          {/* Edit Mode: Source Image Upload Box */}
          {activeMode === "edit" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Source Image to Edit</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 flex items-center justify-center gap-3 cursor-pointer bg-slate-950/60 transition"
              >
                {sourceImage ? (
                  <div className="flex items-center gap-3 w-full">
                    <img src={sourceImage} alt="Source" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 truncate">
                      <p className="text-xs font-semibold text-slate-200">Image Loaded</p>
                      <p className="text-[10px] text-slate-400">Click to replace source image</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs">Click or drop image to edit</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleSourceUpload} accept="image/*" className="hidden" />
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-white">Prompt</label>
              <PromptActionButtons
                prompt={prompt}
                onUpdatePrompt={setPrompt}
                negativePrompt={negativePrompt}
                onUpdateNegativePrompt={setNegativePrompt}
                onEnhance={handleEnhancePrompt}
                isEnhancing={isEnhancingPrompt}
              />
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what to generate or modify..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-400">Negative Prompt</label>
              <PromptActionButtons
                prompt={prompt}
                onUpdatePrompt={setPrompt}
                negativePrompt={negativePrompt}
                onUpdateNegativePrompt={setNegativePrompt}
                isNegativeBar={true}
              />
            </div>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g. cartoon, anime, clay, silicon, plastic, doll, CGI, bad anatomy, blurry..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Resolution & Seed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Resolution</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 h-9 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="1024*1024">Square (1024x1024)</option>
                <option value="1280*720">Landscape (1280x720)</option>
                <option value="720*1280">Portrait (720x1280)</option>
                <option value="768*768">Compact (768x768)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Seed</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Random"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 h-9 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                  title="Randomize seed"
                  className="px-2.5 h-9 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl text-slate-300 transition"
                >
                  🎲
                </button>
              </div>
            </div>
          </div>

          {/* Error Message Diagnostic */}
          {errorMessage && (
            <div className="bg-rose-950/70 border border-rose-800/80 p-3 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Diagnostic</p>
                <p className="text-[11px] text-rose-300 mt-0.5">{errorMessage}</p>
                {errorMessage.includes("quota") && (
                  <button
                    onClick={() => {
                      setSelectedModel("nano-banana");
                      setErrorMessage("");
                    }}
                    className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition"
                  >
                    ⚡ Switch to Nano Banana Turbo (Instant)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Equal Size Action Buttons Row (UI-UX-PRO-MAX Standard) ── */}
          <div className="pt-2 border-t border-cyan-500/30 flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={isGenerating}
              className={`flex-1 h-10 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                isGenerating
                  ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                  : "bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-500 hover:from-cyan-300 hover:via-teal-200 hover:to-fuchsia-400 text-black shadow-[0_0_25px_rgba(6,182,212,0.55)] hover:shadow-[0_0_35px_rgba(236,72,153,0.7)] animate-neon-button"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>{activeMode === "generate" ? "Generate Image" : "Apply Image Edit"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrompt("");
                setNegativePrompt("");
                setSourceImage(null);
                setGeneratedImage(null);
                setErrorMessage("");
              }}
              title="Reset fields"
              className="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Right Preview & Pipe Canvas: 7 cols */}
        <div className="lg:col-span-7 bg-slate-950/85 border-2 border-purple-500/40 hover:border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_45px_rgba(168,85,247,0.35)] rounded-2xl p-5 flex flex-col justify-between min-h-[460px] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
            <span className="text-xs font-extrabold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400 animate-pulse" />
              Generator Output Preview
            </span>
            {lastLatency !== null && (
              <span className="text-[11px] font-mono bg-emerald-950/80 border border-emerald-400/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] px-2.5 py-0.5 rounded-full font-bold">
                ⚡ Generated in {(lastLatency / 1000).toFixed(2)}s &bull; {lastModelUsed}
              </span>
            )}
          </div>

          {/* Canvas Display */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[360px] relative overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-full animate-pulse">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">Rendering with {selectedModel}...</p>
                  <p className="text-xs text-slate-500 mt-1">Multi-modal diffusion pipeline executing at edge</p>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="flex flex-col items-center justify-center max-h-[440px]">
                <img
                  src={generatedImage}
                  alt="AI Generated"
                  className="max-h-[400px] w-auto object-contain rounded-xl shadow-2xl border border-slate-800"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600 text-center">
                <ImageIcon className="w-12 h-12 text-slate-700" />
                <p className="text-xs text-slate-400">Output will appear here after generation</p>
                <p className="text-[11px] text-slate-600">Select Nano Banana Turbo or Alibaba Qwen and click Generate</p>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {generatedImage && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-mono">1024x1024 &bull; PNG Full Quality</span>
              <div className="flex items-center gap-2">
                {onSendToStudio && (
                  <button
                    onClick={() => onSendToStudio(generatedImage, prompt)}
                    className="flex items-center gap-1.5 px-3.5 h-9 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    <span>Send to Studio &amp; LoRAs</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                )}
                <a
                  href={generatedImage}
                  download={`ai_generator_${Date.now()}.png`}
                  className="flex items-center gap-1.5 px-4 h-9 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs transition shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
