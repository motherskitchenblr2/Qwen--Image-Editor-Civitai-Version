"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  ExternalLink,
  Layers,
  Zap,
} from "lucide-react";

export interface PreviewMediaData {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  isVideo?: boolean;
  baseModel?: string;
  sizeMB?: number | string;
  triggerWords?: string[];
  downloadFileName?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: PreviewMediaData | null;
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  media,
}: ImagePreviewModalProps) {
  const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !media || !media.src) return null;

  const handleCopyTrigger = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTrigger(text);
    setTimeout(() => setCopiedTrigger(null), 2000);
  };

  const fileName =
    media.downloadFileName ||
    `${(media.title || "qwen_preview").toLowerCase().replace(/[^a-z0-9]/g, "_")}.${
      media.isVideo ? "mp4" : "png"
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.title || "Image Preview"}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.25)] rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Bar: Title, Metadata, Actions & Close Button ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-cyan-500/30 bg-black/70 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-md sm:max-w-xl">
                {media.title || "Full Resolution Preview"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-cyan-300/80 font-mono">
                {media.baseModel && (
                  <span className="px-1.5 py-0.2 bg-slate-900 border border-cyan-500/30 rounded text-cyan-300">
                    {media.baseModel}
                  </span>
                )}
                {media.sizeMB !== undefined && media.sizeMB !== "" && media.sizeMB !== 0 && (
                  <span>{media.sizeMB} MB</span>
                )}
                {media.subtitle && <span className="truncate">{media.subtitle}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {media.actionButton && (
              <button
                type="button"
                onClick={() => {
                  media.actionButton?.onClick();
                  onClose();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black text-xs font-black rounded-xl transition shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95"
              >
                {media.actionButton.icon}
                <span>{media.actionButton.label}</span>
              </button>
            )}

            <a
              href={media.src}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition"
              title="Download Full Resolution Media"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/60 text-slate-400 hover:text-rose-300 transition active:scale-95"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Center Stage: 100% Uncropped Media Display ── */}
        <div className="flex-1 min-h-[300px] max-h-[68vh] sm:max-h-[72vh] flex items-center justify-center p-3 sm:p-6 bg-[#03060d] relative overflow-hidden">
          {/* Ambient subtle glow backdrop */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 filter blur-3xl">
            <img src={media.src} alt="" aria-hidden="true" className="w-full h-full object-cover" />
          </div>

          {media.isVideo ? (
            <video
              src={media.src}
              controls
              autoPlay
              loop
              playsInline
              {...({ referrerPolicy: "no-referrer" } as any)}
              className="max-h-[64vh] sm:max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] border border-cyan-500/30 relative z-10"
            />
          ) : (
            <img
              src={media.src}
              alt={media.alt || media.title || "Full Preview"}
              referrerPolicy="no-referrer"
              className="max-h-[64vh] sm:max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] border border-cyan-500/30 relative z-10"
            />
          )}
        </div>

        {/* ── Footer Bar: Trigger Words & Quick Actions ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-cyan-500/20 bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          {media.triggerWords && media.triggerWords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Triggers:</span>
              </span>
              {media.triggerWords.slice(0, 5).map((tw) => (
                <button
                  key={tw}
                  type="button"
                  onClick={() => handleCopyTrigger(tw)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-200 transition flex items-center gap-1"
                  title="Click to copy trigger word"
                >
                  <span>{tw}</span>
                  {copiedTrigger === tw ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">
              Uncropped 1:1 Aspect Ratio Display &bull; Original Fidelity
            </span>
          )}

          {media.actionButton && (
            <div className="flex sm:hidden w-full">
              <button
                type="button"
                onClick={() => {
                  media.actionButton?.onClick();
                  onClose();
                }}
                className="w-full py-2 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
              >
                {media.actionButton.icon}
                <span>{media.actionButton.label}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
