import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";
import { brainstormPrompt, reformUserPrompt, getRandomPromptArchetype } from "@/app/lib/promptIntelligence";
import { isNsfwContent } from "@/app/lib/nsfwFilter";

export const dynamic = "force-dynamic";

async function callChatCompletion(options: {
  url: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userInput: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  try {
    const res = await fetch(options.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: "system", content: options.systemInstruction },
          { role: "user", content: `Input subject/prompt: "${options.userInput}"\n\nResult prompt:` },
        ],
        max_tokens: options.maxTokens ?? 240,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = "", negative_prompt = "", provider, apiKey, mode = "enhance", nsfw_enabled = false } = body;

    const isBrainstorm = mode === "brainstorm";
    const isInspire = mode === "inspire";
    const isEditMode = mode === "edit";

    // For enhance & edit modes, prompt text is required
    if (!isBrainstorm && !isInspire && (!prompt || !prompt.trim())) {
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

    const negConstraint = negative_prompt && negative_prompt.trim()
      ? ` Strictly avoid adding, mentioning, or implying any of these negative attributes: "${negative_prompt.trim()}".`
      : "";

    const systemInstruction = isInspire
      ? `You are an inspiring artistic director for masterwork diffusion models. Compose an ultra-imaginative, evocative, and aesthetically stunning prompt concept for a brand-new image generation. Specify medium/style, atmospheric textures, lighting, camera lens, palette, and mood in one cohesive paragraph (4-6 sentences).${negConstraint} Return ONLY the prompt string without explanations or quotes.`
      : isBrainstorm
      ? `You rewrite a user's image request into an evocative, master-grade prompt for a diffusion model. Reply with the prompt only: one paragraph of plain English (4-6 sentences). Describe what is in the frame in present tense, specifying medium/style, element positioning, background, volumetric lighting, palette, and mood.${negConstraint} Return ONLY the prompt string without explanations or quotes.`
      : isEditMode
      ? `You rewrite a user's image-editing instruction into a clear instruction for an image-editing model. Reply with the instruction only: one paragraph of plain text, 1 to 3 sentences, at most 80 words. Lead with the concrete edit: what changes, where, and how it looks afterwards. Then add one short clause for what stays: 'keep her face, pose, clothing and the background unchanged'. Change only what was asked; do not clean up or restyle anything else.${negConstraint} Return ONLY the instruction string without explanations or quotes.`
      : `You are an expert prompt engineer. The user has written an image generation or editing prompt in casual language, incomplete phrasing, or raw imagination. Analyze and reform this text into a balanced, professional prompt with precise artistic framing, lighting, textures, and balancing descriptors while faithfully keeping the user's intended subject.${negConstraint} Return ONLY the enhanced prompt string without explanations.`;

    const inputTopic = prompt.trim() || (isInspire ? "visionary surreal masterwork" : "cyberpunk visionary masterwork");

    // =========================================================================
    // 1. NSFW MODE ROUTING: PRIMARY MISTRAL AI -> FALLBACK DOLPHIN LLM
    // =========================================================================
    if (nsfw_enabled) {
      // Primary: Mistral AI Platform API
      const mistralKey = (provider === "mistral" && effectiveKey) ? effectiveKey : (process.env.MISTRAL_API_KEY || "");
      if (mistralKey) {
        const result = await callChatCompletion({
          url: "https://api.mistral.ai/v1/chat/completions",
          apiKey: mistralKey,
          model: "open-mistral-nemo",
          systemInstruction,
          userInput: inputTopic,
          maxTokens: 240,
          temperature: isBrainstorm || isInspire ? 0.8 : 0.6,
        });
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            provider: "Mistral AI (open-mistral-nemo) [NSFW Primary]",
            mode,
            isBrainstormed: isBrainstorm || isInspire,
          });
        }
      }

      // Fallback: Dolphin LLM (Uncensored)
      const dolphinKey = (provider === "dolphin" && effectiveKey) ? effectiveKey : (process.env.DOLPHIN_API_KEY || "");
      const dolphinBaseUrl = (process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1").replace(/\/+$/, "");
      if (dolphinKey) {
        const result = await callChatCompletion({
          url: `${dolphinBaseUrl}/chat/completions`,
          apiKey: dolphinKey,
          model: "uncensored",
          systemInstruction,
          userInput: inputTopic,
          maxTokens: 240,
          temperature: isBrainstorm || isInspire ? 0.8 : 0.6,
        });
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            provider: "Dolphin LLM (uncensored) [NSFW Fallback]",
            fallbackEngaged: true,
            mode,
            isBrainstormed: isBrainstorm || isInspire,
          });
        }
      }
    }

    // =========================================================================
    // 2. SFW MODE ROUTING: PRIMARY GEMINI 2.0 FLASH (GOOGLE) -> FALLBACK OPENROUTER
    // =========================================================================
    if (!nsfw_enabled) {
      // Primary: Google AI Studio (Gemini 2.0 Flash)
      const geminiKey = (provider === "gemini" && effectiveKey) ? effectiveKey : (process.env.GEMINI_API_KEY || "");
      if (geminiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
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
                provider: "Gemini 2.0 Flash (Google AI Studio) [SFW Primary]",
                mode,
                isBrainstormed: isBrainstorm || isInspire,
              });
            }
          }
        } catch (gErr) {
          console.warn("Google AI Studio primary failed in SFW mode, engaging OpenRouter fallback:", gErr);
        }
      }

      // Fallback: OpenRouter / OpenCode Gemma 2 27B IT
      const openRouterKey = (provider === "openrouter" && effectiveKey) ? effectiveKey : (process.env.OPENROUTER_API_KEY || "");
      if (openRouterKey) {
        const result = await callChatCompletion({
          url: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: openRouterKey,
          model: "google/gemma-2-27b-it:free",
          systemInstruction,
          userInput: inputTopic,
          maxTokens: 220,
        });
        if (result) {
          return NextResponse.json({
            enhancedPrompt: result,
            provider: "Gemma 2 27B IT (OpenRouter) [SFW Fallback]",
            fallbackEngaged: true,
            mode,
            isBrainstormed: isBrainstorm || isInspire,
          });
        }
      }
    }

    // =========================================================================
    // 3. AUXILIARY PROVIDERS (GROQ LPU / DIRECT MISTRAL CALLS)
    // =========================================================================
    if (provider === "groq" && effectiveKey) {
      const result = await callChatCompletion({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: effectiveKey,
        model: "llama-3.3-70b-versatile",
        systemInstruction,
        userInput: inputTopic,
        maxTokens: 200,
        temperature: isBrainstorm || isInspire ? 0.8 : 0.6,
      });
      if (result) {
        return NextResponse.json({
          enhancedPrompt: result,
          provider: "Groq LPU (llama-3.3-70b)",
          mode,
          isBrainstormed: isBrainstorm || isInspire,
        });
      }
    }

    // =========================================================================
    // 4. INTELLIGENT NEURAL FALLBACK (POLLINATIONS EDGE STREAM)
    // =========================================================================
    try {
      const pollRes = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Input subject/prompt: "${inputTopic}"\n\nResult prompt:` },
          ],
          model: nsfw_enabled ? "mistral" : "openai",
          seed: Math.floor(Math.random() * 100000),
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (pollRes.ok) {
        const textResult = (await pollRes.text()).trim();
        if (textResult) {
          return NextResponse.json({
            enhancedPrompt: textResult,
            provider: nsfw_enabled ? "Mistral Neural Edge (Free Fallback)" : "Gemma Neural Edge (Free Fallback)",
            mode,
            isBrainstormed: isBrainstorm || isInspire,
          });
        }
      }
    } catch {}

    // =========================================================================
    // 5. DETERMINISTIC OFFLINE FALLBACK ENGINE
    // =========================================================================
    if (isInspire) {
      const arch = getRandomPromptArchetype();
      return NextResponse.json({
        enhancedPrompt: arch.prompt,
        suggestedNegative: arch.suggestedNegative,
        archetypeName: arch.name,
        mode: "inspire",
        isBrainstormed: true,
        provider: "Studio Creative Engine (Offline)",
      });
    }

    if (isBrainstorm) {
      const bs = brainstormPrompt(prompt, nsfw_enabled);
      return NextResponse.json({
        enhancedPrompt: bs.prompt,
        suggestedNegative: bs.suggestedNegative,
        mode: "brainstorm",
        isBrainstormed: true,
        provider: "Studio Brain-Storm Engine (Offline)",
      });
    }

    const reformed = reformUserPrompt(prompt, nsfw_enabled, isEditMode ? "edit" : "generate");
    return NextResponse.json({
      enhancedPrompt: reformed,
      mode: isEditMode ? "edit" : "enhance",
      isBrainstormed: false,
      provider: "Studio Heuristics Engine (Offline)",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process prompt" }, { status: 500 });
  }
}
