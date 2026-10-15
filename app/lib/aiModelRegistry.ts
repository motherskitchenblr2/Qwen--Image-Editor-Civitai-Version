/**
 * Master AI Provider Platforms & Live Model Registry
 *
 * Provides consolidated catalog and dynamic live fetching for:
 * - Pollinations.ai / Nano Banana (100% Free, Zero Key, Unlimited)
 * - OpenRouter API (Live :free models with $0.00 pricing)
 * - Hugging Face Hub (Live open-weight text2img and img2img models)
 * - Cloudflare Workers AI (10,000 neurons/day Free Tier)
 * - Google AI Studio (Imagen 3 & Gemini 2.0 Flash Free Tier)
 * - Groq LPU (Ultra-Fast 30 RPM Free Tier)
 * - Kaggle Dual Tesla T4 (30 hrs/week Free GPU Quota)
 * - Alibaba DashScope (Free Trial Credits)
 */

export interface LiveAiModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  type: "text2img" | "img2img" | "text" | "multimodal" | "both";
  badge: string;
  latency: string;
  description: string;
  accentColor: string;
  isFree: boolean;            // 100% Free / Zero Cost
  isFreeTier: boolean;        // Free tier available (quota/credits)
  requiresApiKey: boolean;    // false if keyless
  pricingLabel: string;       // e.g. "$0.00 / 100% Free", "Free Tier Quota"
  contextLength?: number;
  parametersCount?: string;
  status: "active" | "ready" | "quota_notice" | "coming_soon";
  sourceUrl?: string;
}

export interface AiProviderPlatform {
  id: string;
  name: string;
  badge: string;
  category: "Zero-Key Free" | "Free Tier & Quota" | "Aggregator" | "Vision & Edge" | "GPU Cluster";
  description: string;
  hasFreeModels: boolean;
  defaultFreeModelId: string;
  docsUrl: string;
  color: {
    accent: string;
    border: string;
    bg: string;
    text: string;
  };
  models: LiveAiModel[];
}

