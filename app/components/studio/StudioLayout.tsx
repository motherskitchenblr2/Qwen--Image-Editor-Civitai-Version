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
    <div className="h-[calc(100dvh-88px)] sm:h-[calc(100dvh-92px)] lg:h-[calc(100dvh-56px)] w-full grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[460px_1fr] overflow-y-auto lg:overflow-hidden bg-[#070b14]">
      {/* Left Rail / Mobile Bottom: ControlPanel */}
      <aside className="order-2 lg:order-1 h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850 p-4 border-t lg:border-t-0 lg:border-r border-slate-800/80 space-y-4 pb-32 lg:pb-4">
        {controlPanel}
      </aside>

      {/* Right Canvas / Mobile Top: CanvasWorkspace */}
      <main className="order-1 lg:order-2 h-[380px] sm:h-[440px] lg:h-full shrink-0 flex flex-col justify-between overflow-hidden bg-[#050811]">
        {canvasWorkspace}
      </main>
    </div>
  );
}
