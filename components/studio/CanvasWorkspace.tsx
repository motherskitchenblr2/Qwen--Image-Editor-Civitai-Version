"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Paintbrush,
  Undo2,
  Trash2,
  Sparkles,
  Sliders,
  Copy,
  Check,
  SplitSquareVertical,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";

interface CanvasWorkspaceProps {
  originalImage: string | null;
  editedImage: string | null;
  studioMode: "edit" | "generate";
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendResultToInput: () => void;
  onMaskChange?: (maskBase64: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isGenerating?: boolean;
  generationProgress?: number;
}

export default function CanvasWorkspace({
  originalImage,
  editedImage,
  studioMode,
  onUploadImage,
  onSendResultToInput,
  onMaskChange,
  fileInputRef,
  isGenerating = false,
  generationProgress = 0,
}: CanvasWorkspaceProps) {
  // View Modes: "split" | "result" | "original" | "opacity"
  const [viewMode, setViewMode] = useState<"split" | "result" | "original" | "opacity">("split");
  const [splitPos, setSplitPos] = useState<number>(50); // 0 to 100 %
  const [opacityBlend, setOpacityBlend] = useState<number>(100); // 0 to 100 %
  const [zoomLevel, setZoomLevel] = useState<number>(100); // percentage

  // Inpaint Mask Brush State
  const [isInpaintingActive, setIsInpaintingActive] = useState<boolean>(false);
  const [brushRadius, setBrushRadius] = useState<number>(24);
  const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Aspect ratio guide preset (null = original/free)
  const [aspectPreset, setAspectPreset] = useState<string | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingSplitRef = useRef<boolean>(false);
  const isPaintingRef = useRef<boolean>(false);

  // Auto-switch to split or result based on available images
  useEffect(() => {
    if (originalImage && editedImage) {
      setViewMode("split");
    } else if (editedImage) {
      setViewMode("result");
    } else if (originalImage) {
      setViewMode("original");
    }
  }, [editedImage, originalImage]);

  // Synchronize Mask Canvas size with Image natural dimensions
  const syncCanvasDimensions = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (canvas && img && img.naturalWidth && img.naturalHeight) {
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, []);

  const handleImageLoad = () => {
    syncCanvasDimensions();
  };

  // ── Split Slider Drag Handlers ──
  const handleSplitMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDraggingSplitRef.current = true;
  };

