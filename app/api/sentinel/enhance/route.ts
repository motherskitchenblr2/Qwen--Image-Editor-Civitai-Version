import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "../vault/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider, apiKey } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const envKey = provider ? PROVIDER_ENV_MAP[provider] : null;
    let effectiveKey = (apiKey || "").trim();
    if (!effectiveKey || effectiveKey.includes("*") || effectiveKey === "__FROM_ENV__") {
      effectiveKey = (envKey && process.env[envKey]) ? process.env[envKey] : "";
    }

    const systemInstruction =
      "You are a master image editing prompt engineer for Qwen-Image-Edit and Stable Diffusion DiT pipelines. " +
      "Rewrite and enrich the user's edit instruction to be vivid, high-detail, visually striking, with exact lighting, texture, and composition details. " +
      "Return ONLY the enhanced prompt string without explanations, quotes, or markdown preambles.";

    if (provider === "gemini" && effectiveKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${effectiveKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemInstruction}\n\nOriginal prompt: "${prompt}"\n\nEnhanced prompt:`,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (enhanced) {
          return NextResponse.json({ enhancedPrompt: enhanced });
        }
      }
    }

    if (provider === "groq" && effectiveKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Original prompt: "${prompt}"\n\nEnhanced prompt:` },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        if (enhanced) {
          return NextResponse.json({ enhancedPrompt: enhanced });
        }
      }
    }

    if (provider === "openrouter" && effectiveKey) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1:free",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Original prompt: "${prompt}"\n\nEnhanced prompt:` },
          ],
          max_tokens: 150,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        if (enhanced) {
          return NextResponse.json({ enhancedPrompt: enhanced });
        }
      }
    }

    // Default fast rule-based enhancer fallback
    const cyberpunkKeywords = "photorealistic, hyper-detailed, volumetric cinematic lighting, 8k resolution, raytracing reflections, masterwork";
    return NextResponse.json({
      enhancedPrompt: `${prompt.trim()}, ${cyberpunkKeywords}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to enhance prompt" }, { status: 500 });
  }
}
