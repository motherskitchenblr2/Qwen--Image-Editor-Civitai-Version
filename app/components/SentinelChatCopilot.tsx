"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  Sliders,
  Layers,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Wand2,
  ChevronDown,
  ChevronRight,
  Paintbrush,
  CheckCircle2,
} from "lucide-react";

interface SentinelChatCopilotProps {
  canvasImage?: string | null;
  onUsePrompt?: (prompt: string, negativePrompt?: string) => void;
  onApplySettings?: (settings: { steps: number; cfgScale: number; aspectRatio: "1:1" | "9:16" | "16:9" | "4:5" | "3:2" }) => void;
  onApplyPreset?: (presetName: string, stylePrompt: string, negativePrompt?: string) => void;
  onFuseLoras?: (loraNames: string[]) => void;
  showToast?: (text: string, type?: "success" | "error" | "info") => void;
}

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", badge: "Ultra-Fast / Free" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", badge: "Master Prompting" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", badge: "Balanced Intelligence" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", badge: "Deep Reasoning" },
  { id: "mistralai/mistral-nemo", name: "Mistral Nemo", badge: "Creative Studio" },
];

const QUICK_ACTIONS = [
  {
    id: "refine_prompt",
    label: "✨ Auto-Refine Prompt",
    prompt: "Refine my concept into a master-grade Midjourney & FLUX.1 cinematic prompt with camera lenses and volumetric lighting.",
  },
  {
    id: "recommend_loras",
    label: "🎨 Recommend LoRAs",
    prompt: "Recommend compatible Civitai LoRAs for my visual concept and prepare them for fusion.",
  },
  {
    id: "analyze_image",
    label: "🔍 Analyze Canvas Image",
    prompt: "Analyze the active canvas image and recommend targeted inpainting and composition enhancements.",
  },
  {
    id: "tuning_params",
    label: "⚙️ Tuning: CFG & Steps",
    prompt: "Tune optimal CFG Scale, guidance parameters, and inference steps for photorealistic generation.",
  },
  {
    id: "clean_negatives",
    label: "🚫 Purge Artifacts",
    prompt: "Generate an airtight negative prompt recipe to eliminate anatomical deformities, blurry textures, and artifacts.",
  },
];

