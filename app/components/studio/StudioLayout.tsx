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
    <div className="flex-1 w-full max-w-full flex flex-col min-h-0 overflow-hidden animate-fadeIn">
      {/* Two-Column Studio Workspace: Left Controls (~440px-480px) + Right Interactive Canvas (flex-1) */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left: Input, Tuning & Model Controls Panel */}
        <aside className="w-full h-full lg:overflow-y-auto no-scrollbar flex flex-col gap-4 pr-0 lg:pr-1 min-h-0">
          {controlPanel}
        </aside>

        {/* Right: Live Interactive Canvas Workspace & History */}
        <main className="w-full h-full min-w-0 flex flex-col gap-4 overflow-hidden min-h-0">
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
    </div>
  );
}
