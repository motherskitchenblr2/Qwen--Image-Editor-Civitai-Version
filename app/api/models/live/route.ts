import { NextRequest, NextResponse } from "next/server";
import { getConsolidatedLiveProviders, AiProviderPlatform, LiveAiModel } from "@/app/lib/aiModelRegistry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerParam = searchParams.get("provider")?.toLowerCase();
    const freeOnly = searchParams.get("free_only") !== "false"; // Default TRUE to enforce free-tier safety!
    const modeParam = searchParams.get("mode")?.toLowerCase(); // "generate" | "edit" | "text" | "all"
    const forceRefresh = searchParams.get("refresh") === "true";

    const { providers, updatedAt, isCached, totalModels, freeModelsCount } =
      await getConsolidatedLiveProviders(forceRefresh);

    let filteredProviders: AiProviderPlatform[] = JSON.parse(JSON.stringify(providers));

    // Filter models within each provider
    filteredProviders = filteredProviders.map((p) => {
      let models = p.models;

      // 1. Enforce Free & Free-Tier Only filter
      if (freeOnly) {
        models = models.filter((m) => m.isFree || m.isFreeTier);
      }

      // 2. Filter by generation mode if specified
      if (modeParam && modeParam !== "all") {
        models = models.filter((m) => {
          if (modeParam === "generate") return m.type === "text2img" || m.type === "both";
          if (modeParam === "edit") return m.type === "img2img" || m.type === "both";
          if (modeParam === "text") return m.type === "text" || m.type === "multimodal";
          return true;
        });
      }

      return {
        ...p,
        models,
      };
    });

    // If specific provider requested, filter top-level list
    if (providerParam && providerParam !== "all") {
      filteredProviders = filteredProviders.filter((p) => p.id === providerParam);
    }

    // Consolidated flat list of all matching models
    const allFilteredModels: LiveAiModel[] = filteredProviders.flatMap((p) => p.models);

    return NextResponse.json({
      success: true,
      safeguard_active: freeOnly,
      safeguard_status: freeOnly
        ? "🛡️ Free Tier Safe Mode Active: Zero-cost models only"
        : "⚠️ Earning Mode Active: Paid models unlocked",
      is_cached: isCached,
      updated_at: updatedAt,
      total_models: totalModels,
      free_models_count: freeModelsCount,
      providers: filteredProviders,
      models: allFilteredModels,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to retrieve live AI models",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const forceRefresh = Boolean(body.force_refresh ?? true);

    const { providers, updatedAt, totalModels, freeModelsCount } =
      await getConsolidatedLiveProviders(forceRefresh);

    return NextResponse.json({
      success: true,
      message: "Live AI model providers refreshed successfully from upstream registries.",
      updated_at: updatedAt,
      total_models: totalModels,
      free_models_count: freeModelsCount,
      providers,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to refresh live AI model registry",
      },
      { status: 500 }
    );
  }
}
