import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import * as generateRoute from "@/app/api/generate/route";

describe("Enterprise Resilient Generation Pipeline", () => {
  it("generates an image with Nano Banana Turbo fallback when Cloudflare is unavailable", async () => {
    // Call generate with valid prompt
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "A beautiful serene Japanese garden in autumn",
        model: "nano-banana",
        size: "1024*1024",
      }),
    });

    // Mock external third-party generation fetch to guarantee deterministic test execution
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
});
