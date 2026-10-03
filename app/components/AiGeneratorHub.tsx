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
  const [selectedModel, setSelectedModel] = useState<string>("nano-banana");

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter models according to selected mode
  const filteredModels = AVAILABLE_MODELS.filter((m) => {
    if (activeMode === "generate") return m.type === "text2img" || m.type === "both";
    return m.type === "img2img" || m.type === "both";
  });

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      };

      // Auto-attach API key from Sentinel Gateway if configured
      try {
        const stored = localStorage.getItem("sentinel_api_keys");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (selectedModel === "google-imagen" && parsed.gemini) {
            payload.apiKey = parsed.gemini;
          } else if (selectedModel === "qwen-cloud" && parsed.dashscope) {
            payload.apiKey = parsed.dashscope;
          } else if (selectedModel.startsWith("cf-") && parsed.cloudflare_ai) {
            payload.apiKey = parsed.cloudflare_ai;
          }
        }
      } catch (e) {}

      if (activeMode === "edit" && sourceImage) {
        payload.image_base64 = sourceImage;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

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
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 space-y-6 animate-fadeIn">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/60 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
            <span>Multi-Model AI Generator Hub</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            AI Image Generator &amp; Precision Editor Hub
          </h2>
          <p className="text-xs lg:text-sm text-slate-400 leading-relaxed">
            Generate and edit images instantly across Alibaba Qwen Cloud, Nano Banana Turbo, and Cloudflare Workers AI edge.
            Switch models freely and pipe results directly into the Studio Editor.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex flex-wrap md:flex-col gap-2 z-10 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Nano Banana:</span>
            <span className="text-amber-300 font-bold font-mono">1.5s Ultra-Fast</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Qwen Cloud:</span>
            <span className="text-cyan-300 font-bold font-mono">qwen-image / edit</span>
          </div>
        </div>
      </div>

      {/* ── Mode Selection & Model Switcher: Equal-Size Inline Bar ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Mode Switcher: Equal-Sized Buttons in One Line */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 p-1 sm:p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
            <button
              onClick={() => setActiveMode("generate")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 h-9 rounded-lg text-xs font-bold transition-all ${
                activeMode === "generate"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>🎨 Generate</span>
              <span className="hidden sm:inline"> Image (Text-to-Image)</span>
            </button>
            <button
              onClick={() => setActiveMode("edit")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 h-9 rounded-lg text-xs font-bold transition-all ${
                activeMode === "edit"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>✨ Edit</span>
              <span className="hidden sm:inline"> Image (Image-to-Image)</span>
            </button>
          </div>

          {/* Model Selection Dropdown or Pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 hover:border-cyan-500/60 text-slate-200 rounded-xl px-3 h-9 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id} disabled={m.status === "coming_soon"}>
                  {m.name} ({m.provider}) &bull; {m.latency} {m.status === "coming_soon" ? "[SOON]" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Model Quick Switcher Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/60">
          {filteredModels.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => m.status !== "coming_soon" && setSelectedModel(m.id)}
                disabled={m.status === "coming_soon"}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-cyan-950/40 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10"
                    : m.status === "coming_soon"
                    ? "bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed text-slate-500"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] font-bold truncate">{m.name}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate">{m.badge}</span>
                  <span className="font-mono text-cyan-400">{m.latency}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Studio Grid: Controls & Output ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 cols */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              {activeMode === "generate" ? "Text-to-Image Parameters" : "Image-to-Image Parameters"}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Engine: <strong className="text-cyan-400">{selectedModel}</strong>
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
            <label className="text-xs font-medium text-slate-300">Prompt</label>
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
            <label className="text-xs font-medium text-slate-400">Negative Prompt</label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to exclude..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Resolution & Seed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Resolution</label>
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
              <label className="text-xs font-medium text-slate-400">Seed</label>
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
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={isGenerating}
              className={`flex-1 h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                isGenerating
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 text-black hover:opacity-95 shadow-cyan-500/25"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
              className="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Right Preview & Pipe Canvas: 7 cols */}
        <div className="lg:col-span-7 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between min-h-[460px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              Generator Output Preview
            </span>
            {lastLatency !== null && (
              <span className="text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-2 py-0.5 rounded-full">
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
