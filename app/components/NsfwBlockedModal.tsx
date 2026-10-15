"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";
import { NSFW_BLOCKED_MESSAGE } from "@/app/lib/nsfwFilter";

interface NsfwBlockedModalProps {
  onOpenSettings?: () => void;
}

export default function NsfwBlockedModal({ onOpenSettings }: NsfwBlockedModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };

    window.addEventListener("trigger-nsfw-blocked", handleTrigger);
    return () => {
      window.removeEventListener("trigger-nsfw-blocked", handleTrigger);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-950 border-2 border-rose-500/80 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.4)] p-6 text-center space-y-5 animate-scaleUp">
        {/* Pulsing Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
          <ShieldAlert className="w-9 h-9 animate-pulse" />
        </div>

        {/* Exact Error Message Required by User */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white tracking-wide drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
            {NSFW_BLOCKED_MESSAGE}
          </h2>
          <p className="text-xs text-rose-200/80 font-medium">
            This request was blocked under active SFW Mode.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.4)] transition active:scale-95"
          >
            Dismiss
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition"
            >
              Open Settings
            </button>
          )}
        </div>

        {/* Close Corner Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 text-slate-500 hover:text-white p-1 rounded-lg transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
