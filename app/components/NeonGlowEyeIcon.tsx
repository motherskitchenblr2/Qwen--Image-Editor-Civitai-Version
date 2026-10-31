"use client";

import React from "react";

export interface NeonGlowEyeIconProps {
  /** High-contrast neon palette: magenta, cyan, or electric green */
  color?: "magenta" | "cyan" | "green";
  className?: string;
  pulse?: boolean;
}

/**
 * Pure Glowline Outline Neon Eye Icon
 * Built using lightweight, single-weight vector paths in high-contrast cyan, magenta, or electric green.
 * Applies a Gaussian blur duplicate layer beneath the primary stroke to build a realistic neon tube effect.
 */
export function NeonGlowEyeIcon({
  color = "magenta",
  className = "w-10 h-10",
  pulse = true,
}: NeonGlowEyeIconProps) {
  const palette = {
    magenta: {
      primary: "#ff2a85",
      glow: "#f43f5e",
      deepGlow: "#e11d48",
      core: "#ffffff",
    },
    cyan: {
      primary: "#00f0ff",
      glow: "#06b6d4",
      deepGlow: "#0891b2",
      core: "#ffffff",
    },
    green: {
      primary: "#00ff88",
      glow: "#10b981",
      deepGlow: "#059669",
      core: "#ffffff",
    },
  }[color];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        pulse ? "animate-pulse" : ""
      }`}
      aria-label="Pure Glowline Neon Eye Indicator"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} overflow-visible`}
      >
        {/* Layer 1: Diffuse Ambient Gaussian Blur Halo */}
        <g
          className="opacity-55 filter blur-[5px]"
          stroke={palette.deepGlow}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 12C5 6.8 8.8 4.5 12 4.5C15.2 4.5 19 6.8 21.5 12C19 17.2 15.2 19.5 12 19.5C8.8 19.5 5 17.2 2.5 12Z" />
          <circle cx="12" cy="12" r="3.6" />
        </g>

        {/* Layer 2: Gaussian Blur Duplicate Layer Beneath Primary Stroke (Realistic Neon Tube Effect) */}
        <g
          className="opacity-95 filter blur-[2.4px]"
          stroke={palette.glow}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 12C5 6.8 8.8 4.5 12 4.5C15.2 4.5 19 6.8 21.5 12C19 17.2 15.2 19.5 12 19.5C8.8 19.5 5 17.2 2.5 12Z" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="1.4" fill={palette.glow} />
        </g>

        {/* Layer 3: Primary Crisp Single-Weight Vector Stroke (High-Contrast Neon Outline) */}
        <g
          stroke={palette.primary}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 12C5 6.8 8.8 4.5 12 4.5C15.2 4.5 19 6.8 21.5 12C19 17.2 15.2 19.5 12 19.5C8.8 19.5 5 17.2 2.5 12Z" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="1.4" fill={palette.primary} />
        </g>

        {/* Layer 4: Ultra-Fine Hot Neon Tube Core (Realistic Glass Discharge Filament) */}
        <g
          stroke={palette.core}
          strokeWidth="0.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-85"
        >
          <path d="M3.8 12C5.8 7.8 9 5.4 12 5.4C15 5.4 18.2 7.8 20.2 12" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="13.2" cy="10.8" r="0.6" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

export default NeonGlowEyeIcon;