// ─── CURATED BASE CATALOG (GUARANTEED AVAILABILITY OFFLINE / FALLBACK) ───
export const BASE_PROVIDERS: AiProviderPlatform[] = [
  {
    id: "nanobanana",
    name: "Nano Banana / Pollinations",
    badge: "🟢 100% FREE • Zero-Key",
    category: "Zero-Key Free",
    description: "Unlimited keyless neural synthesis. Powered by high-speed cluster running FLUX.1, SDXL Turbo, and specialized DiT checkpoints.",
    hasFreeModels: true,
    defaultFreeModelId: "nano-banana",
    docsUrl: "https://pollinations.ai",
    color: {
      accent: "from-amber-400 to-yellow-500",
      border: "border-amber-400/40",
      bg: "bg-amber-950/20",
      text: "text-amber-400",
    },
    models: [
      {
        id: "nano-banana",
        name: "Nano Banana Turbo",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "both",
        badge: "⚡ Sub-1.5s Ultra-Fast",
        latency: "~1.2s",
        description: "Compact ultra-fast neural generator optimized for rapid concepting and real-time generation.",
        accentColor: "from-amber-400 to-yellow-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/flux",
        name: "FLUX.1 Schnell Turbo",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "12B Rectified Flow",
        latency: "~3.2s",
        description: "State-of-the-art 12B rectified flow transformer for supreme prompt adherence and anatomical detail.",
        accentColor: "from-purple-500 to-indigo-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/flux-realism",
        name: "FLUX Realism Photo",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "Photorealistic Cinema",
        latency: "~3.8s",
        description: "Specialized FLUX weights fine-tuned for DSLR natural textures, skin micro-details, and volumetric lighting.",
        accentColor: "from-cyan-400 to-blue-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/flux-anime",
        name: "FLUX Anime & Manga Studio",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "Makoto Shinkai Style",
        latency: "~3.0s",
        description: "Japanese animation and vibrant digital illustration engine with clean cel shading and sharp linework.",
        accentColor: "from-pink-400 to-rose-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/flux-3d",
        name: "FLUX 3D Render Master",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "Octane / Blender 3D",
        latency: "~3.5s",
        description: "Hyper-detailed 3D isometric models, clay render aesthetics, and raytraced CGI asset styling.",
        accentColor: "from-emerald-400 to-teal-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/any-dark",
        name: "Any-Dark Cyberpunk Noir",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "Deep Contrast & Neon",
        latency: "~2.8s",
        description: "Deep shadows, vibrant neon luminescence, rainy noir streets, and moody dystopian aesthetics.",
        accentColor: "from-violet-500 to-fuchsia-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/midjourney",
        name: "Midjourney Emulation",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "text2img",
        badge: "Cinematic Fine Art",
        latency: "~4.0s",
        description: "Midjourney v5/v6 artistic composition emulation with dramatic framing and cinematic color grades.",
        accentColor: "from-rose-500 to-orange-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
      {
        id: "pollinations/turbo",
        name: "SDXL Turbo Instant",
        providerId: "nanobanana",
        providerName: "Nano Banana / Pollinations",
        type: "both",
        badge: "1-Step Adversarial",
        latency: "~1.0s",
        description: "Single-step adversarial diffusion distillation for instant concepts and interactive image editing.",
        accentColor: "from-lime-400 to-green-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "$0.00 • 100% Free (Unlimited)",
        status: "active",
      },
    ],
  },
  {
    id: "kaggle",
    name: "Kaggle Dual Tesla T4",
    badge: "🟢 100% FREE QUOTA • 30GB VRAM",
    category: "GPU Cluster",
    description: "Dedicated dual Nvidia Tesla T4 GPU cluster with 30 GB combined VRAM, dynamic Civitai LoRA fusing, and 5 TB Google Drive storage.",
    hasFreeModels: true,
    defaultFreeModelId: "kaggle-gpu",
    docsUrl: "https://kaggle.com",
    color: {
      accent: "from-emerald-400 to-teal-500",
      border: "border-emerald-500/40",
      bg: "bg-emerald-950/20",
      text: "text-emerald-400",
    },
    models: [
      {
        id: "kaggle-gpu",
        name: "Dual Tesla T4 Qwen-Edit + LoRA",
        providerId: "kaggle",
        providerName: "Kaggle Dual Tesla T4",
        type: "img2img",
        badge: "LoRA Fusion Engine",
        latency: "~18s",
        description: "High-precision Qwen DiT pipeline on Dual Tesla T4s with live safetensors LoRA weight injection.",
        accentColor: "from-emerald-500 to-teal-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "Free Quota (30 hrs/week)",
        status: "ready",
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter (Free Tier)",
    badge: "⚡ FREE MODELS CATALOG",
    category: "Aggregator",
    description: "Universal aggregator with 15+ completely free models (:free) including DeepSeek R1, Llama 3.3, and Qwen 2.5.",
    hasFreeModels: true,
    defaultFreeModelId: "openrouter/deepseek-r1-free",
    docsUrl: "https://openrouter.ai/models?q=free",
    color: {
      accent: "from-purple-500 to-indigo-500",
      border: "border-purple-500/40",
      bg: "bg-purple-950/20",
      text: "text-purple-400",
    },
    models: [
      {
        id: "deepseek/deepseek-r1:free",
        name: "DeepSeek R1 (Free)",
        providerId: "openrouter",
        providerName: "OpenRouter",
        type: "text",
        badge: "671B Reasoning Flagship",
        latency: "~3.0s",
        description: "Cutting-edge open reasoning model with transparent chain-of-thought for supreme prompt enrichment.",
        accentColor: "from-blue-500 to-cyan-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "$0.00 / Free Rate Limits",
        status: "active",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B Instruct (Free)",
        providerId: "openrouter",
        providerName: "OpenRouter",
        type: "text",
        badge: "Meta 70B Flagship",
        latency: "~1.8s",
        description: "Meta's flagship 70B parameter model with exceptional instruction following and artistic description writing.",
        accentColor: "from-indigo-500 to-purple-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "$0.00 / Free Rate Limits",
        status: "active",
      },
      {
        id: "qwen/qwen-2.5-coder-32b-instruct:free",
        name: "Qwen 2.5 Coder 32B (Free)",
        providerId: "openrouter",
        providerName: "OpenRouter",
        type: "text",
        badge: "Alibaba High-Speed",
        latency: "~1.5s",
        description: "High-speed Alibaba 32B model excellent for prompt structuring, camera parameters, and lighting definitions.",
        accentColor: "from-orange-500 to-amber-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "$0.00 / Free Rate Limits",
        status: "active",
      },
      {
        id: "google/gemini-2.0-flash-thinking-exp:free",
        name: "Gemini 2.0 Flash Thinking (Free)",
        providerId: "openrouter",
        providerName: "OpenRouter",
        type: "text",
        badge: "Google Experimental",
        latency: "~2.2s",
        description: "Google frontier multimodal thinking model with built-in visual composition analysis.",
        accentColor: "from-cyan-400 to-blue-600",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "$0.00 / Free Rate Limits",
        status: "active",
      },
    ],
  },
  {
    id: "huggingface",
    name: "Hugging Face Hub",
    badge: "🤗 OPEN SOURCE MODELS",
    category: "Vision & Edge",
    description: "World's largest community model hub. Access open weights and serverless inference for Stable Diffusion and DiT.",
    hasFreeModels: true,
    defaultFreeModelId: "stabilityai/stable-diffusion-xl-base-1.0",
    docsUrl: "https://huggingface.co/models?pipeline_tag=text-to-image",
    color: {
      accent: "from-yellow-400 to-amber-500",
      border: "border-yellow-400/40",
      bg: "bg-yellow-950/20",
      text: "text-yellow-400",
    },
    models: [
      {
        id: "stabilityai/stable-diffusion-xl-base-1.0",
        name: "SDXL Base 1.0 (Hugging Face)",
        providerId: "huggingface",
        providerName: "Hugging Face Hub",
        type: "both",
        badge: "Community Benchmark",
        latency: "~4.5s",
        description: "Stability AI premier open latent diffusion model for photorealism and artistic flexibility.",
        accentColor: "from-yellow-500 to-orange-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "Free Serverless & Open",
        status: "active",
      },
      {
        id: "black-forest-labs/FLUX.1-schnell",
        name: "FLUX.1 Schnell Open",
        providerId: "huggingface",
        providerName: "Hugging Face Hub",
        type: "text2img",
        badge: "Apache 2.0 Open Weights",
        latency: "~3.8s",
        description: "Black Forest Labs official Apache 2.0 licensed 12B rectified flow model for local & cloud inference.",
        accentColor: "from-purple-500 to-indigo-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "Free Open Weights",
        status: "active",
      },
      {
        id: "unsloth/Qwen-Image-2.1-GGUF",
        name: "Qwen Image 2.1 GGUF",
        providerId: "huggingface",
        providerName: "Hugging Face Hub",
        type: "both",
        badge: "Quantized Fast Inference",
        latency: "~3.2s",
        description: "Optimized Qwen Image quantized weights designed for memory-efficient edge execution.",
        accentColor: "from-emerald-400 to-teal-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: false,
        pricingLabel: "Free Community Download",
        status: "active",
      },
    ],
  },
  {
    id: "cloudflare_ai",
    name: "Cloudflare Workers AI",
    badge: "⚡ 10,000 NEURONS/DAY FREE",
    category: "Vision & Edge",
    description: "Serverless global edge GPUs with generous 10,000 free neurons daily quota for instant synthesis.",
    hasFreeModels: true,
    defaultFreeModelId: "cf-flux",
    docsUrl: "https://dash.cloudflare.com/ai/workers-ai",
    color: {
      accent: "from-cyan-500 to-blue-500",
      border: "border-cyan-500/40",
      bg: "bg-cyan-950/20",
      text: "text-cyan-400",
    },
    models: [
      {
        id: "cf-flux",
        name: "Flux 1 Schnell (Edge)",
        providerId: "cloudflare_ai",
        providerName: "Cloudflare Workers AI",
        type: "text2img",
        badge: "Serverless 4-Step",
        latency: "~2.8s",
        description: "Black Forest Labs Flux 1 Schnell accelerated on Cloudflare global edge GPU locations.",
        accentColor: "from-purple-500 to-indigo-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "10,000 Neurons/Day Free",
        status: "active",
      },
      {
        id: "cf-lucid",
        name: "Lucid Origin (Leonardo Edge)",
        providerId: "cloudflare_ai",
        providerName: "Cloudflare Workers AI",
        type: "text2img",
        badge: "Leonardo Serverless",
        latency: "~2.5s",
        description: "Leonardo AI Lucid Origin fast edge model with zero cold starts.",
        accentColor: "from-cyan-500 to-blue-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "10,000 Neurons/Day Free",
        status: "active",
      },
      {
        id: "cf-sdxl",
        name: "SDXL Lightning (Edge)",
        providerId: "cloudflare_ai",
        providerName: "Cloudflare Workers AI",
        type: "text2img",
        badge: "ByteDance Lightning",
        latency: "~1.8s",
        description: "Sub-2s 2-step Lightning SDXL diffusion running at edge points of presence.",
        accentColor: "from-emerald-400 to-teal-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "10,000 Neurons/Day Free",
        status: "active",
      },
    ],
  },
  {
    id: "gemini",
    name: "Google AI Studio",
    badge: "⚡ 1500 REQ/DAY FREE TIER",
    category: "Vision & Edge",
    description: "Google AI Studio with generous free quotas (15 RPM / 1500 RPD) for Gemini 2.0 Flash reasoning and Imagen 3 photorealism.",
    hasFreeModels: true,
    defaultFreeModelId: "google-imagen",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: {
      accent: "from-blue-500 to-indigo-500",
      border: "border-blue-500/40",
      bg: "bg-blue-950/20",
      text: "text-blue-400",
    },
    models: [
      {
        id: "google-imagen",
        name: "Google Imagen 3",
        providerId: "gemini",
        providerName: "Google AI Studio",
        type: "text2img",
        badge: "Premier Photorealism",
        latency: "~3.8s",
        description: "State-of-the-art text-to-image synthesis with typography and rich cinematic lighting.",
        accentColor: "from-blue-500 to-indigo-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "Free Trial / Studio Quota",
        status: "active",
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        providerId: "gemini",
        providerName: "Google AI Studio",
        type: "multimodal",
        badge: "1M Token Context",
        latency: "~1.2s",
        description: "Next-gen multimodal reasoning model for visual composition analysis and prompt enhancement.",
        accentColor: "from-cyan-400 to-blue-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "15 RPM • 1,500 RPD Free",
        status: "active",
      },
    ],
  },
  {
    id: "groq",
    name: "Groq LPU Inference",
    badge: "⚡ 14,400 REQ/DAY FREE TIER",
    category: "Free Tier & Quota",
    description: "Instant inference powered by Language Processing Units (LPU) running Llama 3.3 at 500+ tok/s on free tier.",
    hasFreeModels: true,
    defaultFreeModelId: "llama-3.3-70b-versatile",
    docsUrl: "https://console.groq.com/keys",
    color: {
      accent: "from-orange-500 to-amber-500",
      border: "border-orange-500/40",
      bg: "bg-orange-950/20",
      text: "text-orange-400",
    },
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B (Groq LPU)",
        providerId: "groq",
        providerName: "Groq LPU Inference",
        type: "text",
        badge: "500+ Tokens/sec",
        latency: "~0.6s",
        description: "Instant prompt rewriting and creative expansion at unmatched LPU speeds.",
        accentColor: "from-amber-500 to-orange-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "30 RPM • 14,400 RPD Free",
        status: "active",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        providerId: "groq",
        providerName: "Groq LPU Inference",
        type: "text",
        badge: "Sub-Second LPU",
        latency: "~0.3s",
        description: "Sub-second prompt enhancement for zero-latency workflows.",
        accentColor: "from-yellow-400 to-amber-500",
        isFree: true,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "30 RPM • 14,400 RPD Free",
        status: "active",
      },
    ],
  },
  {
    id: "dashscope",
    name: "Alibaba DashScope (ModelStudio)",
    badge: "⚡ FREE TRIAL CREDITS",
    category: "Vision & Edge",
    description: "Official cloud engine for Qwen Image & precision Image-to-Image editing with free trial credits upon signup.",
    hasFreeModels: true,
    defaultFreeModelId: "qwen-cloud",
    docsUrl: "https://dashscope.console.aliyun.com/",
    color: {
      accent: "from-orange-500 to-red-500",
      border: "border-orange-500/40",
      bg: "bg-orange-950/20",
      text: "text-orange-400",
    },
    models: [
      {
        id: "qwen-cloud",
        name: "Alibaba Qwen-Image (Cloud)",
        providerId: "dashscope",
        providerName: "Alibaba DashScope",
        type: "both",
        badge: "Native Qwen DiT",
        latency: "~5.0s",
        description: "Official Alibaba ModelStudio API for text-to-image synthesis and image-to-image editing.",
        accentColor: "from-orange-500 to-red-500",
        isFree: false,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "Free Trial Credits (New Users)",
        status: "active",
      },
      {
        id: "qwen-image-edit",
        name: "Alibaba Qwen-Image-Edit",
        providerId: "dashscope",
        providerName: "Alibaba DashScope",
        type: "img2img",
        badge: "Precision Inpainting",
        latency: "~5.2s",
        description: "Dedicated image-to-image semantic modification and element replacement.",
        accentColor: "from-red-500 to-amber-500",
        isFree: false,
        isFreeTier: true,
        requiresApiKey: true,
        pricingLabel: "Free Trial Credits (New Users)",
        status: "active",
      },
    ],
  },
];

// ─── CACHING LAYER (10-MINUTE TTL) ───
let cachedConsolidatedProviders: AiProviderPlatform[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Dynamically fetches live :free models from OpenRouter public API
 */
export async function fetchLiveOpenRouterFreeModels(): Promise<LiveAiModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawModels: any[] = data.data || [];

    // Filter only free models (id ending in :free or pricing prompt/completion == "0")
    const freeModels = rawModels.filter((m) => {
      const isTaggedFree = m.id?.includes(":free");
      const isZeroCost = m.pricing?.prompt === "0" && m.pricing?.completion === "0";
      return isTaggedFree || isZeroCost;
    });

    return freeModels.slice(0, 15).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      providerId: "openrouter",
      providerName: "OpenRouter",
      type: "text",
      badge: "🟢 100% Free",
      latency: "~1.5s",
      description: m.description || `OpenRouter free tier model with ${m.context_length || "32k"} context length.`,
      accentColor: "from-purple-500 to-indigo-500",
      isFree: true,
      isFreeTier: true,
      requiresApiKey: true,
      pricingLabel: "$0.00 / Zero Cost",
      contextLength: m.context_length,
      status: "active",
      sourceUrl: `https://openrouter.ai/${m.id}`,
    }));
  } catch (err) {
    console.warn("Notice: OpenRouter live model fetch note (using catalog fallback):", err);
    return [];
  }
}

