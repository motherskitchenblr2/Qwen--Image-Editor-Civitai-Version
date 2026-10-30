import { describe, it, expect, vi } from "vitest";
import {
  brainstormPrompt,
  reformUserPrompt,
  generateSmartNegativePrompt,
  PROMPT_ARCHETYPES,
} from "@/app/lib/promptIntelligence";
import {
  isNsfwContent,
  checkContentSafety,
  NSFW_BLOCKED_MESSAGE,
} from "@/app/lib/nsfwFilter";
import { BASE_PROVIDERS } from "@/app/lib/aiModelRegistry";

describe("Live Model Quality, Skills & SFW/NSFW Prompt Intelligence Comprehensive Suite", () => {
  describe("1. Inspire / Brain-storm Generation Quality (SFW & NSFW)", () => {
    it("generates Midjourney & DALL-E 3 aesthetic compositions for empty pane or seed topics in SFW mode", () => {
      // Empty pane
      const emptyResult = brainstormPrompt("", false);
      expect(emptyResult.error).toBeUndefined();
      expect(emptyResult.prompt.length).toBeGreaterThan(40);
      expect(emptyResult.suggestedNegative.length).toBeGreaterThan(20);

      // Specific seed topics
      const testTopics = [
        { topic: "sports car", expectedTerms: ["commercial photography", "lighting"] },
        { topic: "portrait of a woman", expectedTerms: ["portrait", "rembrandt", "lighting"] },
        { topic: "cyberpunk warrior", expectedTerms: ["cyberpunk", "unreal engine"] },
        { topic: "mountain forest", expectedTerms: ["landscape", "detail"] },
      ];

      for (const item of testTopics) {
        const result = brainstormPrompt(item.topic, false);
        expect(result.error).toBeUndefined();
        expect(result.prompt.length).toBeGreaterThan(50);
        expect(result.suggestedNegative.length).toBeGreaterThan(20);
        for (const term of item.expectedTerms) {
          expect(result.prompt.toLowerCase()).toContain(term);
        }
      }
    });

    it("strictly blocks NSFW seed topics in SFW mode", () => {
      const nsfwSeeds = ["nude model", "sexy anime naked", "explicit boobs", "hentai uncensored"];
      for (const seed of nsfwSeeds) {
        const result = brainstormPrompt(seed, false);
        expect(result.error).toBe(NSFW_BLOCKED_MESSAGE);
        expect(result.prompt).toBe(NSFW_BLOCKED_MESSAGE);
      }
    });

    it("composes rich artistic fine-art masterworks for NSFW seed topics when NSFW mode is UNLOCKED", () => {
      const nsfwSeeds = ["nude artistic statue", "sensual boudoir photography", "erotic silhouette"];
      for (const seed of nsfwSeeds) {
        const result = brainstormPrompt(seed, true);
        expect(result.error).toBeUndefined();
        expect(result.prompt).not.toBe(NSFW_BLOCKED_MESSAGE);
        expect(result.prompt.length).toBeGreaterThan(30);
        expect(result.prompt.toLowerCase()).toContain("chiaroscuro");
      }
    });
  });

  describe("2. Prompt Enhancer / Reformer (ChatGPT/Midjourney-Grade Enrichment)", () => {
    it("reforms casual, messy or raw requests into professional photographic prompts", () => {
      const casualInputs = [
        "please can you draw a picture of a cyberpunk street in rain",
        "i want a photo of an astronaut on mars with high details",
        "make me a portrait of an elderly craftsman smiling",
      ];

      for (const input of casualInputs) {
        const enhanced = reformUserPrompt(input, false);
        expect(enhanced).not.toContain("please can you");
        expect(enhanced).not.toContain("i want a photo of");
        expect(enhanced).not.toContain("make me a");
        expect(enhanced).toContain("balanced cinematic composition");
        expect(enhanced).toContain("8k resolution");
      }
    });

    it("blocks NSFW prompts during enhancement when SFW mode is active", () => {
      const nsfwCasual = "can you make a picture of a naked woman on the beach";
      const enhanced = reformUserPrompt(nsfwCasual, false);
      expect(enhanced).toBe(NSFW_BLOCKED_MESSAGE);
    });

    it("enhances artistic prompts without admin block when NSFW mode is active", () => {
      const nsfwCasual = "can you make a picture of a naked statue in an ancient roman museum";
      const enhanced = reformUserPrompt(nsfwCasual, true);
      expect(enhanced).not.toBe(NSFW_BLOCKED_MESSAGE);
      expect(enhanced).toContain("naked statue in an ancient roman museum");
    });
  });

  describe("3. Smart Auto-Negative Prompt Deduction Engine", () => {
    it("deduces photographic style protectors when prompt implies photorealism", () => {
      const analysis = generateSmartNegativePrompt("hyper realistic 8k raw photograph of a wild cheetah");
      expect(analysis.detectedAesthetics).toContain("Hyper-Realism & Photorealism");
      const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
      expect(tokens).toContain("cartoon");
      expect(tokens).toContain("anime");
      expect(tokens).toContain("3d render");
      expect(tokens).toContain("plastic");
      expect(tokens).toContain("cgi");
      expect(tokens).toContain("blurry");
    });

    it("deduces realistic skin protectors when prompt implies anime/manga", () => {
      const analysis = generateSmartNegativePrompt("makoto shinkai anime style illustration of a sunset over Tokyo");
      expect(analysis.detectedAesthetics).toContain("Anime & Manga Art");
      const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
      expect(tokens).toContain("photorealistic");
      expect(tokens).toContain("real photograph");
      expect(tokens).toContain("realistic skin texture");
    });

    it("deduces CGI and digital artifact protectors when prompt implies oil painting", () => {
      const analysis = generateSmartNegativePrompt("museum masterpiece oil painting on textured canvas with impasto");
      expect(analysis.detectedAesthetics).toContain("Fine Art & Traditional Painting");
      const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
      expect(tokens).toContain("photograph");
      expect(tokens).toContain("3d render");
      expect(tokens).toContain("smooth cgi");
    });

    it("deduces anatomical distortion protectors when human subjects are present", () => {
      const analysis = generateSmartNegativePrompt("cinematic portrait of a female warrior drawing her sword");
      expect(analysis.detectedAesthetics).toContain("Human Subject & Anatomy Safeguards");
      const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
      expect(tokens).toContain("bad anatomy");
      expect(tokens).toContain("deformed hands");
      expect(tokens).toContain("extra fingers");
    });
  });

  describe("4. Model Registry Coverage & Classification", () => {
    it("validates all base providers and ensures guaranteed free tiers", () => {
      expect(BASE_PROVIDERS.length).toBeGreaterThanOrEqual(4);

      const providerIds = BASE_PROVIDERS.map((p) => p.id);
      expect(providerIds).toContain("nanobanana");
      expect(providerIds).toContain("kaggle");
      expect(providerIds).toContain("huggingface");
      expect(providerIds).toContain("cloudflare_ai");

      // Verify Nano Banana models
      const nbProvider = BASE_PROVIDERS.find((p) => p.id === "nanobanana");
      expect(nbProvider).toBeDefined();
      const nbModelIds = nbProvider?.models.map((m) => m.id) || [];
      expect(nbModelIds).toContain("nano-banana");
      expect(nbModelIds).toContain("pollinations/flux");
      expect(nbModelIds).toContain("pollinations/flux-realism");
      expect(nbModelIds).toContain("pollinations/flux-anime");
      expect(nbModelIds).toContain("pollinations/midjourney");
      expect(nbModelIds).toContain("pollinations/turbo");

      // Verify all Nano Banana models are zero-key & 100% free
      for (const model of nbProvider?.models || []) {
        expect(model.isFree).toBe(true);
        expect(model.requiresApiKey).toBe(false);
      }
    });

    it("verifies dual capability (text2img + img2img) distribution across models", () => {
      const allModels = BASE_PROVIDERS.flatMap((p) => p.models);
      
      const t2iModels = allModels.filter((m) => m.type === "text2img" || m.type === "both");
      const i2iModels = allModels.filter((m) => m.type === "img2img" || m.type === "both");

      expect(t2iModels.length).toBeGreaterThanOrEqual(8);
      expect(i2iModels.length).toBeGreaterThanOrEqual(4);

      // Nano Banana Turbo supports both
      const nanoBanana = allModels.find((m) => m.id === "nano-banana");
      expect(nanoBanana?.type).toBe("both");

      // Kaggle GPU supports img2img with LoRA fusion
      const kaggleGpu = allModels.find((m) => m.id === "kaggle-gpu");
      expect(kaggleGpu?.type).toBe("img2img");
    });
  });
});
