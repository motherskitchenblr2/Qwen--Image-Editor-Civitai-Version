/**
 * Qwen Image Editor Studio - Resource & Pricing Calculation Engine
 * Strictly tested via TDD (Unit & Integration).
 */

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingValidationError";
    Object.setPrototypeOf(this, PricingValidationError.prototype);
  }
}

export interface StudioJobPricingInput {
  modelId: string;
  isFreeTier?: boolean;
  basePriceCents?: number;
  resolution: string; // e.g. "1024x1024", "2048x2048", "512*512"
  steps: number;
  loraCount?: number;
  batchCount?: number;
  discountPercent?: number;
}

export interface StudioJobPricingBreakdown {
  baseCostCents: number;
  resolutionMultiplier: number;
  stepSurchargeCents: number;
  loraCostCents: number;
}

export interface StudioJobPricingResult {
  isFreeTier: boolean;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  formattedTotal: string;
  breakdown: StudioJobPricingBreakdown;
}

export function calculateStudioJobTotal(input: StudioJobPricingInput): StudioJobPricingResult {
  const {
    modelId,
    isFreeTier = false,
    basePriceCents = 4,
    resolution,
    steps,
    loraCount = 0,
    batchCount = 1,
    discountPercent = 0,
  } = input;

  // 1. Input Validation
  if (typeof steps !== "number" || isNaN(steps) || steps < 0) {
    throw new PricingValidationError(`Invalid steps count: ${steps}. Must be a non-negative number.`);
  }

  if (typeof batchCount !== "number" || isNaN(batchCount) || batchCount < 1) {
    throw new PricingValidationError(`Invalid batchCount: ${batchCount}. Must be >= 1.`);
  }

  if (!resolution || typeof resolution !== "string") {
    throw new PricingValidationError("Resolution is required.");
  }

  const cleanRes = resolution.trim().toLowerCase().replace("*", "x");
  const resMatch = cleanRes.match(/^(\d+)x(\d+)$/);
  if (!resMatch) {
    throw new PricingValidationError(`Invalid resolution format: "${resolution}". Expected "WIDTHxHEIGHT".`);
  }

  const width = parseInt(resMatch[1], 10);
  const height = parseInt(resMatch[2], 10);
  if (width <= 0 || height <= 0) {
    throw new PricingValidationError("Width and height must be positive numbers.");
  }

  // 2. Free Tier Fast-Path
  if (isFreeTier) {
    return {
      isFreeTier: true,
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      formattedTotal: "$0.00",
      breakdown: {
        baseCostCents: 0,
        resolutionMultiplier: 1.0,
        stepSurchargeCents: 0,
        loraCostCents: 0,
      },
    };
  }

  // 3. Commercial Tier Calculation
  const megapixels = (width * height) / 1_000_000;
  const resolutionMultiplier = megapixels > 2.0 ? 2.0 : 1.0;

  // Baseline 25 steps; 2¢ per extra 25 steps
  const excessSteps = Math.max(0, steps - 25);
  const stepSurchargePerItem = Math.round((excessSteps / 25) * 2);

  // 1¢ per LoRA injection per item
  const validLoraCount = Math.max(0, loraCount);
  const loraCostPerItem = validLoraCount * 1;

  const scaledBaseCostPerItem = Math.round(basePriceCents * resolutionMultiplier);
  const singleItemCost = scaledBaseCostPerItem + stepSurchargePerItem + loraCostPerItem;

  const subtotalCents = singleItemCost * batchCount;

  // Discount calculation
  const validDiscountPercent = Math.min(100, Math.max(0, discountPercent));
  const discountCents = Math.round((subtotalCents * validDiscountPercent) / 100);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  return {
    isFreeTier: false,
    subtotalCents,
    discountCents,
    totalCents,
    formattedTotal: `$${(totalCents / 100).toFixed(2)}`,
    breakdown: {
      baseCostCents: scaledBaseCostPerItem * batchCount,
      resolutionMultiplier,
      stepSurchargeCents: stepSurchargePerItem * batchCount,
      loraCostCents: loraCostPerItem * batchCount,
    },
  };
}
