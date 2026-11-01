"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Image as ImageIcon,
  Sliders,
  Download,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Maximize2,
  Ratio,
  Palette,
  Camera,
  Film,
  Compass,
} from "lucide-react";
import PromptActionButtons from "./PromptActionButtons";
import ImagePreviewModal, { PreviewMediaData } from "./ImagePreviewModal";
import {
  isNsfwContent,
  isNsfwModeActive,
  triggerNsfwBlockedModal,
} from "@/app/lib/nsfwFilter";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  group: "Speed" | "Quality";
  badge: string;
  latency: string;
  description: string;
  accent: string;
}

const ENGINE_MODELS: ModelOption[] = [
  // ── Speed Group ──
  {
    id: "pollinations/flux",
    name: "FLUX.1 Schnell Turbo",
    provider: "Pollinations.ai",
    group: "Speed",
    badge: "⚡ 12B Rectified Flow",
    latency: "~1.5s",
    description: "Ultra-fast 12B transformer for prompt adherence, crystal clarity, and immediate synthesis.",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    id: "pollinations/turbo",
    name: "SDXL Turbo Instant",
    provider: "Pollinations.ai",
    group: "Speed",
    badge: "1-Step Draft",
    latency: "~0.9s",
    description: "Rapid single-pass distillation for instant visual concept drafting and quick ideation.",
    accent: "from-amber-400 to-yellow-500",
  },
  // ── Quality Group ──
  {
    id: "pollinations/flux-realism",
    name: "FLUX Realism Photo",
    provider: "Pollinations.ai",
    group: "Quality",
    badge: "DSLR Cinema 8K",
    latency: "~3.2s",
    description: "DSLR camera emulation with authentic skin pores, volumetric natural light, and lens physics.",
    accent: "from-emerald-400 to-teal-500",
  },
  {
    id: "pollinations/midjourney",
    name: "Midjourney v6 Emulation",
    provider: "Pollinations.ai",
    group: "Quality",
    badge: "Fine Art Lighting",
    latency: "~3.8s",
    description: "Dramatic cinematic compositions, rich art color grading, and award-winning atmosphere.",
    accent: "from-purple-500 to-indigo-500",
  },
  {
    id: "pollinations/flux-anime",
    name: "FLUX Anime & Manga Studio",
    provider: "Pollinations.ai",
    group: "Quality",
    badge: "Shinkai Cel Style",
    latency: "~2.8s",
    description: "Vibrant anime illustration with sharp linework, cel shading, and atmospheric background glow.",
    accent: "from-pink-400 to-rose-500",
  },
  {
    id: "pollinations/flux-3d",
    name: "FLUX 3D Render Master",
    provider: "Pollinations.ai",
    group: "Quality",
    badge: "Octane / CGI 3D",
    latency: "~3.5s",
    description: "Hyper-detailed isometric 3D models, smooth clay textures, and raytraced CGI asset styling.",
    accent: "from-teal-400 to-cyan-500",
  },
  {
    id: "pollinations/any-dark",
    name: "Any-Dark Cyberpunk Noir",
    provider: "Pollinations.ai",
    group: "Quality",
    badge: "Neon Rain Noir",
    latency: "~2.6s",
    description: "Deep shadows, wet asphalt reflections, neon glow, and dystopian cyberpunk aesthetics.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "google-imagen",
    name: "Google Imagen 3",
    provider: "Google AI Studio",
    group: "Quality",
    badge: "Frontier Vision DiT",
    latency: "~4.0s",
    description: "Google's premier high-resolution diffusion model with precise typographic accuracy.",
    accent: "from-blue-500 to-cyan-400",
  },
  {
    id: "qwen-cloud",
    name: "Alibaba Qwen-Image",
    provider: "Alibaba ModelStudio",
    group: "Quality",
    badge: "Native Qwen DiT",
    latency: "~4.5s",
    description: "Official Alibaba DashScope diffusion endpoint for photorealistic text-to-image synthesis.",
    accent: "from-orange-500 to-amber-500",
  },
];

