import { describe, it, expect } from "vitest";
import {
  calculateStudioJobTotal,
  PricingValidationError,
  type StudioJobPricingInput,
} from "@/app/lib/pricingCalculator";

describe("Unit: calculateStudioJobTotal (TDD RED Phase)", () => {
  it("evaluates free-tier models (Pollinations, Kaggle GPU) to exactly $0.00", () => {
    const input: StudioJobPricingInput = {
      modelId: "pollinations-flux",
      isFreeTier: true,
      resolution: "1024x1024",
      steps: 25,
      loraCount: 0,
      batchCount: 1,
    };

    const result = calculateStudioJobTotal(input);

    expect(result.totalCents).toBe(0);
    expect(result.formattedTotal).toBe("$0.00");
    expect(result.isFreeTier).toBe(true);
  });

  it("calculates commercial model pricing with resolution and step scaling", () => {
    const input: StudioJobPricingInput = {
      modelId: "dashscope-qwen-image-edit",
      isFreeTier: false,
      basePriceCents: 4, // 4¢ baseline for standard 1MP
      resolution: "2048x2048", // 4MP -> 2.0x multiplier
      steps: 50, // Baseline is 25 steps; excess steps incur surcharge
      loraCount: 2, // 1¢ surcharge per active LoRA fusion
      batchCount: 2,
    };

    const result = calculateStudioJobTotal(input);

    // Baseline: (4¢ * 2.0 res_scale + 2¢ steps + 2¢ loras) * 2 batch = 24¢
    expect(result.subtotalCents).toBe(24);
    expect(result.totalCents).toBe(24);
    expect(result.formattedTotal).toBe("$0.24");
    expect(result.breakdown.loraCostCents).toBe(4);
  });

  it("accurately computes percentage discounts without sub-zero totals", () => {
    const input: StudioJobPricingInput = {
      modelId: "commercial-dit",
      isFreeTier: false,
      basePriceCents: 10,
      resolution: "1024x1024",
      steps: 25,
      loraCount: 0,
      batchCount: 1,
      discountPercent: 20, // 20% coupon
    };

    const result = calculateStudioJobTotal(input);

    expect(result.subtotalCents).toBe(10);
    expect(result.discountCents).toBe(2);
    expect(result.totalCents).toBe(8);
    expect(result.formattedTotal).toBe("$0.08");
  });

  it("throws PricingValidationError for invalid negative steps or invalid resolution", () => {
    expect(() =>
      calculateStudioJobTotal({
        modelId: "test-model",
        isFreeTier: false,
        resolution: "invalid_res",
        steps: 25,
        loraCount: 0,
        batchCount: 1,
      })
    ).toThrow(PricingValidationError);

    expect(() =>
      calculateStudioJobTotal({
        modelId: "test-model",
        isFreeTier: false,
        resolution: "1024x1024",
        steps: -5,
        loraCount: 0,
        batchCount: 1,
      })
    ).toThrow(PricingValidationError);
  });
});
