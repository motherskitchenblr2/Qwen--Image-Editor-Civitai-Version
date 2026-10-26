"use client";

import React, { useState } from "react";

interface StudioLayoutProps {
  controlPanel: React.ReactNode;
  canvasWorkspace: React.ReactNode;
  historyRibbon?: React.ReactNode;
}

export default function StudioLayout({
  controlPanel,
  canvasWorkspace,
  historyRibbon,
}: StudioLayoutProps) {
  // Mobile Studio View Switcher: "both" (default continuous scroll), "canvas", "controls"
  const [mobileView, setMobileView] = useState<"both" | "canvas" | "controls">("both");

  return (
    <div className="h-full w-full flex flex-col lg:grid lg:grid-cols-[440px_1fr] xl:grid-cols-[460px_1fr] overflow-y-auto lg:overflow-hidden bg-[#070b14]">
      {/* Mobile-Only Studio View Switcher Segmented Control */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-slate-950/95 border-b border-cyan-500/30 shrink-0 sticky top-0 z-20 backdrop-blur-md">
        <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Studio Workstation
        </span>
        <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMobileView("both")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              mobileView === "both"
                ? "bg-cyan-500/25 border border-cyan-400/80 text-cyan-200 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setMobileView("canvas")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              mobileView === "canvas"
                ? "bg-cyan-500/25 border border-cyan-400/80 text-cyan-200 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🖼️ Canvas
          </button>
          <button
            type="button"
            onClick={() => setMobileView("controls")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              mobileView === "controls"
                ? "bg-cyan-500/25 border border-cyan-400/80 text-cyan-200 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚙️ Controls
          </button>
        </div>
      </div>

      {/* Left Rail / Mobile Controls: ControlPanel */}
      <aside
        className={`order-2 lg:order-1 h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850 p-4 border-t lg:border-t-0 lg:border-r border-slate-800/80 space-y-4 pb-36 lg:pb-6 ${
          mobileView === "canvas" ? "hidden lg:block" : "block"
        }`}
      >
        {controlPanel}
      </aside>

      {/* Right Canvas / Mobile Canvas: CanvasWorkspace */}
      <main
        className={`order-1 lg:order-2 shrink-0 flex flex-col justify-between overflow-hidden bg-[#050811] ${
          mobileView === "controls"
            ? "hidden lg:flex lg:h-full"
            : mobileView === "canvas"
            ? "flex-1 min-h-[460px] h-full"
            : "h-[300px] xs:h-[340px] sm:h-[400px] lg:h-full"
        }`}
      >
        {canvasWorkspace}
      </main>
    </div>
  );
}