export default function SentinelChatCopilot({
  canvasImage,
  onUsePrompt,
  onApplySettings,
  onApplyPreset,
  onFuseLoras,
  showToast,
}: SentinelChatCopilotProps) {
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.0-flash-001");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showReasoning, setShowReasoning] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    addToolResult,
    setInput,
  } = useChat({
    api: "/api/sentinel",
    body: {
      model: selectedModel,
      hasCanvasImage: Boolean(canvasImage),
    },
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "studio_refine_prompt") {
        const args = toolCall.args as any;
        if (onUsePrompt) onUsePrompt(args.refinedPrompt, args.negativePrompt);
        showToast?.("✨ Applied refined prompt to Studio workstation!", "success");
        return `Successfully applied refined prompt: "${args.refinedPrompt.slice(0, 50)}..."`;
      }
      if (toolCall.toolName === "studio_tune_parameters") {
        const args = toolCall.args as any;
        if (onApplySettings) onApplySettings(args);
        showToast?.(`⚙️ Tuned Studio parameters (Steps: ${args.steps}, CFG: ${args.cfgScale}, Ratio: ${args.aspectRatio})`, "success");
        return `Parameters tuned: Steps=${args.steps}, CFG=${args.cfgScale}, Ratio=${args.aspectRatio}.`;
      }
      if (toolCall.toolName === "studio_apply_preset") {
        const args = toolCall.args as any;
        if (onApplyPreset) onApplyPreset(args.presetName, args.stylePrompt, args.negativePrompt);
        showToast?.(`🎨 Applied visual preset: ${args.presetName}`, "success");
        return `Visual preset "${args.presetName}" applied directly into Studio!`;
      }
      if (toolCall.toolName === "studio_inspect_canvas") {
        const args = toolCall.args as any;
        return canvasImage
          ? `Canvas inspected: Active high-resolution source image loaded. ${args.notes || ""}`
          : `Canvas inspected: Workspace in Text-to-Image synthesis mode. ${args.notes || ""}`;
      }
      // Note: studio_fuse_loras requires Human-in-the-Loop user approval below
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const extractPrompt = (content: string): string | null => {
    const match = content.match(/```(?:prompt)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : null;
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    showToast?.("Copied to clipboard", "info");
  };

  const handleApproveFuse = (inv: any) => {
    if (onFuseLoras && inv.args?.loraNames) {
      onFuseLoras(inv.args.loraNames);
      showToast?.(`📦 Approved LoRA fusion: Fusing [${inv.args.loraNames.join(", ")}] into GPU storage`, "success");
    }
    addToolResult({
      toolCallId: inv.toolCallId,
      result: `User approved LoRA fusion: Fusing [${(inv.args?.loraNames || []).join(", ")}] into Kaggle GPU pipeline.`,
    });
  };

  const handleRejectFuse = (inv: any) => {
    showToast?.("LoRA fusion action canceled by user.", "info");
    addToolResult({
      toolCallId: inv.toolCallId,
      result: "User declined LoRA fusion action.",
    });
  };

  return (
    <div className="flex flex-col h-[680px] md:h-[740px] bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18)] rounded-3xl overflow-hidden relative">
      {/* ── Copilot Subheader ── */}
      <div className="p-3.5 sm:px-5 sm:py-3 border-b border-cyan-500/20 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>Sentinel Autonomous Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">
              Live Vercel AI SDK Streaming &bull; Client Tool Invocations &bull; HITL Safety Gates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canvasImage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-400/40 text-[10px] text-purple-300 font-mono font-bold">
              <Wand2 className="w-3 h-3 text-purple-400" />
              <span>Canvas Linked</span>
            </div>
          )}

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-900 border border-cyan-500/30 text-xs px-2.5 py-1.5 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 font-medium cursor-pointer"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Quick Action Chips Bar ── */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-black/60 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x shrink-0">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => setInput(action.prompt)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* ── Live Stream Feed ── */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-300">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-black text-white">Sentinel Agent Ready</h4>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
              Describe any vision, select a quick action, or ask Sentinel to tune your studio parameters and prepare LoRAs.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const extracted = !isUser ? extractPrompt(msg.content) : null;

          return (
            <div
              key={msg.id || idx}
              className={`flex items-start gap-2.5 sm:gap-3 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/20"
                    : "bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed space-y-2.5 ${
                  isUser
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Tool Invocations & HITL Approval */}
                {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.toolInvocations.map((inv: any) => {
                      const isPending = !("result" in inv);
                      const isHitl = inv.toolName === "studio_fuse_loras";

                      return (
                        <div
                          key={inv.toolCallId}
                          className={`p-3 rounded-xl border text-xs ${
                            isHitl && isPending
                              ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                              : isPending
                              ? "bg-cyan-950/20 border-cyan-500/40"
                              : "bg-black/50 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
                            <span className="font-mono text-cyan-300 font-bold flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Tool: {inv.toolName}</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isHitl && isPending
                                ? "bg-amber-500/20 text-amber-300 animate-pulse"
                                : isPending
                                ? "bg-cyan-500/20 text-cyan-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}>
                              {isHitl && isPending ? "Approval Required" : isPending ? "Executing..." : "Executed"}
                            </span>
                          </div>

                          <pre className="text-[11px] font-mono text-slate-300 bg-black/70 p-2 rounded-lg overflow-x-auto max-h-32">
                            {JSON.stringify(inv.args, null, 2)}
                          </pre>

                          {"result" in inv && (
                            <p className="text-[11px] font-mono text-emerald-300 pt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{inv.result}</span>
                            </p>
                          )}

                          {isHitl && isPending && (
                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-amber-500/20 mt-2">
                              <span className="text-[11px] text-amber-200">Authorize GPU LoRA fusion?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveFuse(inv)}
                                  className="px-3 py-1.5 min-h-[44px] bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectFuse(inv)}
                                  className="px-3 py-1.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Extracted Prompt Action Block */}
                {extracted && (
                  <div className="mt-3 p-3 rounded-xl bg-black/80 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        ✨ Synthesized Studio Prompt
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(extracted, idx)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-cyan-200 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      {extracted}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (onUsePrompt) onUsePrompt(extracted);
                        showToast?.("Prompt transferred to Generator Studio!", "success");
                      }}
                      className="min-h-[44px] w-full py-2.5 px-3 bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(6,182,212,0.35)] active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>Use in Generator Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-cyan-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sentinel is formulating prompt architecture &amp; planning tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Fixed Bottom Touch Input Bar ── */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-cyan-500/20 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Instruct Sentinel (e.g. 'Craft prompt for cyberpunk portrait and set 9:16')..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white rounded-2xl px-3.5 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="min-h-[44px] min-w-[44px] px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            title="Send to Sentinel"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Send className="w-4 h-4 text-black" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
