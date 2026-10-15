import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";
import { generateSmartNegativePrompt } from "@/app/lib/promptIntelligence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider, apiKey } = await req.json();

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

    // Optional AI Enrichment if Copilot is active and responsive within 4s
    if (provider === "mistral" && effectiveKey) {
      try {
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
            // Merge AI generated negatives with baseline safeguards
            const combinedTokens = Array.from(
              new Set([
                ...aiNegatives.split(",").map((s: string) => s.trim().toLowerCase()),
                ...baselineAnalysis.negativePrompt.split(",").map((s: string) => s.trim().toLowerCase()),
              ])
            ).filter(Boolean);

            return NextResponse.json({
              success: true,
              negativePrompt: combinedTokens.join(", "),
              detectedAesthetics: baselineAnalysis.detectedAesthetics,
              explanation: `AI-Enriched via Mistral NeMo. Suppressed ${combinedTokens.length} contradictory styles.`,
            });
          }
        }
      } catch (e) {
        // Fall back gracefully to baseline analysis
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
            const combinedTokens = Array.from(
              new Set([
                ...aiNegatives.split(",").map((s: string) => s.trim().toLowerCase()),
                ...baselineAnalysis.negativePrompt.split(",").map((s: string) => s.trim().toLowerCase()),
              ])
            ).filter(Boolean);

            return NextResponse.json({
              success: true,
              negativePrompt: combinedTokens.join(", "),
              detectedAesthetics: baselineAnalysis.detectedAesthetics,
              explanation: `AI-Enriched via Groq LPU. Suppressed ${combinedTokens.length} contradictory styles.`,
            });
          }
        }
      } catch (e) {
        // Fall back gracefully to baseline analysis
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
