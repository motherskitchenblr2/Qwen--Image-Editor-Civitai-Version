import { NextRequest, NextResponse } from "next/server";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY || "";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      negative_prompt = "blurry, distorted, low quality, deformed",
      model = "nano-banana",
      mode = "generate", // "generate" (text2img) | "edit" (img2img)
      image_base64 = null,
      size = "1024*1024",
      seed = null,
      apiKey = null,
    } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ALIBABA DASHSCOPE (Qwen-Image & Qwen-Image-Edit)
    // ─────────────────────────────────────────────────────────────
    if (model === "qwen-cloud" || model === "qwen-image" || model === "qwen-image-edit") {
      const activeKey = apiKey || DASHSCOPE_API_KEY;
      if (!activeKey) {
        return NextResponse.json(
          { error: "Alibaba DashScope API Key not configured. Please add your key in Sentinel Gateway." },
          { status: 401 }
        );
      }

      const isEditMode = mode === "edit" || model === "qwen-image-edit";
      const targetModel = isEditMode ? "qwen-image-edit" : "qwen-image";
      const endpoint = isEditMode
        ? "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis"
        : "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";

      const inputPayload: Record<string, any> = {
        prompt: prompt.trim(),
      };
      if (negative_prompt) {
        inputPayload.negative_prompt = negative_prompt;
      }
      if (isEditMode && image_base64) {
        inputPayload.base_image_url = image_base64;
      }

      const requestBody = {
        model: targetModel,
        input: inputPayload,
        parameters: {
          size: size || "1024*1024",
          n: 1,
          seed: seed ? Number(seed) : undefined,
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.message || `DashScope HTTP ${res.status}`;
        // Detect quota exhaustion and provide friendly diagnostic
        if (errorMsg.includes("AllocationQuota") || errorMsg.includes("FreeTierOnly")) {
          return NextResponse.json({
            error: "Alibaba Cloud Free Tier quota exhausted on this API key. Switch to 'Nano Banana' or 'Cloudflare AI' for instant generation!",
            code: "QUOTA_EXHAUSTED",
            suggestedModel: "nano-banana",
          }, { status: 402 });
        }
        return NextResponse.json({ error: errorMsg }, { status: res.status });
      }

      // If async task, poll until ready
      const taskId = data.output?.task_id;
      if (taskId) {
        let attempts = 0;
        while (attempts < 25) {
          await new Promise((r) => setTimeout(r, 2000));
          attempts++;

          const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${activeKey}` },
          });

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            const status = pollData.output?.task_status;
            if (status === "SUCCEEDED") {
              const imgUrl = pollData.output?.results?.[0]?.url;
              return NextResponse.json({
                success: true,
                image_url: imgUrl,
                model: targetModel,
                prompt,
              });
            } else if (status === "FAILED") {
              return NextResponse.json({
                error: pollData.output?.message || "Alibaba Cloud generation failed.",
              }, { status: 500 });
            }
          }
        }
        return NextResponse.json({ error: "Task timeout waiting for Alibaba Cloud generation." }, { status: 504 });
      }

      // If synchronous result
      const directUrl = data.output?.results?.[0]?.url;
      if (directUrl) {
        return NextResponse.json({ success: true, image_url: directUrl, model: targetModel });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. NANO BANANA (Turbo Compact AI Model) & CLOUDFLARE WORKERS AI
    // ─────────────────────────────────────────────────────────────
    const cfModelName =
      model === "nano-banana"
        ? "@cf/leonardo/lucid-origin"
        : model === "flux-schnell"
        ? "@cf/black-forest-labs/flux-1-schnell"
        : "@cf/leonardo/lucid-origin";

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${cfModelName}`;

    const cfPayload: Record<string, any> = {
      prompt: prompt.trim(),
      num_steps: 4,
    };
    if (seed) cfPayload.seed = Number(seed);

    const cfRes = await fetch(cfUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cfPayload),
    });

    if (cfRes.ok) {
      const cfData = await cfRes.json();
      const b64 = cfData.result?.image;
      if (b64) {
        const fullBase64 = b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,{b64}`.replace("{b64}", b64);
        return NextResponse.json({
          success: true,
          image_base64: fullBase64,
          model: model === "nano-banana" ? "Nano Banana Turbo" : cfModelName,
          prompt,
        });
      }
    } else {
      const errText = await cfRes.text();
      return NextResponse.json({ error: `AI generation failed: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ error: "Unsupported generator engine." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
