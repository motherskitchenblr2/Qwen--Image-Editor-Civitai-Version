import { describe, it, expect } from "vitest";
import {
  generateSmartNegativePrompt,
  getRandomPromptArchetype,
  PROMPT_ARCHETYPES,
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
});
