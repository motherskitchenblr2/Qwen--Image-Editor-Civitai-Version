import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";
import { generateSmartNegativePrompt } from "@/app/lib/promptIntelligence";

export const dynamic = "force-dynamic";

function mergeNegativeTokens(baseline: string, aiGenerated: string): string[] {
  return Array.from(
    new Set([
      ...baseline.split(",").map((s: string) => s.trim().toLowerCase()),
      ...aiGenerated.split(",").map((s: string) => s.trim().toLowerCase()),
    ])
  ).filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, provider, apiKey, nsfw_enabled = false } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({
        negativePrompt: "blurry, low resolution, bad anatomy, deformed, worst quality, artifacts, watermark",
        detectedAesthetics: ["Default Baseline"],
        explanation: "No prompt provided. Returned standard baseline quality safeguards.",
      });
    }

    // 1. Calculate deterministic smart negative analysis using rule-based ontology
    const baselineAnalysis = generateSmartNegativePrompt(prompt);

    // 2. Check if an active AI Copilot is available to optionally enrich negative tokens
    const envKey = provider ? PROVIDER_ENV_MAP[provider] : null;
    let effectiveKey = (apiKey || "").trim();
    if (!effectiveKey || effectiveKey.includes("*") || effectiveKey === "__FROM_ENV__") {
      effectiveKey = (envKey && process.env[envKey]) ? process.env[envKey] : "";
    }

    const systemInstruction =
      "You are an expert AI diffusion prompt engineer. Analyze the user's positive generation prompt and return ONLY a comma-separated list of negative prompts (unwanted styles, artifact triggers, conflicting aesthetics, anatomical flaws) to exclude. " +
      "For example, if the prompt is hyper-realistic, include 'cartoon, anime, 3d render, clay, silicon, plastic, doll, drawing, cgi'. " +
      "Return ONLY the comma-separated negative keywords without explanations, markdown, or greetings.";

    // =========================================================================
    // NSFW MODE: PRIMARY MISTRAL AI -> FALLBACK DOLPHIN LLM
    // =========================================================================
    if (nsfw_enabled) {
      const mistralKey = (provider === "mistral" && effectiveKey) ? effectiveKey : (process.env.MISTRAL_API_KEY || "");
      if (mistralKey) {
        try {
          const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${mistralKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "open-mistral-nemo",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: `Positive prompt: "${prompt}"\n\nNegative prompts to exclude:` },
              ],
              max_tokens: 120,
              temperature: 0.5,
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const data = await res.json();
            const aiNegatives = data.choices?.[0]?.message?.content?.trim();
            if (aiNegatives && aiNegatives.length > 5) {
              const combinedTokens = mergeNegativeTokens(baselineAnalysis.negativePrompt, aiNegatives);

              return NextResponse.json({
                success: true,
                negativePrompt: combinedTokens.join(", "),
                detectedAesthetics: baselineAnalysis.detectedAesthetics,
                explanation: `AI-Enriched via Mistral AI (NSFW Primary). Suppressed ${combinedTokens.length} contradictory styles.`,
              });
            }
          }
        } catch (mErr) {
          console.warn("Mistral AI negative deduction fallback:", mErr);
        }
      }

      const dolphinKey = (provider === "dolphin" && effectiveKey) ? effectiveKey : (process.env.DOLPHIN_API_KEY || "");
      const dolphinBaseUrl = (process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1").replace(/\/+$/, "");
      if (dolphinKey) {
        try {
          const res = await fetch(`${dolphinBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${dolphinKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "uncensored",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: `Positive prompt: "${prompt}"\n\nNegative prompts to exclude:` },
              ],
              max_tokens: 120,
              temperature: 0.5,
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const data = await res.json();
            const aiNegatives = data.choices?.[0]?.message?.content?.trim();
            if (aiNegatives && aiNegatives.length > 5) {
              const combinedTokens = mergeNegativeTokens(baselineAnalysis.negativePrompt, aiNegatives);

              return NextResponse.json({
                success: true,
                negativePrompt: combinedTokens.join(", "),
                detectedAesthetics: baselineAnalysis.detectedAesthetics,
                explanation: `AI-Enriched via Dolphin LLM (NSFW Fallback). Suppressed ${combinedTokens.length} contradictory styles.`,
              });
            }
          }
        } catch (dErr) {
          console.warn("Dolphin LLM negative deduction fallback:", dErr);
        }
      }
    }

    // =========================================================================
    // SFW MODE: PRIMARY GEMMA 4 31B IT (GOOGLE) -> FALLBACK GROQ / OPENROUTER
    // =========================================================================
    if (!nsfw_enabled) {
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
                      text: `${systemInstruction}\n\nPositive prompt: "${prompt}"\n\nNegative prompts to exclude:`,
                    },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const data = await res.json();
            const aiNegatives = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (aiNegatives && aiNegatives.length > 5) {
              const combinedTokens = mergeNegativeTokens(baselineAnalysis.negativePrompt, aiNegatives);

              return NextResponse.json({
                success: true,
                negativePrompt: combinedTokens.join(", "),
                detectedAesthetics: baselineAnalysis.detectedAesthetics,
                explanation: `AI-Enriched via Google AI Studio (SFW Primary). Suppressed ${combinedTokens.length} contradictory styles.`,
              });
            }
          }
        } catch (gErr) {
          console.warn("Google AI Studio negative deduction fallback:", gErr);
        }
      }

      if (provider === "groq" && effectiveKey) {
        try {
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
                { role: "user", content: `Positive prompt: "${prompt}"\n\nNegative prompts to exclude:` },
              ],
              max_tokens: 120,
              temperature: 0.5,
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const data = await res.json();
            const aiNegatives = data.choices?.[0]?.message?.content?.trim();
            if (aiNegatives && aiNegatives.length > 5) {
              const combinedTokens = mergeNegativeTokens(baselineAnalysis.negativePrompt, aiNegatives);

              return NextResponse.json({
                success: true,
                negativePrompt: combinedTokens.join(", "),
                detectedAesthetics: baselineAnalysis.detectedAesthetics,
                explanation: `AI-Enriched via Groq LPU (SFW Fallback). Suppressed ${combinedTokens.length} contradictory styles.`,
              });
            }
          }
        } catch (e) {}
      }
    }

    // Default fast deterministic smart response
    return NextResponse.json({
      success: true,
      negativePrompt: baselineAnalysis.negativePrompt,
      detectedAesthetics: baselineAnalysis.detectedAesthetics,
      negatedStyles: baselineAnalysis.negatedStyles,
      explanation: baselineAnalysis.explanation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate smart negative prompt" },
      { status: 500 }
    );
  }
}
