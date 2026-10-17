"use client";

import React, { useRef, useState } from "react";
import {
  History,
  RotateCcw,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (gallery.length === 0) {
    return (
      <div className="w-full">
        {/* Mobile Compact Bar (<1024px) */}
        <div className="lg:hidden border-t border-b border-slate-800/60 py-1.5 px-3 text-xs flex items-center justify-between bg-black/60 rounded-lg text-slate-400">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-cyan-400/70" />
            <span className="font-semibold text-slate-300">Session History</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-wider">
            0 Items
          </span>
        </div>

        {/* Desktop Ribbon (>=1024px) */}
        <div className="hidden lg:flex bg-black/60 border border-cyan-500/25 rounded-2xl p-2.5 px-4 items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-cyan-400/70" />
            <span className="font-semibold text-slate-300">Session History</span>
            <span className="text-[11px] text-slate-400 font-medium">
              Outputs will appear here for instant 1-click rollback, branching, and comparison.
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-wider">
            0 Items
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Mobile Compact Collapsible Bar (<1024px) */}
      <button
        type="button"
        onClick={() => setIsMobileExpanded((prev) => !prev)}
        className="w-full lg:hidden border-t border-b border-slate-800/60 py-1.5 px-3 text-xs flex items-center justify-between bg-black/60 hover:bg-slate-900/60 transition active:scale-[0.99] text-left rounded-lg"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">Session History</span>
          <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-mono font-bold">
            {gallery.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-300 text-[11px]">
          <span>{isMobileExpanded ? "Collapse" : "Expand"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isMobileExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Main Ribbon Content (Always visible on desktop >=1024px, collapsible on mobile <1024px) */}
      <div
        className={`${
          isMobileExpanded ? "flex" : "hidden"
        } lg:flex bg-slate-950/85 border border-cyan-500/35 shadow-[0_0_20px_rgba(6,182,212,0.12)] rounded-2xl p-2.5 flex-col gap-2 mt-1.5 lg:mt-0`}
      >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Session History
          </span>
          <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-mono font-bold">
            {gallery.length} {gallery.length === 1 ? "Output" : "Outputs"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-1 rounded-lg bg-black/60 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 transition text-xs"
            title="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1 rounded-lg bg-black/60 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 transition text-xs"
            title="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {onClearHistory && (
            <button
              onClick={onClearHistory}
              className="p-1 rounded-lg bg-black/60 hover:bg-rose-950 border border-rose-500/30 text-rose-300 transition text-xs ml-1"
              title="Clear session ribbon"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal thumbnail track */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
      >
        {gallery.map((img, idx) => {
          const isActive = activeImage === img;
          const creationIndex = gallery.length - idx;
          return (
            <div
              key={idx}
              className={`group relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                isActive
                  ? "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105"
                  : "border-slate-800 hover:border-cyan-500/60 hover:scale-102"
              }`}
              onClick={() => onSelectImage(img)}
            >
              <img
                src={img}
                alt={`Generation #${creationIndex}`}
                className="w-full h-full object-cover"
              />

              {/* Number Badge */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                #{creationIndex}
              </div>

              {/* Hover actions overlay */}
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 backdrop-blur-[2px]">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={img}
                    download={`qwen_creation_${creationIndex}.png`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded bg-cyan-500/30 hover:bg-cyan-400 text-white hover:text-black transition"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectImage(img);
                    }}
                    className="w-full py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 rounded text-[9px] font-bold text-cyan-200 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-2.5 h-2.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendToInput(img);
                    }}
                    className="w-full py-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black rounded text-[9px] font-black flex items-center justify-center gap-1 shadow-sm"
                    title="Send this image as input for next edit iteration"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Branch</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
