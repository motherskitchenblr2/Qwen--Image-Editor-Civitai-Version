import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl } from "../../lib/tunnelDiscovery";
import { isNsfwContent } from "@/app/lib/nsfwFilter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      image_base64,
      mask_base64,
      prompt,
      negative_prompt = "blurry, distorted, low quality, deformed, artifacts",
      true_cfg_scale = 1.0,
      guidance_scale = 1.0,
      num_inference_steps = 4,
      seed = null,
      loras = [],
      async_mode = true,
      backend_url = null,
    } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required for editing." }, { status: 400 });
    }

    const nsfwEnabled = Boolean(body.nsfw_enabled);
    if (!nsfwEnabled && (isNsfwContent(prompt) || isNsfwContent(negative_prompt))) {
      return NextResponse.json({ error: "NSFW Blocked by Admin" }, { status: 403 });
    }

    if (!image_base64 && body.mode === "edit") {
      return NextResponse.json(
        { error: "A source image is required for Image-to-Image editing on GPU." },
        { status: 400 }
      );
    }

    // Determine target GPU microservice URL
    let targetBackend: string | null | undefined = backend_url?.trim().replace(/\/+$/, "");
    if (!targetBackend) {
      targetBackend = await getActiveTunnelUrl();
    }

    if (!targetBackend) {
      return NextResponse.json(
        {
          error: "Kaggle Dual Tesla T4 GPU backend is currently offline. Please click 'Turn On GPU' or verify the tunnel ingress link.",
          code: "GPU_OFFLINE",
        },
        { status: 503 }
      );
    }

    const gpuPayload: any = {
      image_base64: image_base64 || null,
      prompt: prompt.trim(),
      negative_prompt,
      true_cfg_scale: Number(true_cfg_scale),
      guidance_scale: Number(guidance_scale),
      num_inference_steps: Number(num_inference_steps),
      seed: seed === "" || seed === null ? null : Number(seed),
      loras,
      async_mode: Boolean(async_mode),
    };
    if (mask_base64) {
      gpuPayload.mask_base64 = mask_base64;
    }

    const res = await fetch(`${targetBackend}/api/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gpuPayload),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || `GPU Microservice HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ...data,
      backend_url: targetBackend,
    });
  } catch (err: any) {
    console.error("Edit proxy error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to communicate with GPU backend." },
      { status: 500 }
    );
  }
}
