"use client";

import React from "react";

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
  return (
    <div className="h-[calc(100dvh-56px)] w-full grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[460px_1fr] overflow-hidden bg-[#070b14]">
      {/* Left Column (ControlPanel): confined independently scrollable rail */}
      <aside className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 p-4 border-r border-slate-800/80 space-y-4">
        {controlPanel}
      </aside>

      {/* Right Column (CanvasWorkspace): strict viewport height */}
      <main className="h-full flex flex-col justify-between overflow-hidden bg-[#050811]">
        {canvasWorkspace}
      </main>
    </div>
  );
}
