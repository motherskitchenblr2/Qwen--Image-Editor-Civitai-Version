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
    <div className="w-full min-h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] gap-6 px-4 lg:px-8 py-4 animate-fadeIn">
      {/* Left Column (ControlPanel): Sticky/Scrollable on Desktop */}
      <aside className="w-full h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-2 pb-8 flex flex-col gap-4">
        {controlPanel}
      </aside>

      {/* Right Column (CanvasWorkspace + History): Full Remaining Viewport Space */}
      <main className="w-full flex flex-col h-full min-h-[500px] lg:min-h-[calc(100vh-80px)] min-w-0 gap-4 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
