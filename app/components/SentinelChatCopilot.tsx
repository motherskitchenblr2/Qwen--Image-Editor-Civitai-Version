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
  Code2,
  Brain,
} from "lucide-react";
import { AVAILABLE_MODELS } from "@/app/lib/modelShuffler";

interface SentinelChatCopilotProps {
  canvasImage?: string | null;
  isNsfwMode?: boolean;
  onUsePrompt?: (prompt: string, negativePrompt?: string) => void;
  onApplySettings?: (settings: { steps: number; cfgScale: number; aspectRatio: "1:1" | "9:16" | "16:9" | "4:5" | "3:2" }) => void;
  onApplyPreset?: (presetName: string, stylePrompt: string, negativePrompt?: string) => void;
  onFuseLoras?: (loraNames: string[]) => void;
  showToast?: (text: string, type?: "success" | "error" | "info") => void;
}

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
    id: "coding_audit",
    label: "💻 Admin Code Audit",
    prompt: "Perform an admin code and API audit for Qwen Image Editor Studio to verify routing reliability and zero errors.",
  },
  {
    id: "deep_reasoning",
    label: "🧠 Aesthetic Reasoning",
    prompt: "Execute deep chain-of-thought reasoning on color contrast, lighting hierarchy, and subject balance.",
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
  isNsfwMode = false,
  onUsePrompt,
  onApplySettings,
  onApplyPreset,
  onFuseLoras,
  showToast,
}: SentinelChatCopilotProps) {
  const [taskType, setTaskType] = useState<"general" | "coding" | "reasoning">("general");
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    isNsfwMode ? "mistralai/mistral-nemo" : "google/gemma-4-31b-it"
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showReasoning, setShowReasoning] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync model selection with taskType and NSFW mode
  useEffect(() => {
    if (taskType === "coding") {
      setSelectedModel("google/gemini-2.5-pro");
    } else if (taskType === "reasoning") {
      setSelectedModel("deepseek/deepseek-r1");
    } else {
      setSelectedModel(isNsfwMode ? "mistralai/mistral-nemo" : "google/gemma-4-31b-it");
    }
  }, [taskType, isNsfwMode]);

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
      taskType,
      nsfw_enabled: isNsfwMode,
      hasCanvasImage: Boolean(canvasImage),
    },
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "studio_refine_prompt") {
        const args = toolCall.args as any;
        if (onUsePrompt) onUsePrompt(args.refinedPrompt, args.negativePrompt);
        showToast?.("✨ Sentinel applied refined prompt to Studio workstation!", "success");
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
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
              <span>Sentinel Admin &amp; Autonomous Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">
              Live Vercel AI SDK Streaming &bull; Client Tool Invocations &bull; HITL Safety Gates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            className="bg-slate-900 border border-cyan-500/30 text-xs px-2.5 py-1.5 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 font-medium cursor-pointer max-w-[210px]"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Task Category Switcher & Engine Badge Bar ── */}
      <div className="px-3.5 py-2 border-b border-slate-800 bg-black/60 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTaskType("general")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
              taskType === "general"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Paintbrush className="w-3 h-3" />
            <span>Studio Copilot</span>
          </button>
          <button
            type="button"
            onClick={() => setTaskType("coding")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
              taskType === "coding"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Coding</span>
          </button>
          <button
            type="button"
            onClick={() => setTaskType("reasoning")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
              taskType === "reasoning"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Brain className="w-3 h-3" />
            <span>Reasoning</span>
          </button>
        </div>

        <span
          className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold border flex items-center gap-1 ${
            taskType === "coding"
              ? "bg-indigo-950/80 border-indigo-500/40 text-indigo-300"
              : taskType === "reasoning"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : isNsfwMode
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
              : "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
          }`}
        >
          {taskType === "coding"
            ? "💻 Primary: Gemini 3.8 Pro • Fallback: Nemotron (NVIDIA)"
            : taskType === "reasoning"
            ? "🧠 Primary: DeepSeek v4.1 (NVIDIA) • Fallback: Groq 70B"
            : isNsfwMode
            ? "🔞 NSFW Primary: Mistral AI • Fallback: Dolphin LLM"
            : "🛡️ SFW Primary: Gemma 4 31B IT (Google AI Studio)"}
        </span>
      </div>

      {/* ── Quick Action Chips Bar ── */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-black/40 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x shrink-0">
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

      {/* ── Chat Messages Scroll View ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Sentinel Admin &amp; Autonomous Copilot Connected
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
              I am Sentinel, the administrator co-pilot of Qwen Image Editor Studio. Tap any quick action above or enter an instruction to control the studio workspace.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const extracted = m.role === "assistant" ? extractPrompt(m.content) : null;

            return (
              <div
                key={m.id}
                className={`flex gap-3 text-xs ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role !== "user" && (
                  <div className="w-7 h-7 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md font-medium"
                      : "bg-slate-900/90 border border-slate-800 text-slate-200 shadow-xl"
                  }`}
                >
                  {/* Reasoning Step Accordion */}
                  {showReasoning && m.reasoning && (
                    <div className="mb-3 p-2.5 rounded-xl bg-black/50 border border-cyan-500/20 text-[11px] font-mono text-cyan-300/90">
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        <span>Reasoning Step</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-normal opacity-90">
                        {m.reasoning}
                      </div>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {m.content}
                  </div>

                  {/* One-tap Studio Import Button */}
                  {extracted && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onUsePrompt) onUsePrompt(extracted);
                          showToast?.("Prompt applied to Studio workstation!", "success");
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                      >
                        <Paintbrush className="w-3.5 h-3.5" />
                        <span>Use This Prompt in Studio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(extracted, idx)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}

                  {/* Tool Invocations & HITL Approval */}
                  {m.toolInvocations && m.toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                      {m.toolInvocations.map((inv) => {
                        const isDone = "result" in inv;

                        if (inv.toolName === "studio_fuse_loras") {
                          const args = inv.args as { loraNames: string[]; rationale: string };
                          return (
                            <div
                              key={inv.toolCallId}
                              className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 animate-fadeIn"
                            >
                              <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Human Approval Required: Fuse LoRA Stack</span>
                              </div>
                              <p className="text-[11px] text-slate-300 mb-1">
                                LoRAs to fuse: <strong className="text-white font-mono">{args.loraNames.join(", ")}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400 italic mb-3">
                                Rationale: &quot;{args.rationale}&quot;
                              </p>

                              {!isDone ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveFuse(inv)}
                                    className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve &amp; Fuse into GPU</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectFuse(inv)}
                                    className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Action executed: {inv.result}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={inv.toolCallId}
                            className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              <span>Tool: {inv.toolName}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isDone ? "✓ Executed in Studio" : "Executing..."}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || isLoading) return;
            handleSubmit(e);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={
              taskType === "coding"
                ? "Ask Sentinel to inspect code, debug syntax, or test endpoints..."
                : taskType === "reasoning"
                ? "Ask Sentinel for deep compositional analysis or aesthetic logic..."
                : isNsfwMode
                ? "Ask Sentinel to refine unrestricted prompts, tune parameters, or fuse LoRAs (Mistral AI)..."
                : "Ask Sentinel to refine prompts, tune parameters, or apply presets (Gemma 4 31B IT)..."
            }
            className="flex-1 min-h-[44px] bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white rounded-2xl px-4 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="min-h-[44px] px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
