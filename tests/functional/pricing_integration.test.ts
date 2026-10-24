import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { LIVE_MODEL_REGISTRY } from "@/app/lib/aiModelRegistry";
import { calculateStudioJobTotal } from "@/app/lib/pricingCalculator";
import * as pricingRoute from "@/app/api/pricing/estimate/route";

describe("Integration: Pricing Engine & Model Catalog", () => {
  it("validates every registered free-tier model resolves to zero cost", () => {
    const freeModels = LIVE_MODEL_REGISTRY.filter((m) => m.free);
    expect(freeModels.length).toBeGreaterThan(0);

    for (const model of freeModels) {
      const calculation = calculateStudioJobTotal({
        modelId: model.id,
        isFreeTier: true,
        resolution: "1024x1024",
        steps: 20,
        loraCount: 1,
        batchCount: 1,
      });

      expect(calculation.totalCents).toBe(0);
      expect(calculation.isFreeTier).toBe(true);
    }
  });

  it("serves live price estimates via /api/pricing/estimate HTTP route handler", async () => {
    const req = new NextRequest("http://localhost:3000/api/pricing/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: "dashscope-qwen-image-edit",
        resolution: "1024x1024",
        steps: 30,
        loraCount: 1,
        batchCount: 1,
      }),
    });

    const res = await pricingRoute.POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pricing.formattedTotal).toMatch(/^\$\d+\.\d{2}$/);
  });
});
