import { describe, it, expect } from "vitest";
import {
  generateSmartNegativePrompt,
  getRandomPromptArchetype,
  PROMPT_ARCHETYPES,
  brainstormPrompt,
  reformUserPrompt,
} from "@/app/lib/promptIntelligence";

describe("Prompt Intelligence & Smart Negative Engine", () => {
  it("accurately negates cartoon, anime, clay, and silicon when prompt contains hyper realistic", () => {
    const analysis = generateSmartNegativePrompt("a hyper realistic photograph of a futuristic pilot");

    expect(analysis.detectedAesthetics).toContain("Hyper-Realism & Photorealism");

    const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
    expect(tokens).toContain("cartoon");
    expect(tokens).toContain("anime");
    expect(tokens).toContain("clay");
    expect(tokens).toContain("silicon");
    expect(tokens).toContain("plastic");
    expect(tokens).toContain("doll");
    expect(tokens).toContain("cgi");
    expect(tokens).toContain("drawing");
    expect(tokens).toContain("sketch");
    expect(tokens).toContain("blurry");
    expect(tokens).toContain("low resolution");
  });

  it("accurately negates photorealism and real photograph when prompt contains anime style", () => {
    const analysis = generateSmartNegativePrompt("anime style illustration of magical girl in makoto shinkai aesthetic");

    expect(analysis.detectedAesthetics).toContain("Anime & Manga Art");

    const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
    expect(tokens).toContain("photorealistic");
    expect(tokens).toContain("real photograph");
    expect(tokens).toContain("realistic skin texture");
  });

  it("accurately negates photograph, CGI, and 3d render when prompt is oil painting", () => {
    const analysis = generateSmartNegativePrompt("masterpiece oil painting of an old scholar with chiaroscuro");

    expect(analysis.detectedAesthetics).toContain("Fine Art & Traditional Painting");

    const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
    expect(tokens).toContain("photograph");
    expect(tokens).toContain("3d render");
    expect(tokens).toContain("digital plastic");
    expect(tokens).toContain("smooth cgi");
  });

  it("applies anatomical safeguards when human subjects and hands are mentioned", () => {
    const analysis = generateSmartNegativePrompt("portrait of a woman showing her hands and smiling eyes");

    expect(analysis.detectedAesthetics).toContain("Human Subject & Anatomy Safeguards");

    const tokens = analysis.negativePrompt.split(",").map((s) => s.trim().toLowerCase());
    expect(tokens).toContain("bad anatomy");
    expect(tokens).toContain("deformed hands");
    expect(tokens).toContain("extra fingers");
    expect(tokens).toContain("missing fingers");
    expect(tokens).toContain("distorted face");
  });

  it("provides diverse prompt archetypes with paired smart negative recommendations", () => {
    expect(PROMPT_ARCHETYPES.length).toBeGreaterThanOrEqual(5);

    for (const arch of PROMPT_ARCHETYPES) {
      expect(arch.id).toBeDefined();
      expect(arch.name).toBeDefined();
      expect(arch.prompt.length).toBeGreaterThan(20);
      expect(arch.suggestedNegative.length).toBeGreaterThan(15);
    }

    const random = getRandomPromptArchetype();
    expect(random).toBeDefined();
    expect(random.prompt).toBeDefined();
  });

  it("brainstorms masterwork prompts from short seed topics or empty panes", () => {
    // 1. Empty topic defaults to master archetype
    const emptyResult = brainstormPrompt("");
    expect(emptyResult.prompt.length).toBeGreaterThan(25);
    expect(emptyResult.suggestedNegative.length).toBeGreaterThan(15);

    // 2. Specific seed topic (car) synthesizes commercial automotive composition
    const carResult = brainstormPrompt("sports car");
    expect(carResult.prompt.toLowerCase()).toContain("sports car");
    expect(carResult.prompt.toLowerCase()).toContain("cinematic commercial photography");
    expect(carResult.suggestedNegative.toLowerCase()).toContain("cartoon");

    // 3. Cyberpunk seed topic
    const cyberResult = brainstormPrompt("cyberpunk warrior");
    expect(cyberResult.prompt.toLowerCase()).toContain("cyberpunk warrior");
    expect(cyberResult.prompt.toLowerCase()).toContain("unreal engine 5");
  });

  it("reforms casual, improper, or imaginative user text into balanced professional tone", () => {
    const raw = "please can you generate a picture of a mechanical dragon flying over city";
    const reformed = reformUserPrompt(raw);

    // Strips conversational preamble
    expect(reformed.toLowerCase()).not.toContain("please can you");
    expect(reformed.toLowerCase()).not.toContain("generate a picture of");

    // Enriches with balanced professional descriptors
    expect(reformed).toContain("mechanical dragon flying over city");
    expect(reformed).toContain("balanced cinematic composition");
    expect(reformed).toContain("8k resolution, professional studio finish");
  });

  it("prioritizes Qwen2-VL Junior GGUF model at index 0 of Hugging Face provider", async () => {
    const { BASE_PROVIDERS } = await import("@/app/lib/aiModelRegistry");
    const { QWEN2_VL_JUNIOR_MODEL } = await import("@/app/lib/promptIntelligence");

    expect(QWEN2_VL_JUNIOR_MODEL.id).toBe("mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF");
    expect(QWEN2_VL_JUNIOR_MODEL.badge).toContain("JUNIOR VL");

    const hfProvider = BASE_PROVIDERS.find((p) => p.id === "huggingface");
    expect(hfProvider).toBeDefined();
    expect(hfProvider?.defaultFreeModelId).toBe("mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF");
    expect(hfProvider?.models[0].id).toBe("mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF");
    expect(hfProvider?.models[0].badge).toContain("JUNIOR VL");
  });
});
