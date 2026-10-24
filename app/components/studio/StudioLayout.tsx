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
    <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] overflow-y-auto lg:overflow-hidden px-4 py-2 gap-4 animate-fadeIn pb-36 lg:pb-2">
      {/* Left Column (ControlPanel): Mobile sits below canvas (order-2), Desktop sits in left column (order-1) */}
      <aside className="w-full order-2 lg:order-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-2 space-y-4 pb-36 lg:pb-8">
        {controlPanel}
        {historyRibbon && (
          <div className="lg:hidden shrink-0 pt-3 border-t border-slate-800/60">
            {historyRibbon}
          </div>
        )}
      </aside>

      {/* Right Column (CanvasWorkspace + History): Mobile sits on top (order-1), Desktop fills remaining height (order-2) */}
      <main className="w-full order-1 lg:order-2 flex flex-col h-full min-w-0 gap-2 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {canvasWorkspace}
        </div>
        {historyRibbon && (
          <div className="hidden lg:block shrink-0 pt-1 border-t border-cyan-500/20">
            {historyRibbon}
          </div>
        )}
      </main>
    </div>
  );
}