/**
 * Dynamically fetches trending text-to-image models from Hugging Face Hub
 */
export async function fetchLiveHuggingFaceModels(): Promise<LiveAiModel[]> {
  try {
    const res = await fetch(
      "https://huggingface.co/api/models?pipeline_tag=text-to-image&sort=downloads&direction=-1&limit=8",
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4500),
      }
    );

    if (!res.ok) return [];

    const rawModels: any[] = await res.json();
    if (!Array.isArray(rawModels)) return [];

    return rawModels.map((m) => ({
      id: m.id,
      name: m.id.split("/")[1] || m.id,
      providerId: "huggingface",
      providerName: "Hugging Face Hub",
      type: "text2img",
      badge: "🤗 Open Source",
      latency: "~3.5s",
      description: `Hugging Face open weights with ${m.downloads?.toLocaleString() || "10k+"} community downloads.`,
      accentColor: "from-yellow-400 to-amber-500",
      isFree: true,
      isFreeTier: true,
      requiresApiKey: false,
      pricingLabel: "Free Serverless & Open Weights",
      status: "active",
      sourceUrl: `https://huggingface.co/${m.id}`,
    }));
  } catch (err) {
    console.warn("Notice: Hugging Face live model fetch note (using catalog fallback):", err);
    return [];
  }
}

