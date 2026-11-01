import { NextRequest, NextResponse } from "next/server";
import { isNsfwContent } from "@/app/lib/nsfwFilter";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Sentinel, an autonomous AI Studio Copilot, vision analyst, and smart, highly skilled professional Admin of Qwen Image Editor Studio.
The user is the Owner of this app making major architectural decisions. You discuss and review app behaviors, monitor performance, and keep the app healthy, reliable, and error-free.
You assist the user with crafting Midjourney-grade prompts, negative prompts, styling recipes, parameter tuning (CFG, Steps, Samplers), and diagnosing generation issues.
Always be concise, practical, authoritative, and highly creative. When suggesting a prompt for image generation, format the primary recommended prompt inside a code block tagged as \`\`\`prompt
[your prompt here]
\`\`\` so the user can import it directly with one tap.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      prompt = "",
      action = "chat",
      image_context = null,
      nsfw_enabled = false,
    } = body;

    const lastMessage = prompt || (messages.length > 0 ? messages[messages.length - 1]?.content : "");

    if (!lastMessage && action === "chat") {
      return NextResponse.json({ error: "Message or prompt is required." }, { status: 400 });
    }

    if (!nsfw_enabled && isNsfwContent(lastMessage)) {
      return NextResponse.json({ error: "NSFW Blocked by Admin" }, { status: 403 });
    }

    let queryPrompt = lastMessage;
    if (action === "refine_prompt") {
      queryPrompt = `Act as Sentinel. Refine and transform this raw concept into a high-fidelity Midjourney/FLUX.1 prompt with cinematic lighting, camera lens specifications (e.g. 85mm f/1.4), volumetric atmosphere, and micro-details: "${lastMessage}". Format the prompt inside a \`\`\`prompt ... \`\`\` block.`;
    } else if (action === "recommend_loras") {
      queryPrompt = `Act as Sentinel. Based on this visual concept: "${lastMessage}", recommend 3 top Civitai LoRA checkpoints or art styles with recommended trigger weights (e.g., 0.65 - 0.85) and stacking guidelines. Provide a crafted generation prompt utilizing these styles inside a \`\`\`prompt ... \`\`\` block.`;
    } else if (action === "analyze_image") {
      const dimensions = image_context?.dimensions || "1024x1024";
      const desc = image_context?.description || "Source Canvas Image";
      queryPrompt = `Act as Sentinel. A canvas image is loaded (${dimensions}, context: ${desc}). The user asks: "${lastMessage || "Suggest creative inpainting and image-to-image styling tweaks for this canvas"}". Analyze composition balance, lighting improvements, and provide a targeted edit prompt in a \`\`\`prompt ... \`\`\` block.`;
    }

    // =========================================================================
    // 1. NSFW MODE: PRIMARY MISTRAL AI -> FALLBACK DOLPHIN LLM
    // =========================================================================
    if (nsfw_enabled) {
      const effectiveMistralKey = process.env.MISTRAL_API_KEY || "";
      if (effectiveMistralKey) {
        try {
          const mRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${effectiveMistralKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "open-mistral-nemo",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: queryPrompt },
              ],
              max_tokens: 380,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (mRes.ok) {
            const mData = await mRes.json();
            const mReply = mData.choices?.[0]?.message?.content?.trim();
            if (mReply) {
              return NextResponse.json({
                reply: mReply,
                provider: "Mistral AI (open-mistral-nemo) [NSFW Primary]",
                action,
              });
            }
          }
        } catch (mErr) {
          console.warn("Mistral AI copilot primary failed in NSFW mode:", mErr);
        }
      }

      const effectiveDolphinKey = process.env.DOLPHIN_API_KEY || "";
      const dolphinBaseUrl = (process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1").replace(/\/+$/, "");
      if (effectiveDolphinKey) {
        try {
          const dRes = await fetch(`${dolphinBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${effectiveDolphinKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "uncensored",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: queryPrompt },
              ],
              max_tokens: 380,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (dRes.ok) {
            const dData = await dRes.json();
            const dReply = dData.choices?.[0]?.message?.content?.trim();
            if (dReply) {
              return NextResponse.json({
                reply: dReply,
                provider: "Dolphin LLM (uncensored) [NSFW Fallback]",
                action,
              });
            }
          }
        } catch (dErr) {
          console.warn("Dolphin LLM copilot fallback failed:", dErr);
        }
      }
    }

    // =========================================================================
    // 2. SFW MODE: PRIMARY GOOGLE GEMINI / GEMMA 4 31B IT -> FALLBACK OPENROUTER
    // =========================================================================
    if (!nsfw_enabled) {
      const effectiveGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || "";
      if (effectiveGeminiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${effectiveGeminiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: `${SYSTEM_PROMPT}\n\nUser request:\n${queryPrompt}` },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (res.ok) {
            const data = await res.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply) {
              return NextResponse.json({
                reply,
                provider: "Gemma 4 31B IT / Gemini (Google AI Studio) [SFW Primary]",
                action,
              });
            }
          }
        } catch (gemErr) {
          console.warn("Google AI Studio copilot chat fallback:", gemErr);
        }
      }

      const effectiveOpenRouterKey = process.env.OPENROUTER_API_KEY || "";
      if (effectiveOpenRouterKey) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${effectiveOpenRouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemma-2-27b-it:free",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: queryPrompt },
              ],
              max_tokens: 380,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (orRes.ok) {
            const orData = await orRes.json();
            const reply = orData.choices?.[0]?.message?.content?.trim();
            if (reply) {
              return NextResponse.json({
                reply,
                provider: "Gemma 4 31B IT (OpenCode / OpenRouter) [SFW Fallback]",
                action,
              });
            }
          }
        } catch (orErr) {}
      }
    }

    // =========================================================================
    // 3. POLLINATIONS NEURAL TEXT ENDPOINT (ZERO-KEY EDGE STREAM)
    // =========================================================================
    try {
      const pollUrl = "https://text.pollinations.ai/";
      const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: queryPrompt },
          ],
          model: nsfw_enabled ? "mistral" : "openai",
          seed: Math.floor(Math.random() * 100000),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (pollRes.ok) {
        const replyText = await pollRes.text();
        if (replyText && replyText.trim()) {
          return NextResponse.json({
            reply: replyText.trim(),
            provider: nsfw_enabled ? "Mistral Neural Edge (Free Fallback)" : "Pollinations AI (Neural Stream)",
            action,
          });
        }
      }
    } catch {}

    // 4. Fallback Smart Response
    const fallbackPrompt = `${queryPrompt}, 8k resolution, cinematic lighting, shot on 85mm lens, photorealistic textures, volumetric haze, hyper-detailed`;
    return NextResponse.json({
      reply: `Here is Sentinel's optimized studio recipe:\n\n\`\`\`prompt\n${fallbackPrompt}\n\`\`\`\n\n**Parameter Advice:**\n- **CFG Scale:** 4.5 – 6.0\n- **Inference Steps:** 25 – 30 (or 4 steps for Turbo/Schnell)\n- **Aspect Ratio:** 16:9 for cinematic panoramas, 9:16 for mobile portraits.`,
      provider: "Sentinel Local Studio Engine",
      action,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process Copilot request" }, { status: 500 });
  }
}
