import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Import route handlers directly to verify module resolution and TypeScript syntax
import * as backendStartRoute from "@/app/api/backend/start/route";
import * as backendStopRoute from "@/app/api/backend/stop/route";
import * as backendStatusRoute from "@/app/api/backend/status/route";
import * as civitaiRoute from "@/app/api/civitai/route";
import * as generateRoute from "@/app/api/generate/route";
import * as editRoute from "@/app/api/edit/route";
import * as sentinelEnhanceRoute from "@/app/api/sentinel/enhance/route";
import * as sentinelVaultRoute from "@/app/api/sentinel/vault/route";
import * as sentinelVerifyRoute from "@/app/api/sentinel/verify/route";
import * as tunnelRoute from "@/app/api/tunnel/route";
import * as vaultLorasRoute from "@/app/api/vault/loras/route";
import * as modelsLiveRoute from "@/app/api/models/live/route";
import * as sentinelNegativePromptRoute from "@/app/api/sentinel/negative-prompt/route";
import * as sentinelHealthRoute from "@/app/api/sentinel/health/route";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const ALLOWED_CONFIGS = new Set(["dynamic", "dynamicParams", "revalidate", "fetchCache", "runtime", "preferredRegion", "maxDuration"]);

describe("Next.js App Router API Handlers: Syntax & Export Contracts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Static Route Export Contract Audits", () => {
    const routeModules: Record<string, any> = {
      "app/api/backend/start/route.ts": backendStartRoute,
      "app/api/backend/stop/route.ts": backendStopRoute,
      "app/api/backend/status/route.ts": backendStatusRoute,
      "app/api/civitai/route.ts": civitaiRoute,
      "app/api/edit/route.ts": editRoute,
      "app/api/generate/route.ts": generateRoute,
      "app/api/models/live/route.ts": modelsLiveRoute,
      "app/api/sentinel/enhance/route.ts": sentinelEnhanceRoute,
      "app/api/sentinel/vault/route.ts": sentinelVaultRoute,
      "app/api/sentinel/verify/route.ts": sentinelVerifyRoute,
      "app/api/sentinel/negative-prompt/route.ts": sentinelNegativePromptRoute,
      "app/api/sentinel/health/route.ts": sentinelHealthRoute,
      "app/api/tunnel/route.ts": tunnelRoute,
      "app/api/vault/loras/route.ts": vaultLorasRoute,
    };

    it("verifies all core API route files exist on the filesystem", () => {
      for (const routeRelPath of Object.keys(routeModules)) {
        const fullPath = path.join(process.cwd(), routeRelPath);
        expect(fs.existsSync(fullPath), `Expected ${routeRelPath} to exist`).toBe(true);
      }
    });

    it("enforces valid Next.js App Router exports across all routes with zero illegal exports", () => {
      for (const [routeRelPath, mod] of Object.entries(routeModules)) {
        const exportKeys = Object.keys(mod);
        expect(exportKeys.length, `${routeRelPath} must export at least one member`).toBeGreaterThan(0);

        let hasHttpMethod = false;

        for (const key of exportKeys) {
          if (HTTP_METHODS.has(key)) {
            hasHttpMethod = true;
            expect(typeof mod[key], `${routeRelPath} export ${key} must be a function`).toBe("function");
          } else if (ALLOWED_CONFIGS.has(key)) {
            // Valid route segment configuration
            expect(mod[key]).toBeDefined();
          } else {
            throw new Error(`Invalid export '${key}' found in ${routeRelPath}. Next.js routes must only export HTTP methods or segment configs.`);
          }
        }

        expect(hasHttpMethod, `${routeRelPath} must export at least one HTTP method handler`).toBe(true);
      }
    });

    it("verifies exact expected HTTP method inventory per route", () => {
      expect(typeof backendStartRoute.POST).toBe("function");
      expect(typeof civitaiRoute.GET).toBe("function");
      expect(typeof editRoute.POST).toBe("function");
      expect(typeof generateRoute.POST).toBe("function");
      expect(typeof sentinelEnhanceRoute.POST).toBe("function");
      expect(typeof sentinelVaultRoute.GET).toBe("function");
      expect(typeof sentinelVaultRoute.POST).toBe("function");
      expect(typeof sentinelVaultRoute.DELETE).toBe("function");
      expect(typeof sentinelVerifyRoute.POST).toBe("function");
      expect(typeof sentinelNegativePromptRoute.POST).toBe("function");
      expect(typeof sentinelHealthRoute.GET).toBe("function");
      expect(typeof tunnelRoute.GET).toBe("function");
      expect(typeof tunnelRoute.POST).toBe("function");
      expect(typeof vaultLorasRoute.GET).toBe("function");
      expect(typeof vaultLorasRoute.POST).toBe("function");
      expect(typeof modelsLiveRoute.GET).toBe("function");
      expect(typeof modelsLiveRoute.POST).toBe("function");
    });
  });

  describe("Deterministic Offline Route Handler Contracts", () => {
    it("/api/generate POST returns 400 error when prompt is omitted", async () => {
      const req = new NextRequest("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await generateRoute.POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Prompt is required.");
    });

    it("/api/sentinel/enhance POST returns enhanced prompt via offline fallback or 400 on empty prompt", async () => {
      // 1. Missing prompt
      const emptyReq = new NextRequest("http://localhost:3000/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const emptyRes = await sentinelEnhanceRoute.POST(emptyReq);
      expect(emptyRes.status).toBe(400);
      const emptyJson = await emptyRes.json();
      expect(emptyJson.error).toBe("Prompt is required.");

      // 2. Offline rule-based fallback
      const validReq = new NextRequest("http://localhost:3000/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "cyberpunk cat" }),
      });
      const validRes = await sentinelEnhanceRoute.POST(validReq);
      expect(validRes.status).toBe(200);
      const validJson = await validRes.json();
      expect(validJson.enhancedPrompt).toContain("cyberpunk cat");

      // 3. Brainstorm mode handles short seeds and returns isBrainstormed flag
      const bsReq = new NextRequest("http://localhost:3000/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "supercar", mode: "brainstorm" }),
      });
      const bsRes = await sentinelEnhanceRoute.POST(bsReq);
      expect(bsRes.status).toBe(200);
      const bsJson = await bsRes.json();
      expect(bsJson.enhancedPrompt.toLowerCase()).toContain("supercar");
      expect(bsJson.isBrainstormed).toBe(true);
    });

    it("/api/sentinel/verify POST handles missing provider (400) and instant offline provider nanobanana (200)", async () => {
      // 1. Missing provider
      const missingReq = new NextRequest("http://localhost:3000/api/sentinel/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const missingRes = await sentinelVerifyRoute.POST(missingReq);
      expect(missingRes.status).toBe(400);
      const missingJson = await missingRes.json();
      expect(missingJson.success).toBe(false);

      // 2. Nano Banana offline verification
      const nbReq = new NextRequest("http://localhost:3000/api/sentinel/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "nanobanana" }),
      });
      const nbRes = await sentinelVerifyRoute.POST(nbReq);
      expect(nbRes.status).toBe(200);
      const nbJson = await nbRes.json();
      expect(nbJson.success).toBe(true);
      expect(nbJson.message).toContain("Nano Banana Turbo Engine");
    });

    it("/api/tunnel GET returns 200 with null URL when offline and POST validates incoming URL", async () => {
      // Mock global fetch to simulate offline Google Drive
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

      const getRes = await tunnelRoute.GET();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.url).toBeNull();
      expect(getJson.is_alive).toBe(false);

      // POST with invalid payload
      const invalidPost = new NextRequest("http://localhost:3000/api/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const postRes = await tunnelRoute.POST(invalidPost);
      expect(postRes.status).toBe(400);

      // POST with valid payload
      const validPost = new NextRequest("http://localhost:3000/api/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://my-test-tunnel.trycloudflare.com" }),
      });
      const regRes = await tunnelRoute.POST(validPost);
      expect(regRes.status).toBe(200);
      const regJson = await regRes.json();
      expect(regJson.status).toBe("registered");
      expect(regJson.url).toBe("https://my-test-tunnel.trycloudflare.com");
    });

    it("/api/vault/loras GET loads vault catalog and POST validates required filename", async () => {
      const getRes = await vaultLorasRoute.GET();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.source).toBe("google_drive_vault");
      expect(Array.isArray(getJson.loras)).toBe(true);

      const invalidPost = new NextRequest("http://localhost:3000/api/vault/loras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const postRes = await vaultLorasRoute.POST(invalidPost);
      expect(postRes.status).toBe(400);
      const postJson = await postRes.json();
      expect(postJson.error).toBe("Missing filename in payload");
    });

    it("/api/models/live GET returns live providers and enforces free-tier safeguard", async () => {
      const req = new NextRequest("http://localhost:3000/api/models/live?free_only=true");
      const res = await modelsLiveRoute.GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.safeguard_active).toBe(true);
      expect(Array.isArray(json.providers)).toBe(true);
      expect(json.providers.length).toBeGreaterThan(0);
      expect(Array.isArray(json.models)).toBe(true);
      expect(json.models.length).toBeGreaterThan(0);

      // Verify every model returned in safe mode is free or free-tier
      for (const model of json.models) {
        expect(model.isFree || model.isFreeTier).toBe(true);
      }
    });

    it("/api/sentinel/negative-prompt POST analyzes positive prompt and deduces tailored negative styles", async () => {
      const req = new NextRequest("http://localhost:3000/api/sentinel/negative-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hyper realistic 8k portrait of cybernetic warrior" }),
      });
      const res = await sentinelNegativePromptRoute.POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.negativePrompt).toBe("string");
      // Confirm the user-requested styles are negated: cartoon, anime, clay, silicon, plastic
      expect(json.negativePrompt).toContain("cartoon");
      expect(json.negativePrompt).toContain("anime");
      expect(json.negativePrompt).toContain("clay");
      expect(json.negativePrompt).toContain("silicon");
      expect(json.negativePrompt).toContain("plastic");
      expect(Array.isArray(json.detectedAesthetics)).toBe(true);
    });

    it("/api/sentinel/health GET returns real-time subsystem telemetry and exact fix guidance", async () => {
      const req = new NextRequest("http://localhost:3000/api/sentinel/health");
      const res = await sentinelHealthRoute.GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.healthScore).toBe("number");
      expect(typeof json.status).toBe("string");
      expect(Array.isArray(json.subsystems)).toBe(true);
      expect(json.subsystems.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(json.issues)).toBe(true);
      expect(typeof json.reportMarkdown).toBe("string");
    });
  });
});
