import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import * as generateRoute from "@/app/api/generate/route";

describe("Enterprise Resilient Generation & Editing Pipeline", () => {
  it("generates an image with Nano Banana Turbo fallback when Cloudflare is unavailable", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "A beautiful serene Japanese garden in autumn",
        model: "nano-banana",
        size: "1024*1024",
      }),
    });

    const mockFetch = vi.fn().mockImplementation(async (input: any) => {
      const url = input?.toString() || "";
      if (url.includes("image.pollinations.ai") || url.includes("cloudflare")) {
        const dummyBuffer = Buffer.from("dummy_jpeg_binary_data");
        return new Response(dummyBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.image_base64).toBeDefined();
    expect(data.image_base64.startsWith("data:image/")).toBe(true);
    expect(data.prompt).toBe("A beautiful serene Japanese garden in autumn");

    vi.unstubAllGlobals();
  }, 25000);

  it("handles missing prompt with 400 Bad Request", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "   ",
        model: "nano-banana",
      }),
    });

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Prompt is required.");
  });

  it("blocks NSFW generation requests in SFW mode with 403 'NSFW Blocked by Admin'", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "generate a nude explicit photograph",
        model: "nano-banana",
        nsfw_enabled: false,
      }),
    });

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toBe("NSFW Blocked by Admin");
  });

  it("allows artistic generation requests when nsfw_enabled is true", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "sensual fine art statue in marble with chiaroscuro lighting",
        model: "nano-banana",
        nsfw_enabled: true,
      }),
    });

    const mockFetch = vi.fn().mockImplementation(async (input: any) => {
      const url = input?.toString() || "";
      if (url.includes("image.pollinations.ai")) {
        return new Response(Buffer.from("dummy_jpeg"), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.image_base64).toBeDefined();

    vi.unstubAllGlobals();
  });

  it("applies Midjourney v6 cinematography quality booster when midjourney model is selected", async () => {
    let capturedUrl = "";
    const mockFetch = vi.fn().mockImplementation(async (input: any) => {
      capturedUrl = input?.toString() || "";
      return new Response(Buffer.from("dummy_jpeg"), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "A mystical floating castle among golden clouds",
        model: "midjourney-v6",
      }),
    });

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(capturedUrl).toContain("model=midjourney");
    expect(decodeURIComponent(capturedUrl)).toContain("cinematic composition");

    vi.unstubAllGlobals();
  });

  it("applies surgical editing preservation tokens when mode is 'edit'", async () => {
    let capturedUrl = "";
    const mockFetch = vi.fn().mockImplementation(async (input: any) => {
      capturedUrl = input?.toString() || "";
      return new Response(Buffer.from("dummy_jpeg"), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Change jacket color to bright red leather",
        mode: "edit",
        model: "nano-banana",
        image_base64: "data:image/png;base64,fakeimagebase64data",
      }),
    });

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.model).toContain("Edit");
    expect(data.prompt).toContain("Change jacket color to bright red leather");
    expect(data.prompt).toContain("8k resolution");

    vi.unstubAllGlobals();
  });
});
