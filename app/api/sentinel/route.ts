import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

export const runtime = "edge";

function getAiClient(requestedModel: string) {
  let apiKey = process.env.OPENROUTER_API_KEY || "";
  let baseURL = process.env.AI_BASE_URL || "https://openrouter.ai/api/v1";

  if (!apiKey && process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
  } else if (!apiKey && process.env.GROQ_API_KEY) {
    apiKey = process.env.GROQ_API_KEY;
    baseURL = "https://api.groq.com/openai/v1";
  } else if (!apiKey && process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
    baseURL = "https://api.openai.com/v1";
  } else if (!apiKey && process.env.DOLPHIN_API_KEY) {
    apiKey = process.env.DOLPHIN_API_KEY;
    baseURL = process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1";
  }

  let resolvedModel = requestedModel || "google/gemini-2.0-flash-001";
  if (baseURL.includes("generativelanguage.googleapis.com")) {
    resolvedModel = requestedModel.includes("flash") ? "gemini-2.0-flash" : "gemini-1.5-flash";
  } else if (baseURL.includes("groq.com")) {
    resolvedModel = "llama-3.3-70b-versatile";
  }

  const client = createOpenAI({
    apiKey: apiKey || "dummy-key-fallback",
    baseURL,
  });

  return { client, model: resolvedModel, hasKey: Boolean(apiKey) };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = "google/gemini-2.0-flash-001", customApiKey, customBaseUrl } = body;

    let clientConfig;
    if (customApiKey) {
      clientConfig = {
        client: createOpenAI({
          apiKey: customApiKey,
          baseURL: customBaseUrl || "https://openrouter.ai/api/v1",
        }),
        model,
        hasKey: true,
      };
    } else {
      clientConfig = getAiClient(model);
    }

    const result = streamText({
      model: clientConfig.client(clientConfig.model),
      messages,
      system: `You are Sentinel, an autonomous AI Studio Copilot and prompt engineer inside Qwen Image Editor Studio.
You have direct tool access to control the workspace.
- When the user asks for a prompt, concept, or style, craft a high-end cinematic prompt and call 'studio_refine_prompt'.
- When the user wants optimal settings, analyze their concept and call 'studio_tune_parameters'.
- When the user asks to apply a visual style preset, call 'studio_apply_preset'.
- When the user inquires about canvas status or image contents, call 'studio_inspect_canvas'.
- For heavy or GPU operations (such as fusing LoRAs into the Kaggle GPU pipeline), invoke 'studio_fuse_loras' so the user gets an inline human-in-the-loop approval gate.
Always be concise, proactive, and execute actions with tool calls rather than only giving hypothetical advice.`,
      tools: {
        studio_refine_prompt: tool({
          description: "Updates the active prompt and negative prompt in the Studio workstation.",
          parameters: z.object({
            refinedPrompt: z.string().describe("Hyper-detailed, cinematic prompt with lighting and style tags"),
            negativePrompt: z.string().optional().describe("Unwanted artifacts, low quality flags"),
            suggestedStyle: z.string().optional().describe("Matching art style name"),
          }),
        }),
        studio_tune_parameters: tool({
          description: "Adjusts workstation inference parameters.",
          parameters: z.object({
            steps: z.number().min(4).max(50).describe("Inference steps (e.g. 4 for Turbo, 20-30 for HD)"),
            cfgScale: z.number().min(1).max(20).describe("Guidance scale / CFG"),
            aspectRatio: z.enum(["1:1", "9:16", "16:9", "4:5", "3:2"]).describe("Target aspect ratio"),
            rationale: z.string().optional().describe("Reasoning for parameters"),
          }),
        }),
        studio_apply_preset: tool({
          description: "Directly injects a visual style preset into Studio.",
          parameters: z.object({
            presetName: z.string().describe("Style preset name (e.g., Cyberpunk, Anime, Photorealistic)"),
            stylePrompt: z.string().describe("Prompt modifiers for this style"),
            negativePrompt: z.string().optional().describe("Negative prompt tokens for this style"),
          }),
        }),
        studio_inspect_canvas: tool({
          description: "Reads active image resolution and visual context.",
          parameters: z.object({
            notes: z.string().describe("Observations about the canvas or inpainting recommendations"),
          }),
        }),
        studio_fuse_loras: tool({
          description: "Prepares and fuses specific LoRAs into the Kaggle GPU pipeline (Requires Human Approval).",
          parameters: z.object({
            loraNames: z.array(z.string()).describe("Names or IDs of LoRAs to fuse"),
            rationale: z.string().describe("Explanation of why these LoRAs enhance the output"),
          }),
        }),
      },
      maxSteps: 3,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Sentinel Gateway Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