const ASPECT_RATIOS = [
  { id: "1024*1024", label: "1:1", name: "Square", sub: "1024×1024", icon: "⏹️" },
  { id: "720*1280", label: "9:16", name: "Story", sub: "720×1280", icon: "📱" },
  { id: "1280*720", label: "16:9", name: "Cinema", sub: "1280×720", icon: "🖥️" },
  { id: "896*1120", label: "4:5", name: "Portrait", sub: "896×1120", icon: "🖼️" },
  { id: "1152*768", label: "3:2", name: "Classic", sub: "1152×768", icon: "📷" },
];

const STYLE_PRESETS = [
  {
    name: "Photorealistic",
    suffix: ", raw 8k dslr photo, shot on 85mm f/1.4 lens, natural skin micro-texture, depth of field, volumetric soft lighting",
    icon: Camera,
  },
  {
    name: "Cyberpunk",
    suffix: ", neon cyberpunk noir aesthetic, rainy reflective streets, holographic illumination, chromatic aberration, cinematic",
    icon: Zap,
  },
  {
    name: "Cinematic Anime",
    suffix: ", makoto shinkai style, vibrant anime visual, expressive lighting, crisp cel shading, 4k digital anime art",
    icon: Film,
  },
  {
    name: "Digital Art",
    suffix: ", award-winning digital concept art, octane render, intricate fantasy details, dramatic composition, trending on artstation",
    icon: Palette,
  },
  {
    name: "Analog Film",
    suffix: ", 35mm vintage kodak portra 400 film grain, warm nostalgic tones, light leaks, natural candid composition",
    icon: Compass,
  },
  {
    name: "Dark Fantasy",
    suffix: ", dark fantasy gothic aesthetic, ethereal mist, dramatic shadows, moody chiaroscuro lighting, epic atmosphere",
    icon: Sparkles,
  },
];

interface AiGeneratorHubProps {
  onSendToStudio?: (imageUrl: string, promptText: string) => void;
}

