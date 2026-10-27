// @vitest-environment happy-dom
import React, { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import ImagePreviewModal, { PreviewMediaData } from "@/app/components/ImagePreviewModal";

describe("ImagePreviewModal Fullscreen Lightbox & Uncropped Media Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ImagePreviewModal
        isOpen={false}
        onClose={vi.fn()}
        media={{ src: "https://example.com/test.png" }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders uncropped image preview with title, metadata, and handles close", () => {
    const onClose = vi.fn();
    const media: PreviewMediaData = {
      src: "https://example.com/cyberpunk.png",
      title: "Cyberpunk Samurai",
      subtitle: "by CivitaiMaster",
      baseModel: "SDXL 1.0",
      sizeMB: "144.5",
      triggerWords: ["cyberpunk_style", "neon_glow"],
      downloadFileName: "cyberpunk_samurai.png",
      actionButton: {
        label: "Select for Studio",
        onClick: vi.fn(),
      },
    };

    render(<ImagePreviewModal isOpen={true} onClose={onClose} media={media} />);

    // Verify Title & Subtitle
    expect(screen.getByText("Cyberpunk Samurai")).toBeDefined();
    expect(screen.getByText("by CivitaiMaster")).toBeDefined();
    expect(screen.getByText("SDXL 1.0")).toBeDefined();
    expect(screen.getByText("144.5 MB")).toBeDefined();

    // Verify uncropped image tag
    const img = screen.getByAltText("Cyberpunk Samurai");
    expect(img).toBeDefined();
    expect(img.className).toContain("object-contain");

    // Verify Trigger Words
    expect(screen.getByText("cyberpunk_style")).toBeDefined();
    expect(screen.getByText("neon_glow")).toBeDefined();

    // Click Close Button
    const closeBtn = screen.getByTitle(/close preview/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <ImagePreviewModal
        isOpen={true}
        onClose={onClose}
        media={{ src: "https://example.com/test.png", title: "Escape Test" }}
      />
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("renders video element when isVideo is true", () => {
    const media: PreviewMediaData = {
      src: "https://example.com/preview.mp4",
      title: "Animated Preview",
      isVideo: true,
    };

    const { container } = render(
      <ImagePreviewModal isOpen={true} onClose={vi.fn()} media={media} />
    );

    const video = container.querySelector("video");
    expect(video).toBeDefined();
    expect(video?.className).toContain("object-contain");
  });

  it("executes action button callback and closes modal", () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    const media: PreviewMediaData = {
      src: "https://example.com/test.png",
      title: "Action Test",
      actionButton: {
        label: "Refine in Studio",
        onClick: onAction,
      },
    };

    render(<ImagePreviewModal isOpen={true} onClose={onClose} media={media} />);

    const actionBtn = screen.getAllByRole("button", { name: /refine in studio/i })[0];
    fireEvent.click(actionBtn);

    expect(onAction).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
