import { describe, it, expect } from "vitest";
import { getShuffledModelRoute, TaskCategory } from "@/app/lib/modelShuffler";
import { BASE_PROVIDERS } from "@/app/lib/aiModelRegistry";

describe("Model Shuffler & Task Routing Engine", () => {
  describe("NSFW Mode Shuffling (Mistral AI Primary -> Dolphin LLM Fallback)", () => {
    const nsfwFeatures: TaskCategory[] = [
      "edit_prompt",
      "copilot",
      "brainstorm",
      "enhance",
      "inspire",
      "auto_negative",
    ];

    it.each(nsfwFeatures)(
      "routes %s to Mistral AI (Primary) and Dolphin LLM (Fallback) when NSFW is enabled",
      (feature) => {
        const route = getShuffledModelRoute({ nsfw_enabled: true, taskType: feature });

        expect(route.isNsfw).toBe(true);
        expect(route.primaryProvider).toBe("mistral");
        expect(route.primaryModel).toBe("open-mistral-nemo");
        expect(route.primaryEnvKey).toBe("MISTRAL_API_KEY");

        expect(route.fallbackProvider).toBe("dolphin");
        expect(route.fallbackModel).toBe("uncensored");
        expect(route.fallbackEnvKey).toBe("DOLPHIN_API_KEY");
      }
    );
  });

  describe("SFW Mode Shuffling (Gemma 4 31B IT Google Primary -> OpenRouter Fallback)", () => {
    const sfwFeatures: TaskCategory[] = [
      "edit_prompt",
      "copilot",
      "brainstorm",
      "enhance",
      "inspire",
      "auto_negative",
    ];

    it.each(sfwFeatures)(
      "routes %s to Gemma 4 31B IT (Google AI Studio) and OpenRouter fallback when SFW is enabled",
      (feature) => {
        const route = getShuffledModelRoute({ nsfw_enabled: false, taskType: feature });

        expect(route.isNsfw).toBe(false);
        expect(route.primaryProvider).toBe("gemini");
        expect(route.primaryModel).toBe("google/gemma-4-31b-it");
        expect(route.primaryEnvKey).toBe("GEMINI_API_KEY");

        expect(route.fallbackProvider).toBe("openrouter");
        expect(route.fallbackModel).toBe("google/gemma-4-31b-it");
        expect(route.fallbackEnvKey).toBe("OPENROUTER_API_KEY");
      }
    );
  });

  describe("Task-Specific Specializations (Coding & Reasoning)", () => {
    it("routes coding tasks to Gemini 3.8 / 2.5 Pro (Primary) and NVIDIA Nemotron 3 Super (Fallback)", () => {
      const route = getShuffledModelRoute({ nsfw_enabled: false, taskType: "coding" });

      expect(route.task).toBe("coding");
      expect(route.primaryProvider).toBe("gemini");
      expect(route.primaryModel).toBe("gemini-2.5-pro");
      expect(route.primaryEnvKey).toBe("GEMINI_API_KEY");

      expect(route.fallbackProvider).toBe("nvidia");
      expect(route.fallbackModel).toBe("nvidia/llama-3.1-nemotron-70b-instruct");
      expect(route.fallbackEnvKey).toBe("NVIDIA_API_KEY");
      expect(route.badge).toContain("Coding");
    });

    it("routes reasoning tasks to DeepSeek v4.1 Flash / R1 (NVIDIA NIM Primary) and Groq Llama 3.3 70B (Fallback)", () => {
      const route = getShuffledModelRoute({ nsfw_enabled: false, taskType: "reasoning" });

      expect(route.task).toBe("reasoning");
      expect(route.primaryProvider).toBe("nvidia");
      expect(route.primaryModel).toBe("deepseek-ai/deepseek-r1");
      expect(route.primaryEnvKey).toBe("NVIDIA_API_KEY");

      expect(route.fallbackProvider).toBe("groq");
      expect(route.fallbackModel).toBe("llama-3.3-70b-versatile");
      expect(route.fallbackEnvKey).toBe("GROQ_API_KEY");
      expect(route.badge).toContain("Reasoning");
    });
  });

  describe("Master AI Model Registry Alignment", () => {
    it("verifies NVIDIA NIM Platform is present in base catalog with Nemotron and DeepSeek", () => {
      const nvidiaProvider = BASE_PROVIDERS.find((p) => p.id === "nvidia");
      expect(nvidiaProvider).toBeDefined();
      expect(nvidiaProvider?.name).toContain("NVIDIA");

      const modelIds = (nvidiaProvider?.models || []).map((m) => m.id);
      expect(modelIds).toContain("deepseek-ai/deepseek-r1");
      expect(modelIds).toContain("nvidia/llama-3.1-nemotron-70b-instruct");
    });

    it("verifies Google AI Studio catalog contains Gemma 4 31B IT and Gemini coding specialist", () => {
      const googleProvider = BASE_PROVIDERS.find((p) => p.id === "gemini");
      expect(googleProvider).toBeDefined();

      const modelIds = (googleProvider?.models || []).map((m) => m.id);
      expect(modelIds).toContain("google/gemma-4-31b-it");
      expect(modelIds).toContain("gemini-2.5-pro");
    });

    it("verifies Mistral AI catalog contains NeMo 12B and Dolphin LLM catalog contains uncensored", () => {
      const mistralProvider = BASE_PROVIDERS.find((p) => p.id === "mistral");
      expect(mistralProvider).toBeDefined();
      expect(mistralProvider?.models.some((m) => m.id === "open-mistral-nemo")).toBe(true);

      const dolphinProvider = BASE_PROVIDERS.find((p) => p.id === "dolphin");
      expect(dolphinProvider).toBeDefined();
      expect(dolphinProvider?.models.some((m) => m.id === "uncensored")).toBe(true);
    });
  });
});
