"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export interface SentinelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt?: (prompt: string, negativePrompt?: string) => void;
  onApplySettings?: (settings: { steps: number; cfgScale: number; aspectRatio: "1:1" | "9:16" | "16:9" | "4:5" | "3:2" }) => void;
  onApplyPreset?: (presetName: string, stylePrompt: string, negativePrompt?: string) => void;
  onFuseLoras?: (loraNames: string[]) => void;
  canvasImage?: string | null;
  activePrompt?: string;
  showToast?: (text: string, type?: "success" | "error" | "info") => void;
}

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", badge: "Ultra-Fast / Free" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", badge: "Master Prompting" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", badge: "Balanced Intelligence" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", badge: "Deep Reasoning" },
  { id: "mistralai/mistral-nemo", name: "Mistral Nemo", badge: "Creative Studio" },
];

export function SentinelAgentModal({
  isOpen,
  onClose,
  onApplyPrompt,
  onApplySettings,
  onApplyPreset,
  onFuseLoras,
  canvasImage,
  activePrompt = "",
  showToast,
}: SentinelModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.0-flash-001");
  const [showReasoning, setShowReasoning] = useState<boolean>(true);

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

  const handleApproveFuse = (inv: any) => {
    if (onFuseLoras && inv.args?.loraNames) {
      onFuseLoras(inv.args.loraNames);
      showToast?.(`📦 Approved LoRA fusion: Fusing [${inv.args.loraNames.join(", ")}] into GPU storage`, "success");
    }
    addToolResult({
      toolCallId: inv.toolCallId,
      result: `User approved LoRA fusion. Preparing to fuse [${(inv.args?.loraNames || []).join(", ")}] into Kaggle Dual T4 GPU pipeline.`,
    });
  };

  const handleRejectFuse = (inv: any) => {
    showToast?.("LoRA fusion action canceled by user.", "info");
    addToolResult({
      toolCallId: inv.toolCallId,
      result: "User declined LoRA fusion.",
    });
  };

  const handleQuickPrompt = (text: string) => {
    setInput(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col h-[88vh] overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/20 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wide text-white">SENTINEL AGENTIC COPILOT</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Live Tool Execution
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct workstation control • Prompt expansion • HITL approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Model Selector Dropdown */}
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

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Close Sentinel Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Token & Quota Tracker Status Bar */}
        <div className="px-5 py-2 bg-black/60 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-300 font-mono">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Multi-Provider Stream Ready</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline font-mono">
              Target: {selectedModel.split("/").pop()}
            </span>
          </div>

          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition"
          >
            {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Reasoning Steps: {showReasoning ? "Shown" : "Collapsed"}</span>
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400">
              <div className="p-4 rounded-3xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <Bot className="w-8 h-8 mx-auto" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-black text-white">Autonomous Studio Copilot Active</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sentinel has direct tool access to your studio. Ask to craft cinematic prompts, tune CFG &amp; steps, or prepare LoRA fusions.
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg pt-2 text-left">
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Craft a hyper-detailed cinematic prompt for a cyberpunk visionary portrait with volumetric lighting, and set the aspect ratio to 9:16")}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-xs transition text-slate-300 hover:text-white flex items-center gap-2 group min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition" />
                  <span>Cinematic Portrait + 9:16 Aspect</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Tune optimal studio parameters for ultra-fast Turbo diffusion (4 steps, low CFG scale)")}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-xs transition text-slate-300 hover:text-white flex items-center gap-2 group min-h-[44px]"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition" />
                  <span>Fast Turbo Parameter Tuning</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Apply a high-end analog 35mm film aesthetic preset to my prompt and negative prompt")}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-xs transition text-slate-300 hover:text-white flex items-center gap-2 group min-h-[44px]"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:scale-110 transition" />
                  <span>Apply 35mm Film Preset</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Prepare and fuse the best detail enhancer LoRAs for my concept into the GPU")}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-xs transition text-slate-300 hover:text-white flex items-center gap-2 group min-h-[44px]"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition" />
                  <span>Prepare LoRA Fusion Stack</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {m.role === "user" ? (
                    <>
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>You</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-cyan-300 font-bold">Sentinel Copilot</span>
                    </>
                  )}
                </div>

                {m.content && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-purple-950/20 border border-purple-500/30 text-purple-100 ml-4 sm:ml-8"
                        : "bg-slate-900/70 border border-slate-800 text-slate-100 mr-4 sm:mr-8 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                )}

                {/* Collapsible Reasoning Block & Tool Execution */}
                {m.toolInvocations && m.toolInvocations.length > 0 && showReasoning && (
                  <div className="space-y-2 mr-4 sm:mr-8">
                    {m.toolInvocations.map((inv: any) => {
                      const isPending = !("result" in inv);
                      const isHitl = inv.toolName === "studio_fuse_loras";

                      return (
                        <div
                          key={inv.toolCallId}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isHitl && isPending
                              ? "bg-amber-950/30 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                              : isPending
                              ? "bg-cyan-950/20 border-cyan-500/40"
                              : "bg-slate-900/90 border-slate-800"
                          }`}
                        >
                          {/* Tool Header */}
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80 mb-2">
                            <span className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Tool: {inv.toolName}</span>
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                isHitl && isPending
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                                  : isPending
                                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              }`}
                            >
                              {isHitl && isPending
                                ? "⚠️ Approval Required"
                                : isPending
                                ? "Executing Client Tool..."
                                : "✅ Executed in Studio"}
                            </span>
                          </div>

                          {/* Arguments Details */}
                          <pre className="text-[11px] font-mono text-slate-300 bg-black/60 p-2.5 rounded-xl overflow-x-auto border border-slate-800 max-h-40">
                            {JSON.stringify(inv.args, null, 2)}
                          </pre>

                          {/* Result Outcome if Executed */}
                          {"result" in inv && (
                            <p className="text-[11px] font-mono text-emerald-300 pt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{inv.result}</span>
                            </p>
                          )}

                          {/* Human-in-the-Loop Confirmation Gate */}
                          {isHitl && isPending && (
                            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-amber-500/20 mt-2">
                              <div className="flex items-center gap-1.5 text-amber-200 text-xs">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>Kaggle Dual-T4 GPU LoRA fusion requires your authorization.</span>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={() => handleApproveFuse(inv)}
                                  className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Approve &amp; Fuse</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectFuse(inv)}
                                  className="flex-1 sm:flex-none px-3.5 py-2 min-h-[44px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center"
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
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono py-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Sentinel is analyzing workspace and deliberating tools...</span>
            </div>
          )}
        </div>

        {/* Footer Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-950 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Instruct Sentinel (e.g. 'Craft prompt for cyberpunk portrait and set 9:16 aspect ratio')..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 min-h-[44px] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black font-extrabold text-xs sm:text-sm rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4 fill-black" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default SentinelAgentModal;
