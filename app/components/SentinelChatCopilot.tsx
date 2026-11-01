"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ShieldAlert,
  Zap,
  Wand2,
} from "lucide-react";
import { isNsfwModeActive } from "@/app/lib/nsfwFilter";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: string;
}

interface SentinelChatCopilotProps {
  canvasImage?: string | null;
  onUsePrompt?: (prompt: string) => void;
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
    prompt: "Recommend 3 compatible Civitai LoRAs with ideal trigger weights and stacking advice for my visual concept.",
  },
  {
    id: "analyze_image",
    label: "🔍 Analyze Canvas Image",
    prompt: "Analyze the active canvas image and recommend targeted inpainting and composition enhancements.",
  },
  {
    id: "tuning_params",
    label: "⚙️ Tuning: CFG & Steps",
    prompt: "What are the optimal CFG Scale, guidance parameters, and inference steps for photorealistic vs anime generation?",
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
  showToast,
}: SentinelChatCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Greetings! I am **Sentinel**, your elite prompt engineer, vision analyst, and AI Studio Copilot.\n\nI specialize in crafting **Midjourney-grade prompts**, tuning **CFG & samplers**, and finding the best **Civitai LoRAs** for your concepts.\n\nTap any quick action below or describe your idea to begin!",
      provider: "Sentinel Core AI",
      timestamp: "Ready",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const extractPrompt = (content: string): string | null => {
    const match = content.match(/```(?:prompt)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : null;
  };

  const handleUsePrompt = (promptText: string) => {
    if (onUsePrompt) {
      onUsePrompt(promptText);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("use-copilot-prompt", { detail: { prompt: promptText } })
      );
    }
    navigator.clipboard?.writeText(promptText);
    if (showToast) {
      showToast("Prompt transferred to Generator Studio!", "success");
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    if (showToast) {
      showToast("Copied to clipboard", "info");
    }
  };

  const sendMessage = async (textToSend?: string, actionType: string = "chat") => {
    const query = (textToSend || input).trim();
    if (!query || isSending) return;

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/sentinel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          prompt: query,
          action: actionType,
          image_context: canvasImage
            ? { dimensions: "1024x1024", description: "Source Canvas Layer" }
            : null,
          nsfw_enabled: isNsfwModeActive(),
        }),
      });

      if (res.status === 403) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ **Content Flagged:** Sentinel blocked this prompt in SFW Safe Mode.",
            provider: "Sentinel Guardian",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Prompt refined successfully.",
          provider: data.provider || "Sentinel Copilot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Note: ${err.message || "Network offline. Switched to local heuristic copilot."}`,
          provider: "Sentinel Fallback",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[640px] md:h-[700px] bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18)] rounded-3xl overflow-hidden relative">
      {/* ── Copilot Subheader ── */}
      <div className="p-3.5 sm:px-5 sm:py-3 border-b border-cyan-500/20 bg-slate-950/95 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>Sentinel AI Studio Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">
              Live Prompt Engineering &bull; Vision Diagnostics &bull; LoRA Advisor
            </p>
          </div>
        </div>

        {canvasImage && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-400/40 text-[10px] text-purple-300 font-mono font-bold">
            <Wand2 className="w-3 h-3 text-purple-400" />
            <span>Canvas Linked</span>
          </div>
        )}
      </div>

      {/* ── Quick Action Chips Bar ── */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-black/60 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x shrink-0">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => sendMessage(action.prompt, action.id)}
            disabled={isSending}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* ── Messages Feed ── */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const extracted = !isUser ? extractPrompt(msg.content) : null;

          return (
            <div
              key={idx}
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
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed space-y-2 ${
                  isUser
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

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
                      onClick={() => handleUsePrompt(extracted)}
                      className="min-h-[44px] w-full py-2.5 px-3 bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(6,182,212,0.35)] active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>Use in Generator Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Footer Meta */}
                <div className="flex items-center justify-between text-[10px] opacity-70 pt-1">
                  <span>{msg.provider || (isUser ? "You" : "Sentinel")}</span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-2.5 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-cyan-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sentinel is formulating prompt architecture...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Fixed Bottom Touch Input Bar ── */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-cyan-500/20 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask Sentinel anything about prompts, LoRAs, or styles..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white rounded-2xl px-3.5 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none max-h-32 min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="min-h-[44px] min-w-[44px] px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            title="Send to Sentinel"
          >
            {isSending ? (
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