/**
 * Returns consolidated providers & models, dynamically merging live API data
 */
export async function getConsolidatedLiveProviders(forceRefresh = false): Promise<{
  providers: AiProviderPlatform[];
  updatedAt: string;
  isCached: boolean;
  totalModels: number;
  freeModelsCount: number;
}> {
  const now = Date.now();
  if (!forceRefresh && cachedConsolidatedProviders && now - lastCacheTimestamp < CACHE_TTL_MS) {
    let total = 0;
    let freeCount = 0;
    for (const p of cachedConsolidatedProviders) {
      total += p.models.length;
      freeCount += p.models.filter((m) => m.isFree || m.isFreeTier).length;
    }
    return {
      providers: cachedConsolidatedProviders,
      updatedAt: new Date(lastCacheTimestamp).toISOString(),
      isCached: true,
      totalModels: total,
      freeModelsCount: freeCount,
    };
  }

  // Deep clone base catalog to prevent mutation
  const mergedProviders: AiProviderPlatform[] = JSON.parse(JSON.stringify(BASE_PROVIDERS));

  // Run live queries in parallel with graceful fallbacks
  const [liveOpenRouter, liveHuggingFace] = await Promise.all([
    fetchLiveOpenRouterFreeModels(),
    fetchLiveHuggingFaceModels(),
  ]);

  if (liveOpenRouter.length > 0) {
    const openRouterIdx = mergedProviders.findIndex((p) => p.id === "openrouter");
    if (openRouterIdx !== -1) {
      // Merge unique models
      const existingIds = new Set(mergedProviders[openRouterIdx].models.map((m) => m.id));
      for (const m of liveOpenRouter) {
        if (!existingIds.has(m.id)) {
          mergedProviders[openRouterIdx].models.push(m);
        }
      }
    }
  }

  if (liveHuggingFace.length > 0) {
    const hfIdx = mergedProviders.findIndex((p) => p.id === "huggingface");
    if (hfIdx !== -1) {
      const existingIds = new Set(mergedProviders[hfIdx].models.map((m) => m.id));
      for (const m of liveHuggingFace) {
        if (!existingIds.has(m.id)) {
          mergedProviders[hfIdx].models.push(m);
        }
      }
    }
  }

  cachedConsolidatedProviders = mergedProviders;
  lastCacheTimestamp = now;

  let total = 0;
  let freeCount = 0;
  for (const p of mergedProviders) {
    total += p.models.length;
    freeCount += p.models.filter((m) => m.isFree || m.isFreeTier).length;
  }

  return {
    providers: mergedProviders,
    updatedAt: new Date(now).toISOString(),
    isCached: false,
    totalModels: total,
    freeModelsCount: freeCount,
  };
}
