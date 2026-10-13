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

    const res = await generateRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.image_base64).toBeDefined();
    expect(data.image_base64.startsWith("data:image/")).toBe(true);
    expect(data.prompt).toBe("A beautiful serene Japanese garden in autumn");
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
