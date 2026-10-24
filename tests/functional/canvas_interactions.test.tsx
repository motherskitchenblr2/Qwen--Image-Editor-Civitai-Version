// @vitest-environment happy-dom
import React, { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import Header from "@/app/components/Header";
import CanvasWorkspace from "@/app/components/studio/CanvasWorkspace";
import ControlPanel from "@/app/components/studio/ControlPanel";

describe("Studio Interactive Canvas & Navigation UX Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [],
          totalModels: 0,
          freeModelsCount: 0,
          updatedAt: new Date().toISOString(),
        }),
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("Header Navigation, Responsive Tabs & Quick Toggles", () => {
    it("renders all 5 main navigation tabs and dispatches tab switching events", () => {
      const onNavigateTab = vi.fn();
      const onToggleTheme = vi.fn();
      const onToggleNsfwMode = vi.fn();

      render(
        <Header
          theme="night"
          onToggleTheme={onToggleTheme}
          isNsfwMode={false}
          onToggleNsfwMode={onToggleNsfwMode}
          isConnected={true}
          isStartingGpu={false}
          isShuttingDown={false}
          onStartGpu={vi.fn()}
          onShutdownGpu={vi.fn()}
          showAdvancedUrl={false}
          onToggleAdvancedUrl={vi.fn()}
          activeTab="studio"
          onNavigateTab={onNavigateTab}
          availableLorasCount={12}
          galleryCount={5}
        />
      );

      // Verify brand title
      expect(screen.getByText("Qwen Image Editor Studio")).toBeDefined();

      // Click "AI Generators" tab
      const generatorsTab = screen.getByRole("button", { name: /ai generators/i });
      fireEvent.click(generatorsTab);
      expect(onNavigateTab).toHaveBeenCalledWith("generators");

      // Click "Civitai LoRA Hub" tab
      const lorasTab = screen.getByRole("button", { name: /civitai lora hub/i });
      fireEvent.click(lorasTab);
      expect(onNavigateTab).toHaveBeenCalledWith("loras");

      // Click "Gallery" tab
      const galleryTab = screen.getByRole("button", { name: /gallery/i });
      fireEvent.click(galleryTab);
      expect(onNavigateTab).toHaveBeenCalledWith("gallery");

      // Click "Sentinel" tab
      const sentinelTab = screen.getByRole("button", { name: /sentinel/i });
      fireEvent.click(sentinelTab);
      expect(onNavigateTab).toHaveBeenCalledWith("sentinel");

      // Click "Studio & Editor" tab
      const studioTab = screen.getByRole("button", { name: /studio & editor/i });
      fireEvent.click(studioTab);
      expect(onNavigateTab).toHaveBeenCalledWith("studio");
    });

    it("toggles Night/Day theme and SFW/NSFW safety controls", () => {
      const onToggleTheme = vi.fn();
      const onToggleNsfwMode = vi.fn();

      render(
        <Header
          theme="night"
          onToggleTheme={onToggleTheme}
          isNsfwMode={false}
          onToggleNsfwMode={onToggleNsfwMode}
          isConnected={true}
          isStartingGpu={false}
          isShuttingDown={false}
          onStartGpu={vi.fn()}
          onShutdownGpu={vi.fn()}
          showAdvancedUrl={false}
          onToggleAdvancedUrl={vi.fn()}
          activeTab="studio"
          onNavigateTab={vi.fn()}
        />
      );

      // Toggle Theme: night -> day
      const themeToggle = screen.getByTitle(/switch to day mode/i);
      fireEvent.click(themeToggle);
      expect(onToggleTheme).toHaveBeenCalledWith("day");

      // Toggle SFW / NSFW: safe -> unlocked
      const nsfwToggle = screen.getByTitle(/sfw safe mode active/i);
      fireEvent.click(nsfwToggle);
      expect(onToggleNsfwMode).toHaveBeenCalledWith(true);
    });
  });

  describe("Interactive Split-Wipe Curtain Comparison", () => {
    it("renders dual-image split wipe view and allows dragging the divider handle", () => {
      const original = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const edited = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const { container } = render(
        <CanvasWorkspace
          originalImage={original}
          editedImage={edited}
          studioMode="edit"
          onUploadImage={vi.fn()}
          onSendResultToInput={vi.fn()}
          fileInputRef={{ current: null }}
        />
      );

      // Verify Split view mode button is rendered
      const splitButton = screen.getByRole("button", { name: /split wipe/i });
      expect(splitButton).toBeDefined();

      // Find split wipe divider handle
      const dividerHandle = screen.getByText("‹›");
      expect(dividerHandle).toBeDefined();

      // Mock bounding rect on containerRef element (.flex-1.min-h-0.relative)
      const containerViewport = container.querySelector(".flex-1.min-h-0.relative");
      if (containerViewport) {
        vi.spyOn(containerViewport, "getBoundingClientRect").mockReturnValue({
          left: 100,
          top: 50,
          width: 400,
          height: 400,
          right: 500,
          bottom: 450,
          x: 100,
          y: 50,
          toJSON: () => {},
        });
      }

      // Initiate mouse down on divider handle
      act(() => {
        fireEvent.mouseDown(dividerHandle, { preventDefault: vi.fn() });
      });

      // Drag across viewport to 75% position (clientX = 100 + 300 = 400)
      act(() => {
        window.dispatchEvent(new MouseEvent("mousemove", { clientX: 400 }));
      });

      // Release drag
      act(() => {
        window.dispatchEvent(new MouseEvent("mouseup"));
      });

      // Verify the divider parent container has an updated style
      const dividerLine = dividerHandle.parentElement;
      expect(dividerLine?.style.left).toBe("75%");
    });
  });

  describe("HTML5 Inpaint Mask Brush & Canvas Layer", () => {
    it("activates inpaint brush mode and records strokes on mask canvas", () => {
      const original = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const onMaskChange = vi.fn();

      const { container } = render(
        <CanvasWorkspace
          originalImage={original}
          editedImage={null}
          studioMode="edit"
          onUploadImage={vi.fn()}
          onSendResultToInput={vi.fn()}
          onMaskChange={onMaskChange}
          fileInputRef={{ current: null }}
        />
      );

      // Toggle inpainting brush on
      const brushButton = screen.getByRole("button", { name: /inpaint mask/i });
      act(() => {
        fireEvent.click(brushButton);
      });

      // Verify brush radius slider is displayed
      expect(screen.getByText("24px")).toBeDefined();

      // Find canvas element
      const maskCanvas = container.querySelector("canvas");
      expect(maskCanvas).toBeDefined();
      expect(maskCanvas?.className).toContain("cursor-crosshair");

      // Simulate mouse drawing strokes
      if (maskCanvas) {
        const mockCtx = {
          clearRect: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
          putImageData: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
        };
        vi.spyOn(maskCanvas, "getContext").mockReturnValue(mockCtx as any);
        vi.spyOn(maskCanvas, "toDataURL").mockReturnValue("data:image/png;base64,fake_mask");

        act(() => {
          fireEvent.mouseDown(maskCanvas, { clientX: 50, clientY: 50 });
          fireEvent.mouseMove(maskCanvas, { clientX: 60, clientY: 60 });
          fireEvent.mouseUp(maskCanvas);
        });

        expect(mockCtx.beginPath).toHaveBeenCalled();
      }
    });
  });

  describe("ControlPanel Mode Switching & Kaggle GPU Direct T2I", () => {
    it("enables primary CTA in Generate mode with kaggle-gpu when online without requiring an uploaded image", async () => {
      const handleGenerate = vi.fn();

      await act(async () => {
        render(
          <ControlPanel
            studioMode="generate"
            setStudioMode={vi.fn()}
            selectedStudioModel="kaggle-gpu"
            setSelectedStudioModel={vi.fn()}
            prompt="Cyberpunk neon city street in Tokyo at midnight"
            setPrompt={vi.fn()}
            negativePrompt=""
            setNegativePrompt={vi.fn()}
            handleEnhancePrompt={vi.fn()}
            isEnhancingPrompt={false}
            showToast={vi.fn()}
            steps={4}
            setSteps={vi.fn()}
            trueCfgScale={1.0}
            setTrueCfgScale={vi.fn()}
            guidanceScale={1.0}
            setGuidanceScale={vi.fn()}
            seed=""
            setSeed={vi.fn()}
            activeLoras={[]}
            setActiveLoras={vi.fn()}
            availableLoras={[]}
            onOpenLoraModal={vi.fn()}
            handleFuseLora={vi.fn()}
            handleUnloadLoras={vi.fn()}
            isFusingLora={false}
            fusedStatusMessage=""
            isConnected={true}
            isModelReady={true}
            modelStatusMessage=""
            handleGenerate={handleGenerate}
            isGenerating={false}
            originalImage={null}
            generationStatusText=""
            generationProgress={0}
            generationElapsed={0}
            onSwitchToCloud={vi.fn()}
          />
        );
      });

      // The segmented mode toggle has text "🎨 Generate Image"
      // The action buttons have exact text "Generate Image" (without the palette emoji)
      const allButtons = screen.getAllByRole("button");
      const primaryCta = allButtons.find(
        (b) => b.textContent?.trim() === "Generate Image"
      );
      expect(primaryCta).toBeDefined();
      expect(primaryCta?.hasAttribute("disabled")).toBe(false);

      // Click generate primary CTA
      act(() => {
        fireEvent.click(primaryCta!);
      });
      expect(handleGenerate).toHaveBeenCalledTimes(1);
    });

    it("disables primary CTA in Edit mode when no originalImage is uploaded", async () => {
      const handleGenerate = vi.fn();

      await act(async () => {
        render(
          <ControlPanel
            studioMode="edit"
            setStudioMode={vi.fn()}
            selectedStudioModel="kaggle-gpu"
            setSelectedStudioModel={vi.fn()}
            prompt="Add fireworks in the sky"
            setPrompt={vi.fn()}
            negativePrompt=""
            setNegativePrompt={vi.fn()}
            handleEnhancePrompt={vi.fn()}
            isEnhancingPrompt={false}
            showToast={vi.fn()}
            steps={4}
            setSteps={vi.fn()}
            trueCfgScale={1.0}
            setTrueCfgScale={vi.fn()}
            guidanceScale={1.0}
            setGuidanceScale={vi.fn()}
            seed=""
            setSeed={vi.fn()}
            activeLoras={[]}
            setActiveLoras={vi.fn()}
            availableLoras={[]}
            onOpenLoraModal={vi.fn()}
            handleFuseLora={vi.fn()}
            handleUnloadLoras={vi.fn()}
            isFusingLora={false}
            fusedStatusMessage=""
            isConnected={true}
            isModelReady={true}
            modelStatusMessage=""
            handleGenerate={handleGenerate}
            isGenerating={false}
            originalImage={null}
            generationStatusText=""
            generationProgress={0}
            generationElapsed={0}
            onSwitchToCloud={vi.fn()}
          />
        );
      });

      // Verify button is disabled in Edit mode without an image
      const allButtons = screen.getAllByRole("button");
      const primaryCta = allButtons.find(
        (b) => b.textContent?.trim() === "Apply Image Edit"
      );
      expect(primaryCta).toBeDefined();
      expect(primaryCta?.hasAttribute("disabled")).toBe(true);

      // Helper message is shown
      expect(screen.getAllByText("Upload an image to enable editing").length).toBeGreaterThan(0);
    });
  });
});
