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
    <div className="w-full min-h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] gap-6 px-4 lg:px-8 py-4 overflow-hidden animate-fadeIn">
      {/* Left Column (ControlPanel): Mobile sits below canvas (order-2), Desktop sits in left column (order-1) */}
      <aside className="w-full order-2 lg:order-1 lg:h-[calc(100vh-80px)] lg:overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 pb-24 lg:pb-8">
        {controlPanel}
      </aside>

      {/* Right Column (CanvasWorkspace + History): Mobile sits on top (order-1), Desktop fills remaining height (order-2) */}
      <main className="w-full order-1 lg:order-2 flex flex-col h-full min-h-[360px] lg:min-h-[500px] lg:h-[calc(100vh-80px)] min-w-0 gap-4 overflow-hidden">
        <div className="flex-1 min-h-[320px] lg:min-h-0 flex flex-col overflow-hidden">
          {canvasWorkspace}
        </div>
        {historyRibbon && (
          <div className="shrink-0 pt-2 border-t border-cyan-500/20">
            {historyRibbon}
          </div>
        )}
      </main>
    </div>
  );
}
