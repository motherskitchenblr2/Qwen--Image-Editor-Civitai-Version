import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  isNsfwContent,
  isImageFileNsfw,
  checkContentSafety,
  NSFW_BLOCKED_MESSAGE,
} from "@/app/lib/nsfwFilter";
import {
  brainstormPrompt,
  reformUserPrompt,
} from "@/app/lib/promptIntelligence";

describe("NSFW / SFW Safety & Admin Enforcement Engine", () => {
  it("enforces the exact blocked message constant: 'NSFW Blocked by Admin'", () => {
    expect(NSFW_BLOCKED_MESSAGE).toBe("NSFW Blocked by Admin");
  });

  describe("isNsfwContent word boundaries & accuracy", () => {
    it("detects explicit adult and NSFW terms", () => {
      expect(isNsfwContent("generate a nude portrait")).toBe(true);
      expect(isNsfwContent("ultra realistic nsfw art")).toBe(true);
      expect(isNsfwContent("naked model in neon lighting")).toBe(true);
      expect(isNsfwContent("explicit pornographic anime scene")).toBe(true);
      expect(isNsfwContent("hentai style girl")).toBe(true);
      expect(isNsfwContent("woman with exposed breasts")).toBe(true);
      expect(isNsfwContent("fetish leather suit")).toBe(true);
      expect(isNsfwContent("erotic boudoir photo")).toBe(true);
    });

    it("does NOT falsely flag benign words with partial substrings", () => {
      // "cockpit" should not trigger "cock"
      expect(isNsfwContent("pilot sitting in the cockpit of a jet fighter")).toBe(false);
      // "compass" should not trigger "ass"
      expect(isNsfwContent("vintage compass on ancient treasure map")).toBe(false);
      // "document" should not trigger
      expect(isNsfwContent("high quality document scan on a wooden table")).toBe(false);
      // "peacock" should not trigger
      expect(isNsfwContent("colorful peacock feather macro photography")).toBe(false);
      // "class", "classic" should not trigger
      expect(isNsfwContent("classic muscle car in sunny afternoon")).toBe(false);
      // "photograph of clean sports car"
      expect(isNsfwContent("photograph of clean red sports car")).toBe(false);
    });
  });

  describe("isImageFileNsfw file name detection", () => {
    it("flags files containing NSFW keywords in filename", () => {
      expect(isImageFileNsfw("nsfw_model_pose.jpg")).toBe(true);
      expect(isImageFileNsfw("my_nude_art_render.png")).toBe(true);
      expect(isImageFileNsfw("explicit_xxx_photo.webp")).toBe(true);
      expect(isImageFileNsfw("hentai_illustration.jpg")).toBe(true);
      expect(isImageFileNsfw("erotic_photo_01.png")).toBe(true);
    });

    it("allows standard clean filenames", () => {
      expect(isImageFileNsfw("portrait_cyberpunk.jpg")).toBe(false);
      expect(isImageFileNsfw("clean_studio_render.png")).toBe(false);
      expect(isImageFileNsfw("landscape_mountain_4k.webp")).toBe(false);
      expect(isImageFileNsfw("classic_car_showcase.jpg")).toBe(false);
    });
  });

  describe("checkContentSafety gate", () => {
    it("blocks NSFW input in SFW mode with exact 'NSFW Blocked by Admin' message", () => {
      const result = checkContentSafety("generate a naked cyberpunk dancer", false);
      expect(result.safe).toBe(false);
      expect(result.error).toBe("NSFW Blocked by Admin");
    });

    it("permits NSFW input when isNsfwAllowed is true (NSFW Mode Active)", () => {
      const result = checkContentSafety("generate a naked cyberpunk dancer", true);
      expect(result.safe).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("permits benign input in SFW mode", () => {
      const result = checkContentSafety("futuristic cybernetic sports car", false);
      expect(result.safe).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("brainstormPrompt SFW vs NSFW behavior", () => {
    it("refuses NSFW seed topics in SFW mode with 'NSFW Blocked by Admin'", () => {
      const result = brainstormPrompt("nude goddess", false);
      expect(result.error).toBe("NSFW Blocked by Admin");
      expect(result.prompt).toBe("NSFW Blocked by Admin");
    });

    it("composes artistic NSFW masterwork when isNsfwAllowed is true", () => {
      const result = brainstormPrompt("nude artistic statue", true);
      expect(result.error).toBeUndefined();
      expect(result.prompt).not.toBe("NSFW Blocked by Admin");
      expect(result.prompt.length).toBeGreaterThan(20);
      expect(result.prompt.toLowerCase()).toContain("nude artistic statue");
    });

    it("composes safe masterwork prompt for benign seed in SFW mode", () => {
      const result = brainstormPrompt("cyberpunk street", false);
      expect(result.error).toBeUndefined();
      expect(result.prompt.toLowerCase()).toContain("cyberpunk street");
    });
  });

  describe("reformUserPrompt SFW vs NSFW behavior", () => {
    it("refuses NSFW user prompt in SFW mode with 'NSFW Blocked by Admin'", () => {
      const result = reformUserPrompt("please make this model naked and unclad", false);
      expect(result).toBe("NSFW Blocked by Admin");
    });

    it("reforms and enriches adult prompt when isNsfwAllowed is true", () => {
      const result = reformUserPrompt("please make this model artistic nude in studio light", true);
      expect(result).not.toBe("NSFW Blocked by Admin");
      expect(result.toLowerCase()).not.toContain("please make this");
      expect(result).toContain("balanced cinematic composition");
    });

    it("reforms benign prompt in SFW mode normally", () => {
      const result = reformUserPrompt("please make a glowing blue dragon over futuristic skyscrapers", false);
      expect(result).not.toBe("NSFW Blocked by Admin");
      expect(result.toLowerCase()).not.toContain("please make a");
      expect(result).toContain("glowing blue dragon over futuristic skyscrapers");
    });
  });

  describe("API Serverless Route Guardrails", () => {
    it("verifies POST /api/generate blocks NSFW in SFW mode with 403", async () => {
      const { POST } = await import("@/app/api/generate/route");
      const req = new NextRequest("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "a hyper-realistic nude portrait in studio lighting",
          model: "nano-banana",
          nsfw_enabled: false,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("NSFW Blocked by Admin");
    });

    it("verifies POST /api/edit blocks NSFW in SFW mode with 403", async () => {
      const { POST } = await import("@/app/api/edit/route");
      const req = new NextRequest("http://localhost:3000/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          prompt: "remove clothes and show nude body",
          nsfw_enabled: false,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("NSFW Blocked by Admin");
    });

    it("verifies POST /api/sentinel/enhance blocks NSFW in SFW mode with 403", async () => {
      const { POST } = await import("@/app/api/sentinel/enhance/route");
      const req = new NextRequest("http://localhost:3000/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "explicit pornographic fantasy art",
          nsfw_enabled: false,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("NSFW Blocked by Admin");
    });
  });
});
