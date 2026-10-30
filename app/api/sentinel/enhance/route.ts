import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";
import { brainstormPrompt, reformUserPrompt } from "@/app/lib/promptIntelligence";
import { isNsfwContent } from "@/app/lib/nsfwFilter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = "", provider, apiKey, mode = "enhance", nsfw_enabled = false } = body;

    const isBrainstorm = mode === "brainstorm";

    // For enhance mode, prompt text is required
    if (!isBrainstorm && (!prompt || !prompt.trim())) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // NSFW / SFW Mode Guard: Strict admin block when in SFW mode
    if (!nsfw_enabled && isNsfwContent(prompt)) {
      return NextResponse.json({ error: "NSFW Blocked by Admin" }, { status: 403 });
    }

    const envKey = provider ? PROVIDER_ENV_MAP[provider] : null;
    let effectiveKey = (apiKey || "").trim();
    if (!effectiveKey || effectiveKey.includes("*") || effectiveKey === "__FROM_ENV__") {
      effectiveKey = (envKey && process.env[envKey]) ? process.env[envKey] : "";
    }

    const isEditMode = mode === "edit";
    const systemInstruction = isBrainstorm
      ? "You rewrite a user's image request into an evocative, master-grade prompt for a diffusion model. Reply with the prompt only: one paragraph of plain English (4-6 sentences). Describe what is in the frame in present tense, specifying medium/style, element positioning, background, volumetric lighting, palette, and mood. Return ONLY the prompt string without explanations or quotes."
      : isEditMode
      ? "You rewrite a user's image-editing instruction into a clear instruction for an image-editing model. Reply with the instruction only: one paragraph of plain text, 1 to 3 sentences, at most 80 words. Lead with the concrete edit: what changes, where, and how it looks afterwards. Then add one short clause for what stays: 'keep her face, pose, clothing and the background unchanged'. Change only what was asked; do not clean up or restyle anything else. Return ONLY the instruction string without explanations or quotes."
      : "You are an expert prompt engineer. The user has written an image generation or editing prompt in casual language, incomplete phrasing, or raw imagination. Analyze and reform this text into a balanced, professional prompt with precise artistic framing, lighting, textures, and balancing descriptors while faithfully keeping the user's intended subject. Return ONLY the enhanced prompt string without explanations.";

    const inputTopic = prompt.trim() || "cyberpunk visionary masterwork";

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
                  text: `${systemInstruction}\n\nInput subject/prompt: "${inputTopic}"\n\nResult prompt:`,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            mode,
            isBrainstormed: isBrainstorm,
          });
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
            { role: "user", content: `Input subject/prompt: "${inputTopic}"\n\nResult prompt:` },
          ],
          max_tokens: 180,
          temperature: isBrainstorm ? 0.8 : 0.6,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.choices?.[0]?.message?.content?.trim();
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            mode,
            isBrainstormed: isBrainstorm,
          });
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
            { role: "user", content: `Input subject/prompt: "${inputTopic}"\n\nResult prompt:` },
          ],
          max_tokens: 180,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.choices?.[0]?.message?.content?.trim();
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            mode,
            isBrainstormed: isBrainstorm,
          });
        }
      }
    }

    if (provider === "mistral" && effectiveKey) {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "open-mistral-nemo",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Input subject/prompt: "${inputTopic}"\n\nResult prompt:` },
          ],
          max_tokens: 180,
          temperature: isBrainstorm ? 0.8 : 0.6,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.choices?.[0]?.message?.content?.trim();
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            mode,
            isBrainstormed: isBrainstorm,
          });
        }
      }
    }

    // Default fast intelligent fallback using promptIntelligence engine
    if (isBrainstorm) {
      const bs = brainstormPrompt(prompt, nsfw_enabled);
      return NextResponse.json({
        enhancedPrompt: bs.prompt,
        suggestedNegative: bs.suggestedNegative,
        mode: "brainstorm",
        isBrainstormed: true,
      });
    }

    // Reform casual user text into balanced professional prompt
    const reformed = reformUserPrompt(prompt, nsfw_enabled, isEditMode ? "edit" : "generate");
    return NextResponse.json({
      enhancedPrompt: reformed,
      mode: isEditMode ? "edit" : "enhance",
      isBrainstormed: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process prompt" }, { status: 500 });
  }
}
