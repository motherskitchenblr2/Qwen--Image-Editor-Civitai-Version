import { NextRequest, NextResponse } from "next/server";
import { LIVE_MODEL_REGISTRY } from "@/app/lib/aiModelRegistry";
import { calculateStudioJobTotal, PricingValidationError } from "@/app/lib/pricingCalculator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      modelId = "default",
      resolution = "1024x1024",
      steps = 25,
      loraCount = 0,
      batchCount = 1,
      discountPercent = 0,
    } = body;

    const matchedModel = LIVE_MODEL_REGISTRY.find((m) => m.id === modelId);
    const isFreeTier = matchedModel ? Boolean(matchedModel.free) : false;

    const pricing = calculateStudioJobTotal({
      modelId,
      isFreeTier,
      resolution,
      steps: Number(steps),
      loraCount: Number(loraCount),
      batchCount: Number(batchCount),
      discountPercent: Number(discountPercent),
    });

    return NextResponse.json({
      success: true,
      pricing,
    });
  } catch (err: any) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal pricing calculation error" },
      { status: 500 }
    );
  }
}
