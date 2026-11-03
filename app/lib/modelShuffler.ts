/**
 * Model Shuffler & Intelligent Task Router
 *
 * Implements dynamic AI model routing and shuffling across:
 * 1. "Edit Prompt"
 * 2. "Sentinel Copilot"
 * 3. "Brain-Storm"
 * 4. "Prompt Enhance"
 * 5. "Inspire"
 * 6. "Auto-Negative"
 *
 * Routing Rules:
 * - NSFW Mode (ON):
 *   - Primary AI: Mistral AI (open-mistral-nemo / mistral-large-latest via Mistral Platform API)
 *   - Fallback AI: Dolphin AI (uncensored via Dolphin AI API Platform)
 * - SFW Mode (ON / Default):
 *   - Primary AI: Gemini 2.0 Flash from Google AI Studio Platform
 *   - Fallback AI: Gemma 2 27B IT from OpenRouter
 * - Coding Tasks:
 *   - Primary AI: Gemini 3.8 / Gemini 2.5 Pro from Google AI Studio
 *   - Fallback AI: Nemotron 3 Super (Free) / Nemotron 3 Ultra from NVIDIA Platform
 * - Reasoning Tasks:
 *   - Primary AI: DeepSeek v4.1 Flash / DeepSeek R1 from NVIDIA Platform
 *   - Fallback AI: Groq Llama 3.3 70B Free Tier OR OpenRouter Free Reasoning (deepseek-r1:free)
 */

export type TaskCategory =
  | "edit_prompt"
  | "copilot"
  | "brainstorm"
  | "enhance"
  | "inspire"
  | "auto_negative"
  | "coding"
  | "reasoning";

export interface ShuffledModelRoute {
  task: TaskCategory;
  isNsfw: boolean;
  primaryProvider: "mistral" | "gemini" | "nvidia" | "dolphin" | "groq" | "openrouter";
  primaryModel: string;
  primaryLabel: string;
  primaryBaseUrl: string;
  primaryEnvKey: string;
  fallbackProvider: "dolphin" | "openrouter" | "nvidia" | "groq" | "mistral";
  fallbackModel: string;
  fallbackLabel: string;
  fallbackBaseUrl: string;
  fallbackEnvKey: string;
  badge: string;
  description: string;
}

