"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Layers,
  Image as ImageIcon,
  Shield,
  RefreshCw,
  Sun,
  Moon,
  Settings,
  Menu,
  X,
} from "lucide-react";

export interface HeaderProps {
  theme: "night" | "day";
  onToggleTheme: (theme: "night" | "day") => void;
  isNsfwMode: boolean;
  onToggleNsfwMode: (enabled: boolean) => void;
  isConnected: boolean;
  isStartingGpu: boolean;
  isShuttingDown: boolean;
  onStartGpu: () => void;
  onShutdownGpu: () => void;
  showAdvancedUrl: boolean;
  onToggleAdvancedUrl: () => void;
  activeTab: "studio" | "generators" | "loras" | "gallery" | "sentinel";
  onNavigateTab: (tab: "studio" | "generators" | "loras" | "gallery" | "sentinel") => void;
  availableLorasCount?: number;
  galleryCount?: number;
}

export default function Header({
  theme,
  onToggleTheme,
  isNsfwMode,
  onToggleNsfwMode,
  isConnected,
  isStartingGpu,
  isShuttingDown,
  onStartGpu,
  onShutdownGpu,
  showAdvancedUrl,
  onToggleAdvancedUrl,
  activeTab,
  onNavigateTab,
  availableLorasCount = 0,
  galleryCount = 0,
}: HeaderProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="border-b border-cyan-500/30 bg-slate-950/95 backdrop-blur-2xl px-4 lg:px-8 py-2.5 fixed top-0 left-0 right-0 z-50 shadow-[0_4px_30px_rgba(6,182,212,0.15)] w-full">
      <div className="w-full flex items-center justify-between gap-3 lg:gap-6">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-tr from-cyan-400 via-teal-400 to-indigo-500 p-2 rounded-xl text-black shadow-[0_0_15px_rgba(6,182,212,0.45)] shrink-0 animate-neon-cyan">
            <Sparkles className="w-5 h-5 fill-black" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-base sm:text-lg lg:text-xl leading-none tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
              Qwen Image Editor Studio
            </h1>
            <span className="text-[10px] text-cyan-300/80 font-mono font-semibold tracking-wider mt-1">
              Dual Tesla T4 &bull; 5 TB Vault
            </span>
          </div>
        </div>

        {/* Center: Main View Tabs (Desktop Segmented Control) */}
        <nav className="hidden lg:flex items-center gap-1 bg-black/80 p-1 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.12)]">
          <button
            onClick={() => onNavigateTab("studio")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio &amp; Editor</span>
          </button>
          <button
            onClick={() => onNavigateTab("generators")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
              activeTab === "generators"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Generators</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-400/60 rounded-full text-[9px] text-amber-300 font-extrabold shadow-[0_0_8px_rgba(245,158,11,0.3)]">
              NEW
            </span>
          </button>
          <button
            onClick={() => onNavigateTab("loras")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
              activeTab === "loras"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Civitai LoRA Hub</span>
            {availableLorasCount > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-900 border border-cyan-500/40 rounded-full text-[10px] text-cyan-300 font-mono font-black">
                {availableLorasCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onNavigateTab("gallery")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
              activeTab === "gallery"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gallery</span>
            {galleryCount > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-700/80 rounded-full text-[10px] text-slate-300 font-mono font-bold">
                {galleryCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onNavigateTab("sentinel")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
              activeTab === "sentinel"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sentinel</span>
          </button>
        </nav>

        {/* Right: System Status Cluster with Minimum Touch Target Sizes */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Unified GPU Toggle Button */}
          {isConnected ? (
            <button
              onClick={() => onShutdownGpu()}
              disabled={isShuttingDown}
              title="GPU is Online. Click to turn off and save quota."
              className="group h-10 px-3 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-rose-500/25 border border-emerald-400/80 hover:border-rose-400 text-emerald-200 hover:text-rose-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 group-hover:bg-rose-400"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 group-hover:bg-rose-400"></span>
              </span>
              <span className="hidden sm:inline group-hover:hidden">GPU Online</span>
              <span className="inline sm:hidden group-hover:hidden">Online</span>
              <span className="hidden group-hover:inline text-rose-300">{isShuttingDown ? "Stopping..." : "Turn Off"}</span>
            </button>
          ) : isStartingGpu ? (
            <button
              onClick={() => onShutdownGpu()}
              disabled={isShuttingDown}
              title="GPU is booting on Kaggle (~90s). Click to halt."
              className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-rose-500/25 border border-amber-400/80 hover:border-rose-400 text-amber-200 hover:text-rose-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span className="hidden sm:inline">{isShuttingDown ? "Halting..." : "Booting GPU..."}</span>
              <span className="sm:hidden">{isShuttingDown ? "Stop" : "Booting"}</span>
            </button>
          ) : (
            <button
              onClick={() => onStartGpu()}
              title="Click to Turn On Kaggle Dual Tesla T4 GPU"
              className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-emerald-500/20 border border-amber-500/50 hover:border-emerald-400 text-amber-300 hover:text-emerald-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="hidden sm:inline">⚡ GPU Offline</span>
              <span className="sm:hidden">Offline</span>
              <span className="hidden md:inline text-[10px] text-slate-400 font-normal pl-0.5">&bull; Turn On</span>
            </button>
          )}

          {/* Theme Toggle Button (Minimum 40x40 touch target) */}
          <button
            onClick={() => onToggleTheme(theme === "day" ? "night" : "day")}
            title={theme === "day" ? "Switch to Night Mode" : "Switch to Day Mode"}
            className={`w-10 h-10 md:w-auto md:h-10 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-black transition active:scale-95 ${
              theme === "day"
                ? "bg-slate-100 hover:bg-white border-white/90 text-slate-900 shadow-[2px_2px_6px_rgba(163,177,198,0.45),-2px_-2px_6px_#ffffff]"
                : "bg-slate-900/90 hover:bg-slate-800 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            }`}
          >
            {theme === "day" ? (
              <>
                <Sun className="w-4 h-4 md:w-3.5 md:h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden md:inline font-extrabold tracking-wide">DAY NEO</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 md:w-3.5 md:h-3.5 text-cyan-300 fill-cyan-400/20" />
                <span className="hidden md:inline font-extrabold tracking-wide">NIGHT</span>
              </>
            )}
          </button>

          {/* Safety Toggle Button (Minimum 40x40 touch target) */}
          <button
            onClick={() => onToggleNsfwMode(!isNsfwMode)}
            title={isNsfwMode ? "NSFW Active (Click to enable SFW Safe Mode)" : "SFW Safe Mode Active (Click to unlock NSFW Mode)"}
            className={`w-10 h-10 md:w-auto md:h-10 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition active:scale-95 ${
              isNsfwMode
                ? "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            }`}
          >
            {isNsfwMode ? (
              <>
                <span className="text-sm leading-none">🔞</span>
                <span className="hidden md:inline font-extrabold tracking-wide">NSFW ON</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 md:w-3.5 md:h-3.5 text-emerald-400" />
                <span className="hidden md:inline font-extrabold tracking-wide">SFW SAFE</span>
              </>
            )}
          </button>

          {/* AI Guardian Health Status Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-ai-guardian"));
              }
            }}
            title="Open AI Health Guardian & Fix Sentinel (Health 95%)"
            className="h-10 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-mono font-bold transition active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[11px] font-black text-cyan-300">95%</span>
            <span className="w-4 h-4 rounded-full text-[9px] font-bold bg-amber-500 text-black flex items-center justify-center">1</span>
          </button>

          {/* Settings Button (Inspect backend tunnel URL, Minimum 40x40 touch target) */}
          <button
            onClick={onToggleAdvancedUrl}
            title="Inspect backend tunnel URL"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200 transition shadow-sm active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Hamburger Toggle (Minimum 40x40 touch target) */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition active:scale-95"
            title="Open Navigation Menu"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer / Dropdown */}
      {isMobileNavOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-cyan-500/25 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
          <button
            onClick={() => { onNavigateTab("studio"); setIsMobileNavOpen(false); }}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
              activeTab === "studio"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                : "bg-slate-900/80 border border-slate-800 text-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio &amp; Editor</span>
          </button>
          <button
            onClick={() => { onNavigateTab("generators"); setIsMobileNavOpen(false); }}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
              activeTab === "generators"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                : "bg-slate-900/80 border border-slate-800 text-slate-300"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Generators</span>
          </button>
          <button
            onClick={() => { onNavigateTab("loras"); setIsMobileNavOpen(false); }}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
              activeTab === "loras"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                : "bg-slate-900/80 border border-slate-800 text-slate-300"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Civitai LoRA Hub</span>
          </button>
          <button
            onClick={() => { onNavigateTab("gallery"); setIsMobileNavOpen(false); }}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
              activeTab === "gallery"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                : "bg-slate-900/80 border border-slate-800 text-slate-300"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gallery</span>
          </button>
          <button
            onClick={() => { onNavigateTab("sentinel"); setIsMobileNavOpen(false); }}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
              activeTab === "sentinel"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                : "bg-slate-900/80 border border-slate-800 text-slate-300"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sentinel</span>
          </button>
        </div>
      )}
    </header>
  );
}