export default function AiGeneratorHub({ onSendToStudio }: AiGeneratorHubProps) {
  const [selectedModel, setSelectedModel] = useState<string>("pollinations/flux");
  const [prompt, setPrompt] = useState<string>("Cyberpunk street samurai in neon rain, volumetric fog, 8k masterpiece");
  const [negativePrompt, setNegativePrompt] = useState<string>("blurry, deformed, bad anatomy, low quality, artifacts, watermark");
  const [aspectRatio, setAspectRatio] = useState<string>("1024*1024");
  const [seed, setSeed] = useState<number | "">("");
  const [activeStyle, setActiveStyle] = useState<string | null>(null);

  // Execution state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [previewModalMedia, setPreviewModalMedia] = useState<PreviewMediaData | null>(null);

  const selectedModelObj = ENGINE_MODELS.find((m) => m.id === selectedModel) || ENGINE_MODELS[0];

  const handleApplyStyle = (preset: typeof STYLE_PRESETS[0]) => {
    setActiveStyle(preset.name);
    // Strip previous style suffixes if existing
    let cleanPrompt = prompt.trim();
    for (const p of STYLE_PRESETS) {
      if (cleanPrompt.endsWith(p.suffix)) {
        cleanPrompt = cleanPrompt.replace(p.suffix, "").trim();
      }
    }
    setPrompt(cleanPrompt + preset.suffix);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    const nsfwMode = isNsfwModeActive();
    if (!nsfwMode && isNsfwContent(prompt)) {
      triggerNsfwBlockedModal();
      return;
    }
    setIsEnhancingPrompt(true);
    try {
      const res = await fetch("/api/sentinel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, action: "refine_prompt", nsfw_enabled: nsfwMode }),
      });
      if (res.status === 403) {
        triggerNsfwBlockedModal();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          // Extract prompt from code block if present
          const match = data.reply.match(/```(?:prompt)?\s*([\s\S]*?)\s*```/i);
          setPrompt(match ? match[1].trim() : data.reply.trim());
        }
      }
    } catch (e) {
      console.warn("Prompt enhance fallback:", e);
    } finally {
      setIsEnhancingPrompt(false);
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

    setIsGenerating(true);
    setErrorMessage("");
    const startTime = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt,
          model: selectedModel,
          mode: "generate",
          size: aspectRatio,
          seed: seed === "" ? null : Number(seed),
          nsfw_enabled: nsfwMode,
        }),
      });

      if (res.status === 403) {
        triggerNsfwBlockedModal();
        setIsGenerating(false);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Synthesis failed (${res.status})`);
      }

      const outputImg = data.image_url || data.image_base64;
      if (!outputImg) {
        throw new Error("No image data returned from generator engine.");
      }

      setGeneratedImage(outputImg);
      setLastLatency(Date.now() - startTime);
      setLastModelUsed(data.model || selectedModelObj.name);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-6 animate-fadeIn pb-24 lg:pb-12">
      {/* ── Top Header Banner ── */}
      <div className="bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18)] rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 z-10 flex-1 min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400 text-cyan-300 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
            <span>High-Fidelity AI Synthesis Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            Direct Cloud Diffusion &amp; Concept Studio
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate high-resolution images directly via Pollinations FLUX.1 Schnell, Google Imagen 3, and Alibaba Qwen Cloud.
            Fast, keyless, and automatically pipeable to Studio &amp; LoRAs.
          </p>
        </div>

        {/* Selected Engine Summary Badge */}
        <div className="bg-black/80 border border-cyan-500/40 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0">
          <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Active Engine</p>
            <p className="text-xs font-mono font-black text-cyan-300">{selectedModelObj.name}</p>
            <p className="text-[10px] text-emerald-400 font-mono font-semibold">{selectedModelObj.latency} &bull; {selectedModelObj.badge}</p>
          </div>
        </div>
      </div>

      {/* ── Engine Model Selection (Clean Speed vs Quality Partitioning) ── */}
      <div className="space-y-3 bg-slate-950/80 border border-slate-800/80 p-4 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Synthesis Engine</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-300">
            {ENGINE_MODELS.length} Available Models
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ENGINE_MODELS.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModel(m.id)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[76px] ${
                  isSelected
                    ? "bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400"
                    : "bg-black/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className={`text-xs font-bold truncate ${isSelected ? "text-cyan-300" : "text-white"}`}>
                    {m.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                    m.group === "Speed" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}>
                    {m.group}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                  <span className="font-mono text-cyan-400/90">{m.badge}</span>
                  <span className="font-mono text-emerald-400 font-bold">{m.latency}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Studio Grid: Controls & Output ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 bg-slate-950/85 border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.18)] rounded-3xl p-4 sm:p-5 space-y-4">
          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Prompt Input</span>
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancingPrompt || !prompt.trim()}
                className="min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isEnhancingPrompt ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                <span>{isEnhancingPrompt ? "Expanding Prompt..." : "✨ Enhance Prompt"}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate in detail..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
            />
          </div>

          {/* Style Presets Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aesthetic Style Presets</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 touch-pan-x">
              {STYLE_PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = activeStyle === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyStyle(p)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                      isSelected
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio Selector (Visual Buttons) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Ratio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aspect Ratio</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {ASPECT_RATIOS.map((r) => {
                const isSelected = aspectRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id)}
                    className={`min-h-[44px] py-2 px-1 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                      isSelected
                        ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs font-black">{r.label}</span>
                    <span className="text-[9px] font-mono leading-none mt-0.5">{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400">Negative Prompt</label>
              <button
                type="button"
                onClick={() => setNegativePrompt("blurry, deformed, bad anatomy, bad hands, low resolution, artifacts, mutated")}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
              >
                Standard SFW Cleanup
              </button>
            </div>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g. blurry, deformed, bad anatomy..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 h-10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Seed */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Seed (Optional)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Random"
                value={seed}
                onChange={(e) => setSeed(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 h-10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                title="Randomize seed"
                className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs rounded-xl text-slate-300 transition"
              >
                🎲
              </button>
            </div>
          </div>

          {/* Error Message Diagnostic */}
          {errorMessage && (
            <div className="bg-rose-950/70 border border-rose-800/80 p-3 rounded-2xl text-xs text-rose-200 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Diagnostic</p>
                <p className="text-[11px] text-rose-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2 border-t border-cyan-500/30 flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecute}
              disabled={isGenerating}
              className={`flex-1 min-h-[48px] px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                isGenerating
                  ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                  : "bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing Diffusion Latents...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Generate High-Res Concept</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrompt("");
                setNegativePrompt("");
                setGeneratedImage(null);
                setErrorMessage("");
                setActiveStyle(null);
              }}
              title="Reset fields"
              className="min-h-[48px] px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl text-xs font-bold transition"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Right Preview & Pipe Canvas: 7 cols */}
        <div className="lg:col-span-7 bg-slate-950/85 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-5 flex flex-col justify-between min-h-[460px] transition-all">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <span className="text-xs font-extrabold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>Synthesis Output Canvas</span>
            </span>
            <div className="flex items-center gap-2">
              {lastLatency !== null && (
                <span className="text-[11px] font-mono bg-emerald-950/80 border border-emerald-400/80 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  ⚡ {(lastLatency / 1000).toFixed(2)}s &bull; {lastModelUsed}
                </span>
              )}
              {generatedImage && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModalMedia({
                      src: generatedImage,
                      title: "AI Generator High-Res Output",
                      subtitle: `Generated with ${lastModelUsed || selectedModelObj.name}`,
                      downloadFileName: `ai_generator_${Date.now()}.png`,
                      actionButton: onSendToStudio
                        ? {
                            label: "Send to Studio",
                            onClick: () => onSendToStudio(generatedImage, prompt),
                          }
                        : undefined,
                    })
                  }
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 text-cyan-300 rounded-xl text-xs font-semibold transition"
                  title="Fullscreen Lightbox"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[360px] relative overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-full animate-pulse">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Synthesizing with {selectedModelObj.name}...</p>
                  <p className="text-xs text-slate-500 mt-1">Direct cloud neural flow executing at edge</p>
                </div>
              </div>
            ) : generatedImage ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setPreviewModalMedia({
                    src: generatedImage,
                    title: "AI Generator High-Res Output",
                    subtitle: `Generated with ${lastModelUsed || selectedModelObj.name}`,
                    downloadFileName: `ai_generator_${Date.now()}.png`,
                    actionButton: onSendToStudio
                      ? {
                          label: "Send to Studio",
                          onClick: () => onSendToStudio(generatedImage, prompt),
                        }
                      : undefined,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPreviewModalMedia({
                      src: generatedImage,
                      title: "AI Generator High-Res Output",
                      subtitle: `Generated with ${lastModelUsed || selectedModelObj.name}`,
                      downloadFileName: `ai_generator_${Date.now()}.png`,
                    });
                  }
                }}
                className="relative flex flex-col items-center justify-center max-h-[440px] cursor-pointer group focus:outline-none rounded-2xl overflow-hidden"
              >
                <img
                  src={generatedImage}
                  alt="AI Generated"
                  className="max-h-[400px] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800 group-hover:scale-102 transition duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px] rounded-2xl">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-black font-extrabold text-xs shadow-lg">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Tap to Expand Full Size
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600 text-center">
                <ImageIcon className="w-12 h-12 text-slate-700" />
                <p className="text-xs text-slate-400">Output will appear here after generation</p>
                <p className="text-[11px] text-slate-600">Select model, aspect ratio, and tap Generate</p>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {generatedImage && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-mono">{aspectRatio} &bull; Direct Cloud PNG</span>
              <div className="flex items-center gap-2">
                {onSendToStudio && (
                  <button
                    type="button"
                    onClick={() => onSendToStudio(generatedImage, prompt)}
                    className="min-h-[44px] flex items-center gap-1.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    <span>Send to Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                )}
                <a
                  href={generatedImage}
                  download={`ai_generator_${Date.now()}.png`}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs transition shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen High-Resolution Lightbox Preview Modal ── */}
      <ImagePreviewModal
        isOpen={Boolean(previewModalMedia)}
        onClose={() => setPreviewModalMedia(null)}
        media={previewModalMedia}
      />
    </div>
  );
}