  const handleSplitMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSplitRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSplitPos(newPos);
  }, []);

  const handleSplitMouseUp = useCallback(() => {
    isDraggingSplitRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleSplitMouseMove);
    window.addEventListener("mouseup", handleSplitMouseUp);
    window.addEventListener("touchmove", handleSplitMouseMove);
    window.addEventListener("touchend", handleSplitMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleSplitMouseMove);
      window.removeEventListener("mouseup", handleSplitMouseUp);
      window.removeEventListener("touchmove", handleSplitMouseMove);
      window.removeEventListener("touchend", handleSplitMouseUp);
    };
  }, [handleSplitMouseMove, handleSplitMouseUp]);

  // ── Inpaint Brush Drawing Logic ──
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startPainting = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInpaintingActive) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save history for undo
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setMaskHistory((prev) => [...prev.slice(-9), currentFrame]);

    isPaintingRef.current = true;
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushRadius * (canvas.width / (canvas.clientWidth || 1));
    ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
    ctx.fillStyle = "rgba(244, 63, 94, 0.75)";

    ctx.arc(x, y, (brushRadius * (canvas.width / (canvas.clientWidth || 1))) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawPainting = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current || !isInpaintingActive) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopPainting = () => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    exportMask();
  };

  const handleUndoMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas || maskHistory.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lastState = maskHistory[maskHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setMaskHistory((prev) => prev.slice(0, -1));
    exportMask();
  };

  const handleClearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMaskHistory([]);
    if (onMaskChange) onMaskChange(null);
  };

  const handleInvertMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i + 3] = 0; // unmask
      } else {
        data[i] = 244;
        data[i + 1] = 63;
        data[i + 2] = 94;
        data[i + 3] = 190; // mask
      }
    }
    ctx.putImageData(imgData, 0, 0);
    exportMask();
  };

  const exportMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !onMaskChange) return;

    // Create a temporary binary export canvas: white for mask, black for untouched
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    const srcCtx = canvas.getContext("2d");
    if (!srcCtx) return;

    const srcData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
    const expData = expCtx.createImageData(canvas.width, canvas.height);

    let hasPaintedPixels = false;
    for (let i = 0; i < srcData.data.length; i += 4) {
      if (srcData.data[i + 3] > 20) {
        hasPaintedPixels = true;
        expData.data[i] = 255;
        expData.data[i + 1] = 255;
        expData.data[i + 2] = 255;
        expData.data[i + 3] = 255;
      } else {
        expData.data[i] = 0;
        expData.data[i + 1] = 0;
        expData.data[i + 2] = 0;
        expData.data[i + 3] = 255;
      }
    }

    if (!hasPaintedPixels) {
      onMaskChange(null);
      return;
    }

    expCtx.putImageData(expData, 0, 0);
    const maskDataUrl = exportCanvas.toDataURL("image/png");
    onMaskChange(maskDataUrl);
  };

  const handleCopyImage = async () => {
    const target = editedImage || originalImage;
    if (!target) return;
    try {
      const response = await fetch(target);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  };

  const activeDisplayImage = editedImage || originalImage;

  return (
    <div className="flex-1 w-full flex flex-col gap-3 min-h-[360px] lg:min-h-[500px] max-h-full overflow-hidden select-none">
      {/* ── Top Workspace Toolbar (Aligned with Mode Switch) ── */}
      <div className="min-h-[48px] h-12 flex items-center justify-between gap-2 px-3 sm:px-4 bg-slate-950/85 border border-cyan-500/35 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.12)] shrink-0">
        {/* Left: View Mode Toggles */}
        <div className="flex items-center gap-1 bg-black/80 p-1 rounded-xl border border-cyan-500/30">
          {originalImage && editedImage && (
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition ${
                viewMode === "split"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "text-slate-300 hover:text-white"
              }`}
              title="Interactive Before/After Curtain Split Slider"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Split Wipe</span>
            </button>
          )}

          <button
            onClick={() => setViewMode("result")}
            disabled={!editedImage}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition ${
              viewMode === "result"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : editedImage
                ? "text-slate-300 hover:text-white"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            <span>Result</span>
          </button>

          <button
            onClick={() => setViewMode("original")}
            disabled={!originalImage}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition ${
              viewMode === "original"
                ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : originalImage
                ? "text-slate-300 hover:text-white"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            <span>Original</span>
          </button>

          {originalImage && editedImage && (
            <button
              onClick={() => setViewMode("opacity")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition ${
                viewMode === "opacity"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "text-slate-300 hover:text-white"
              }`}
              title="Opacity blend overlay"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blend</span>
            </button>
          )}
        </div>

        {/* Center: Inpaint Mask Mode Toggle */}
        {originalImage && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsInpaintingActive(!isInpaintingActive)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition border ${
                isInpaintingActive
                  ? "bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>{isInpaintingActive ? "Mask Active" : "Inpaint Mask"}</span>
            </button>

            {isInpaintingActive && (
              <div className="flex items-center gap-1 bg-black/80 px-2 py-1 rounded-xl border border-rose-500/30">
                <span className="text-[10px] text-slate-400 font-mono">{brushRadius}px</span>
                <input
                  type="range"
                  min="6"
                  max="70"
                  value={brushRadius}
                  onChange={(e) => setBrushRadius(parseInt(e.target.value))}
                  className="w-16 accent-rose-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
                <button
                  onClick={handleUndoMask}
                  disabled={maskHistory.length === 0}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Undo stroke"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleClearMask}
                  className="p-1 rounded text-slate-400 hover:text-rose-400"
                  title="Clear mask"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right: Zoom & Aspect Presets */}
        <div className="flex items-center gap-2">
          {/* Aspect Presets */}
          <div className="hidden xl:flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-slate-800">
            {["1:1", "16:9", "9:16", "4:5"].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectPreset(aspectPreset === ratio ? null : ratio)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  aspectPreset === ratio
                    ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/60"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Zoom buttons */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-cyan-300 w-9 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 text-slate-400 hover:text-white transition ml-0.5"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Canvas Viewport ── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[320px] sm:min-h-[360px] lg:min-h-[460px] bg-slate-950/90 border border-cyan-500/35 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.85)] group"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onUploadImage}
          accept="image/*"
          className="hidden"
        />

        {/* Generating Overlay Animation */}
        {isGenerating && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="p-4 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-white">Synthesizing Diffusion Latents...</p>
              <p className="text-xs font-mono text-cyan-300 font-bold">{generationProgress}%</p>
            </div>
          </div>
        )}

        {/* Image Display & Split Wipe Layer */}
        {activeDisplayImage ? (
          <div
            className={`relative flex items-center justify-center transition-transform duration-200 ${
              aspectPreset === "1:1"
                ? "aspect-square"
                : aspectPreset === "16:9"
                ? "aspect-video"
                : aspectPreset === "9:16"
                ? "aspect-[9/16]"
                : aspectPreset === "4:5"
                ? "aspect-[4/5]"
                : ""
            }`}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* View Mode: Split Curtain Wipe */}
            {viewMode === "split" && originalImage && editedImage ? (
              <div className="relative max-h-[580px] w-auto overflow-hidden rounded-2xl shadow-2xl select-none">
                {/* Underneath: Result Image */}
                <img
                  ref={imageRef}
                  src={editedImage}
                  alt="Result"
                  onLoad={handleImageLoad}
                  className="max-h-[580px] w-auto object-contain block"
                />

                {/* Overlaid: Original Image clipped by split percentage */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${splitPos}%` }}
                >
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-h-[580px] w-auto object-contain block max-w-none"
                    style={{ width: containerRef.current?.clientWidth || "100%" }}
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 rounded text-[10px] font-mono font-bold">
                    ORIGINAL
                  </div>
                </div>

                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/80 backdrop-blur-md border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono font-bold">
                  RESULT
                </div>

                {/* Draggable Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)] cursor-ew-resize z-20"
                  style={{ left: `${splitPos}%` }}
                  onMouseDown={handleSplitMouseDown}
                  onTouchStart={handleSplitMouseDown}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-cyan-400 text-black flex items-center justify-center font-black text-[10px] shadow-[0_0_15px_rgba(6,182,212,0.8)] border-2 border-black">
                    ‹›
                  </div>
                </div>
              </div>
            ) : viewMode === "opacity" && originalImage && editedImage ? (
              /* View Mode: Opacity Overlay Blend */
              <div className="relative max-h-[580px] w-auto overflow-hidden rounded-2xl shadow-2xl">
                <img
                  ref={imageRef}
                  src={originalImage}
                  alt="Original"
                  onLoad={handleImageLoad}
                  className="max-h-[580px] w-auto object-contain block"
                />
                <img
                  src={editedImage}
                  alt="Result Blend"
                  style={{ opacity: opacityBlend / 100 }}
                  className="absolute inset-0 max-h-[580px] w-auto object-contain block transition-opacity duration-150"
                />
              </div>
            ) : (
              /* View Mode: Single Image (Result or Original) */
              <div className="relative max-h-[580px] w-auto overflow-hidden rounded-2xl shadow-2xl">
                <img
                  ref={imageRef}
                  src={viewMode === "result" && editedImage ? editedImage : originalImage!}
                  alt="Canvas display"
                  onLoad={handleImageLoad}
                  className="max-h-[580px] w-auto object-contain block"
                />
              </div>
            )}

            {/* Inpainting HTML5 Mask Canvas Layer */}
            <canvas
              ref={maskCanvasRef}
              onMouseDown={startPainting}
              onMouseMove={drawPainting}
              onMouseUp={stopPainting}
              onMouseLeave={stopPainting}
              className={`absolute inset-0 w-full h-full cursor-crosshair z-10 ${
                isInpaintingActive ? "pointer-events-auto" : "pointer-events-none"
              }`}
            />
          </div>
        ) : studioMode === "generate" ? (
          /* Empty State: Text-to-Image Generation Mode */
          <div className="flex flex-col items-center gap-3 p-8 text-center max-w-sm">
            <div className="p-5 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/60 rounded-3xl text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.35)] animate-pulse">
              <Sparkles className="w-10 h-10" />
            </div>
            <div>
              <p className="text-base font-black text-white">Text-to-Image Studio Canvas</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enter your instruction or subject in the left panel and click &quot;Generate Image&quot;.
              </p>
            </div>
          </div>
        ) : (
          /* Empty State: Image-to-Image Edit Mode (Upload Dropzone) */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-2xl h-[420px] border-2 border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/30 hover:border-cyan-500/50 hover:bg-slate-900/50 transition-all cursor-pointer p-6 text-center group/drop"
          >
            <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-2xl text-cyan-400 group-hover/drop:text-white group-hover/drop:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all mb-4">
              <Upload className="w-10 h-10 group-hover/drop:scale-110 transition-transform" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <p className="text-base font-black text-white">Upload source image to begin editing</p>
              <p className="text-xs text-slate-400">
                Drag and drop your image here, or select from your device
              </p>
              <p className="text-[11px] font-mono text-cyan-300/70 pt-1">
                Supported formats: PNG, JPG, WebP (up to 10MB)
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 group-hover/drop:shadow-cyan-500/40 transition active:scale-[0.99] flex items-center gap-2 pointer-events-none"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse or Drag Image Here</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Floating Utility Dock ── */}
        {activeDisplayImage && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/85 backdrop-blur-xl p-1.5 rounded-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.3)] z-20">
            {editedImage && (
              <button
                onClick={onSendResultToInput}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition active:scale-95"
                title="Send current result as input for next edit iteration"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refine</span>
              </button>
            )}

            <button
              onClick={handleCopyImage}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
              title="Copy to clipboard"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <a
              href={editedImage || originalImage!}
              download="qwen_studio_masterpiece.png"
              className="p-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)] transition"
              title="Download image"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Opacity slider bar when blend mode is active */}
      {viewMode === "opacity" && originalImage && editedImage && (
        <div className="flex items-center gap-3 px-4 py-2 bg-black/70 border border-purple-500/30 rounded-xl text-xs">
          <span className="text-slate-400 font-bold shrink-0">Original (0%)</span>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityBlend}
            onChange={(e) => setOpacityBlend(parseInt(e.target.value))}
            className="flex-1 accent-purple-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
          <span className="text-purple-300 font-bold shrink-0">Result ({opacityBlend}%)</span>
        </div>
      )}
    </div>
  );
}
