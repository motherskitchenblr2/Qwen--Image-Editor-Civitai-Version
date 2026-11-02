"use client";

import React, { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import SentinelChatCopilot from "./SentinelChatCopilot";

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
  isNsfwMode = false,
  showToast,
}: SentinelModalProps) {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentinel-modal-title"
    >
      <div className="w-full max-w-4xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col h-[90vh] max-h-[880px] overflow-hidden text-slate-100 font-sans relative">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/20 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="sentinel-modal-title" className="text-sm font-black tracking-wide text-white">
                  SENTINEL AGENTIC ADMIN
                </h2>
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

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
            title="Close Sentinel Copilot"
            aria-label="Close Sentinel Copilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Sentinel Copilot */}
        <div className="flex-1 overflow-hidden">
          <SentinelChatCopilot
            canvasImage={canvasImage}
            isNsfwMode={isNsfwMode}
            onUsePrompt={onApplyPrompt}
            onApplySettings={onApplySettings}
            onApplyPreset={onApplyPreset}
            onFuseLoras={onFuseLoras}
            showToast={showToast}
            className="h-full border-0 rounded-none shadow-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}

export default SentinelAgentModal;