export function getShuffledModelRoute(options: {
  nsfw_enabled: boolean;
  taskType?: TaskCategory | "general";
}): ShuffledModelRoute {
  const isNsfw = Boolean(options.nsfw_enabled);
  const task = (options.taskType || "copilot") as TaskCategory;

  // 1. Coding Tasks
  if (task === "coding") {
    return {
      task: "coding",
      isNsfw,
      primaryProvider: "gemini",
      primaryModel: "gemini-2.5-pro",
      primaryLabel: "Gemini 3.8 Pro (Google AI Studio)",
      primaryBaseUrl: "https://generativelanguage.googleapis.com",
      primaryEnvKey: "GEMINI_API_KEY",
      fallbackProvider: "nvidia",
      fallbackModel: "nvidia/llama-3.1-nemotron-70b-instruct",
      fallbackLabel: "Nemotron 3 Super / Ultra (NVIDIA NIM)",
      fallbackBaseUrl: "https://integrate.api.nvidia.com/v1",
      fallbackEnvKey: "NVIDIA_API_KEY",
      badge: "💻 Coding Specialist",
      description: "Optimized for code generation, syntax validation, and technical logic.",
    };
  }

  // 2. Reasoning Tasks
  if (task === "reasoning") {
    return {
      task: "reasoning",
      isNsfw,
      primaryProvider: "nvidia",
      primaryModel: "deepseek-ai/deepseek-r1",
      primaryLabel: "DeepSeek v4.1 Flash / R1 (NVIDIA NIM)",
      primaryBaseUrl: "https://integrate.api.nvidia.com/v1",
      primaryEnvKey: "NVIDIA_API_KEY",
      fallbackProvider: "groq",
      fallbackModel: "llama-3.3-70b-versatile",
      fallbackLabel: "Groq Llama 3.3 70B (Free Tier)",
      fallbackBaseUrl: "https://api.groq.com/openai/v1",
      fallbackEnvKey: "GROQ_API_KEY",
      badge: "🧠 Deep Reasoning",
      description: "High-level chain-of-thought analysis and complex visual composition reasoning.",
    };
  }

  // 3. NSFW Mode Active (applies to Edit Prompt, Copilot, Brain-Storm, Enhance, Inspire, Auto-Negative)
  if (isNsfw) {
    return {
      task,
      isNsfw: true,
      primaryProvider: "mistral",
      primaryModel: "open-mistral-nemo",
      primaryLabel: "Mistral AI (Platform Default)",
      primaryBaseUrl: "https://api.mistral.ai/v1",
      primaryEnvKey: "MISTRAL_API_KEY",
      fallbackProvider: "dolphin",
      fallbackModel: "uncensored",
      fallbackLabel: "Dolphin LLM (Uncensored Fallback)",
      fallbackBaseUrl: process.env.DOLPHIN_BASE_URL || "https://api.dolphinllm.com/v1",
      fallbackEnvKey: "DOLPHIN_API_KEY",
      badge: "🔞 18+ Unrestricted NSFW",
      description: "Unfiltered creative prompts, edits, brainstorming, and styling via Mistral AI with Dolphin LLM fallback.",
    };
  }

  // 4. SFW Safe Mode (Default) (applies to Edit Prompt, Copilot, Brain-Storm, Enhance, Inspire, Auto-Negative)
  return {
    task,
    isNsfw: false,
    primaryProvider: "gemini",
    primaryModel: "gemini-2.0-flash",
    primaryLabel: "Gemini 2.0 Flash (Google AI Studio)",
    primaryBaseUrl: "https://generativelanguage.googleapis.com",
    primaryEnvKey: "GEMINI_API_KEY",
    fallbackProvider: "openrouter",
    fallbackModel: "google/gemini-2.0-flash-001",
    fallbackLabel: "Gemini 2.0 Flash (OpenRouter Fallback)",
    fallbackBaseUrl: "https://openrouter.ai/api/v1",
    fallbackEnvKey: "OPENROUTER_API_KEY",
    badge: "🛡️ SFW Safe Mode",
    description: "Curated, high-fidelity prompt engineering and safety-guarded studio styling via Google AI Studio.",
  };
}

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  category?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", badge: "🛡️ SFW Default (Google AI Studio)", category: "sfw" },
  { id: "mistralai/mistral-nemo", name: "Mistral NeMo 12B", badge: "🔞 NSFW Default (Mistral AI)", category: "nsfw" },
  { id: "dolphinllm/uncensored", name: "Dolphin LLM", badge: "🔞 NSFW Fallback (Uncensored)", category: "nsfw" },
  { id: "google/gemma-2-27b-it", name: "Gemma 2 27B IT", badge: "🛡️ SFW Fallback (OpenRouter)", category: "sfw" },
  { id: "google/gemini-2.5-pro", name: "Gemini 3.8 / 2.5 Pro", badge: "💻 Coding Specialist (Google)", category: "coding" },
  { id: "nvidia/nemotron-3-super", name: "Nemotron 3 Super", badge: "💻 Coding Fallback (NVIDIA NIM)", category: "coding" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek v4.1 / R1", badge: "🧠 Reasoning Specialist (NVIDIA NIM)", category: "reasoning" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", badge: "⚡ Free Reasoning Fallback (OpenRouter)", category: "reasoning" },
  { id: "llama-3.3-70b-versatile", name: "Groq Llama 3.3 70B", badge: "⚡ Free Tier (Groq Native)", category: "reasoning" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", badge: "Ultra-Fast Studio", category: "general" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", badge: "Master Prompting", category: "general" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", badge: "Balanced Intelligence", category: "general" },
];
