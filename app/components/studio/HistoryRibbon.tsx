"use client";

import React, { useRef } from "react";
import {
  History,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";

interface HistoryRibbonProps {
  gallery: string[];
  activeImage: string | null;
  onSelectImage: (img: string) => void;
  onSendToInput: (img: string) => void;
  onClearHistory?: () => void;
}

export default function HistoryRibbon({
  gallery,
  activeImage,
  onSelectImage,
  onSendToInput,
  onClearHistory,
}: HistoryRibbonProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (gallery.length === 0) {
    return (
      <div className="w-full flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cyan-400/70" />
          <span className="font-semibold text-slate-300">Session History</span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Outputs will appear here for instant 1-click rollback, branching, and comparison.
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-wider">
          0 Items
        </span>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-slate-800">
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">
          History
        </span>
        <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-mono font-bold">
          {gallery.length}
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0"
      >
        {gallery.map((img, idx) => {
          const isActive = activeImage === img;
          const creationIndex = gallery.length - idx;
          return (
            <div
              key={idx}
              className={`group relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                isActive
                  ? "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] scale-105"
                  : "border-slate-800 hover:border-cyan-500/60 hover:scale-102"
              }`}
              onClick={() => onSelectImage(img)}
            >
              <img
                src={img}
                alt={`Generation #${creationIndex}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0.5 left-0.5 px-1 py-0.2 bg-black/80 backdrop-blur-sm rounded text-[8px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                #{creationIndex}
              </div>
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendToInput(img);
                  }}
                  className="p-1 rounded bg-cyan-500/30 hover:bg-cyan-400 text-white hover:text-black transition"
                  title="Refine (send to input)"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
                <a
                  href={img}
                  download={`qwen_creation_${creationIndex}.png`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded bg-cyan-500/30 hover:bg-cyan-400 text-white hover:text-black transition"
                  title="Download"
                >
                  <Download className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {onClearHistory && (
        <button
          onClick={onClearHistory}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition text-xs shrink-0"
          title="Clear history"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
