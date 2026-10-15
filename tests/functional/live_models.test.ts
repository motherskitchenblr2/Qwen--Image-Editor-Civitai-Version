import { describe, it, expect, vi } from "vitest";
import {
  BASE_PROVIDERS,
  getConsolidatedLiveProviders,
  fetchLiveOpenRouterFreeModels,
  fetchLiveHuggingFaceModels,
} from "@/app/lib/aiModelRegistry";

describe("Live AI Model Registry & Free-Tier Safeguard", () => {
  it("provides comprehensive base catalog with guaranteed free models for all core platforms", () => {
    expect(BASE_PROVIDERS.length).toBeGreaterThanOrEqual(7);

    const platformIds = BASE_PROVIDERS.map((p) => p.id);
    expect(platformIds).toContain("nanobanana");
    expect(platformIds).toContain("kaggle");
    expect(platformIds).toContain("openrouter");
    expect(platformIds).toContain("cloudflare_ai");
    expect(platformIds).toContain("gemini");
    expect(platformIds).toContain("groq");
    expect(platformIds).toContain("mistral");

    // Verify Nano Banana has 100% free models requiring no API key
    const nanoBanana = BASE_PROVIDERS.find((p) => p.id === "nanobanana");
    expect(nanoBanana).toBeDefined();
    expect(nanoBanana?.models.length).toBeGreaterThanOrEqual(5);

    for (const m of nanoBanana!.models) {
      expect(m.isFree).toBe(true);
      expect(m.requiresApiKey).toBe(false);
      expect(m.pricingLabel).toContain("100% Free");
    }
  });

  it("fetches consolidated live models and accurately counts free-tier models", async () => {
    const result = await getConsolidatedLiveProviders(false);
    expect(result.providers.length).toBeGreaterThanOrEqual(7);
    expect(result.totalModels).toBeGreaterThan(15);
    expect(result.freeModelsCount).toBeGreaterThan(10);
    expect(result.updatedAt).toBeDefined();
  });

  it("gracefully falls back when upstream provider APIs encounter network timeout", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
    vi.stubGlobal("fetch", mockFetch);

    const openRouterModels = await fetchLiveOpenRouterFreeModels();
    expect(openRouterModels).toEqual([]);

    const hfModels = await fetchLiveHuggingFaceModels();
    expect(hfModels).toEqual([]);

    vi.unstubAllGlobals();
  });
});
