"use client";

import React, { useState, useEffect } from "react";
import { useChat } from "ai/react";
import {
  Sparkles,
  Zap,
  Sliders,
  Layers,
  X,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
  ExternalLink,
  Paintbrush,
  Image as ImageIcon,
  Code2,
  Brain,
  ShieldAlert,
} from "lucide-react";
import { AVAILABLE_MODELS } from "@/app/lib/modelShuffler";

export interface SentinelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt?: (prompt: string, negativePrompt?: string) => void;
  onApplySettings?: (settings: { steps: number; cfgScale: number; aspectRatio: "1:1" | "9:16" | "16:9" | "4:5" | "3:2" }) => void;
  onApplyPreset?: (presetName: string, stylePrompt: string, negativePrompt?: string) => void;
  onFuseLoras?: (loraNames: string[]) => void;
  canvasImage?: string | null;
  activePrompt?: string;
  isNsfwMode?: boolean;
  showToast?: (text: string, type?: "success" | "error" | "info") => void;
}


export function SentinelAgentModal({
  isOpen,
  onClose,
  onApplyPrompt,
  onApplySettings,
  onApplyPreset,
  onFuseLoras,
  canvasImage,
  activePrompt = "",
  isNsfwMode = false,
  showToast,
}: SentinelModalProps) {
  const [taskType, setTaskType] = useState<"general" | "coding" | "reasoning">("general");
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    isNsfwMode ? "mistralai/mistral-nemo" : "google/gemma-4-31b-it"
  );
  const [showReasoning, setShowReasoning] = useState<boolean>(true);

  // Sync model selection when NSFW toggle or taskType changes
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
      activePrompt,
      hasCanvasImage: Boolean(canvasImage),
    },
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "studio_refine_prompt") {
        const args = toolCall.args as any;
        if (onApplyPrompt) onApplyPrompt(args.refinedPrompt, args.negativePrompt);
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
      // Note: studio_fuse_loras requires Human-in-the-Loop user approval below
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col h-[88vh] overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/20 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wide text-white">SENTINEL AGENTIC ADMIN</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Live Admin Co-Pilot
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous Studio Control • Coding &amp; Reasoning • HITL Approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Model Selector Dropdown */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-cyan-500/30 text-xs px-2.5 py-1.5 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 font-medium cursor-pointer max-w-[210px] sm:max-w-xs"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Close Sentinel Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Shuffling Bar & Live Role Navigation */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-[11px]">
          {/* Task Type Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTaskType("general")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                taskType === "general"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Paintbrush className="w-3 h-3" />
              <span>Studio Copilot</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskType("coding")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                taskType === "coding"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Coding Tasks</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskType("reasoning")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                taskType === "reasoning"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>Reasoning Tasks</span>
            </button>
          </div>

          {/* Active Model Shuffling Role Pill */}
          <div className="flex items-center gap-2 font-mono text-[10.5px]">
            <span
              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                taskType === "coding"
                  ? "bg-indigo-950/60 border-indigo-500/40 text-indigo-300"
                  : taskType === "reasoning"
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : isNsfwMode
                  ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                  : "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
              }`}
            >
              {taskType === "coding"
                ? "💻 Primary: Gemini 3.8 • Fallback: Nemotron (NVIDIA)"
                : taskType === "reasoning"
                ? "🧠 Primary: DeepSeek v4.1 (NVIDIA) • Fallback: Groq 70B"
                : isNsfwMode
                ? "🔞 NSFW Primary: Mistral AI • Fallback: Dolphin AI"
                : "🛡️ SFW Primary: Gemma 4 31B IT (Google AI Studio)"}
            </span>

            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition"
            >
              {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Reasoning: {showReasoning ? "Shown" : "Hidden"}</span>
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-3xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Sentinel Admin &amp; Autonomous Copilot Ready
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                Connected to active workstation. Ask Sentinel to expand concepts, dial inference parameters, apply visual presets, write code, or execute deep reasoning.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
                <button
                  type="button"
                  onClick={() => setInput("Expand my active prompt with volumetric lighting, shot on 85mm lens, and apply optimal parameters")}
                  className="p-3 text-left rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/60 transition group text-xs"
                >
                  <p className="font-semibold text-cyan-300 group-hover:text-cyan-200">✨ Refine &amp; Tune Studio</p>
                  <p className="text-[11px] text-slate-400">Inject cinematic camera descriptors and set CFG/steps</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaskType("coding");
                    setInput("Audit this application's API routes, verify error boundaries, and suggest optimizations for zero-latency response");
                  }}
                  className="p-3 text-left rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition group text-xs"
                >
                  <p className="font-semibold text-indigo-300 group-hover:text-indigo-200">💻 Coding &amp; Admin Audit</p>
                  <p className="text-[11px] text-slate-400">Execute code checks with Gemini 3.8 &amp; Nemotron</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaskType("reasoning");
                    setInput("Analyze composition and lighting hierarchy for a high-contrast cyberpunk scene");
                  }}
                  className="p-3 text-left rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/60 transition group text-xs"
                >
                  <p className="font-semibold text-emerald-300 group-hover:text-emerald-200">🧠 Deep Aesthetic Reasoning</p>
                  <p className="text-[11px] text-slate-400">DeepSeek v4.1 Flash chain-of-thought analysis</p>
                </button>

                <button
                  type="button"
                  onClick={() => setInput("Apply a Cyberpunk Neon style preset and suggest 2 complementary Civitai LoRAs to fuse")}
                  className="p-3 text-left rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-800/60 transition group text-xs"
                >
                  <p className="font-semibold text-purple-300 group-hover:text-purple-200">🎨 Style &amp; LoRA Fuse</p>
                  <p className="text-[11px] text-slate-400">Trigger LoRA fusion with human approval gate</p>
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => (
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
                  {/* Collapsible Reasoning Block */}
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

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {m.content}
                  </div>

                  {/* Interactive Tool Calling & HITL Approvals */}
                  {m.toolInvocations && m.toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                      {m.toolInvocations.map((tool) => {
                        const isDone = "result" in tool;

                        if (tool.toolName === "studio_fuse_loras") {
                          const args = tool.args as { loraNames: string[]; rationale: string };
                          return (
                            <div
                              key={tool.toolCallId}
                              className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 animate-fadeIn"
                            >
                              <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Human-in-the-Loop Confirmation: Fuse LoRA Stack</span>
                              </div>
                              <p className="text-[11px] text-slate-300 mb-2">
                                Sentinel proposes fusing: <strong className="text-white font-mono">{args.loraNames.join(", ")}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400 italic mb-3">
                                Rationale: &quot;{args.rationale}&quot;
                              </p>

                              {!isDone ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onFuseLoras) onFuseLoras(args.loraNames);
                                      addToolResult({
                                        toolCallId: tool.toolCallId,
                                        result: `Approved & Fused LoRAs: ${args.loraNames.join(", ")}`,
                                      });
                                      showToast?.(`🔥 Approved LoRA fusion for: ${args.loraNames.join(", ")}`, "success");
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve &amp; Fuse into GPU</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      addToolResult({
                                        toolCallId: tool.toolCallId,
                                        result: "Rejected by user.",
                                      });
                                      showToast?.("LoRA fusion request declined.", "info");
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Action executed: {tool.result}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={tool.toolCallId}
                            className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              <span>Tool: {tool.toolName}</span>
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
            ))
          )}
        </div>

        {/* Chat Input & Toolbar */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || isLoading) return;
              handleSubmit(e);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-2xl px-4 py-3 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)] min-h-[44px]"
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
    </div>
  );
}
export default SentinelAgentModal;
