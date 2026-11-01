import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

export const runtime = "edge";

interface ResolveClientOptions {
  model?: string;
  taskType?: "general" | "coding" | "reasoning" | "edit_prompt";
  nsfw_enabled?: boolean;
  customApiKey?: string;
  customBaseUrl?: string;
}

function getAiClient(options: ResolveClientOptions) {
  const { model, taskType = "general", nsfw_enabled = false, customApiKey, customBaseUrl } = options;

  if (customApiKey) {
    return {
      client: createOpenAI({
        apiKey: customApiKey,
        baseURL: customBaseUrl || "https://openrouter.ai/api/v1",
      }),
      model: model || "google/gemini-2.0-flash-001",
      hasKey: true,
      providerName: "Custom User Key",
    };
  }

  // 1. Coding Tasks: Primary Gemini 3.8 / 2.5 Pro (Google AI Studio) -> Fallback Nemotron 3 Super (NVIDIA)
  if (taskType === "coding") {
    if (process.env.GEMINI_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.GEMINI_API_KEY,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        }),
        model: "gemini-2.5-pro",
        hasKey: true,
        providerName: "Gemini 3.8 Pro (Google AI Studio)",
      };
    }
    if (process.env.NVIDIA_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.NVIDIA_API_KEY,
          baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
        }),
        model: "nvidia/llama-3.1-nemotron-70b-instruct",
        hasKey: true,
        providerName: "Nemotron 3 Super (NVIDIA NIM)",
      };
    }
  }

  // 2. Reasoning Tasks: Primary DeepSeek v4.1 Flash / R1 (NVIDIA) -> Fallback Groq Llama 3.3 70B
  if (taskType === "reasoning") {
    if (process.env.NVIDIA_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.NVIDIA_API_KEY,
          baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
        }),
        model: "deepseek-ai/deepseek-r1",
        hasKey: true,
        providerName: "DeepSeek v4.1 / R1 (NVIDIA NIM)",
      };
    }
    if (process.env.GROQ_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: "https://api.groq.com/openai/v1",
        }),
        model: "llama-3.3-70b-versatile",
        hasKey: true,
        providerName: "Groq Llama 3.3 70B (Free Tier)",
      };
    }
  }

  // 3. NSFW Mode Active: Primary Mistral AI -> Fallback Dolphin LLM (Uncensored)
  if (nsfw_enabled) {
    if (process.env.MISTRAL_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.MISTRAL_API_KEY,
          baseURL: "https://api.mistral.ai/v1",
        }),
        model: "open-mistral-nemo",
        hasKey: true,
        providerName: "Mistral AI (Platform Default)",
      };
    }
    if (process.env.DOLPHIN_API_KEY) {
      return {
        client: createOpenAI({
          apiKey: process.env.DOLPHIN_API_KEY,
          baseURL: process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1",
        }),
        model: "uncensored",
        hasKey: true,
        providerName: "Dolphin LLM (Uncensored Fallback)",
      };
    }
  }

  // 4. SFW Safe Mode (Default): Primary Gemma 4 31B IT (Google AI Studio) -> Fallback OpenRouter
  if (process.env.GEMINI_API_KEY) {
    return {
      client: createOpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      model: "gemini-2.0-flash",
      hasKey: true,
      providerName: "Gemma 4 31B IT / Gemini (Google AI Studio)",
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      client: createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
      }),
      model: model || (nsfw_enabled ? "mistralai/mistral-nemo" : "google/gemma-2-27b-it:free"),
      hasKey: true,
      providerName: "OpenRouter (Universal Gateway)",
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      client: createOpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: "llama-3.3-70b-versatile",
      hasKey: true,
      providerName: "Groq LPU (Free Tier)",
    };
  }

  // Fallback dummy client if no keys in environment
  return {
    client: createOpenAI({
      apiKey: "dummy-key-fallback",
      baseURL: "https://openrouter.ai/api/v1",
    }),
    model: model || "google/gemini-2.0-flash-001",
    hasKey: false,
    providerName: "Offline Fallback Heuristics",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      model,
      taskType = "general",
      nsfw_enabled = false,
      customApiKey,
      customBaseUrl,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid prompt: messages must not be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientConfig = getAiClient({
      model,
      taskType,
      nsfw_enabled,
      customApiKey,
      customBaseUrl,
    });

    const result = streamText({
      model: clientConfig.client(clientConfig.model),
      messages,
      system: `You are Sentinel, an autonomous AI Studio Copilot and smart, highly skilled professional Admin of Qwen Image Editor Studio.
The user is the Owner of this app making all major architectural decisions. You collaborate closely with the Owner, discussing and reviewing app behaviors, monitoring performance, and keeping the app healthy, reliable, and error-free.
You have direct tool access to control the workspace:
- When the user asks for a prompt, concept, or style, craft a high-end cinematic prompt and call 'studio_refine_prompt'.
- When the user wants optimal settings, analyze their concept and call 'studio_tune_parameters'.
- When the user asks to apply a visual style preset, call 'studio_apply_preset'.
- When the user inquires about canvas status or image contents, call 'studio_inspect_canvas'.
- For heavy or GPU operations (such as fusing LoRAs into the Kaggle GPU pipeline), invoke 'studio_fuse_loras' so the user gets an inline human-in-the-loop approval gate.
Always be concise, proactive, authoritative, and execute actions with tool calls rather than only giving hypothetical advice.`,
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
