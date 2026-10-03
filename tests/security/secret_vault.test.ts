import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { GET, POST, DELETE } from "@/app/api/sentinel/vault/route";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";

describe("Security: Sentinel Secret Vault Zero-Leak & Masking Guarantee", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("GET /api/sentinel/vault - Key Masking & Zero Leakage", () => {
    it("returns strictly star-masked values ('********************') for all configured providers and never exposes raw secrets in response JSON", async () => {
      // Setup distinct secret tokens for multiple providers
      const secretsMap: Record<string, string> = {
        OPENROUTER_API_KEY: "sk-or-v1-abcdef0123456789-secret-token",
        GEMINI_API_KEY: "AIzaSySecretGeminiKey1234567890abcdef",
        GROQ_API_KEY: "gsk_secretGroqKey998877665544332211",
        NVIDIA_API_KEY: "nvapi-secretNvidiaKey554433221100",
        MISTRAL_API_KEY: "secretMistralApiKey667788990011",
        DASHSCOPE_API_KEY: "sk-dashscope-secret-token-11223344",
        CLOUDFLARE_API_TOKEN: "cf-token-secret-9988776655443322",
      };

      for (const [envKey, secretVal] of Object.entries(secretsMap)) {
        process.env[envKey] = secretVal;
      }

      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("success");
      expect(json.vault).toBeDefined();

      const rawSerialized = JSON.stringify(json);

      // Verify each configured provider
      for (const [providerId, envKey] of Object.entries(PROVIDER_ENV_MAP)) {
        if (secretsMap[envKey]) {
          const providerStatus = json.vault[providerId];
          expect(providerStatus).toBeDefined();
          expect(providerStatus.configured).toBe(true);
          expect(providerStatus.masked).toBe("********************");
          expect(providerStatus.envKey).toBe(envKey);

          // Zero-leak invariant: the raw secret string must NEVER appear anywhere in the response!
          expect(rawSerialized).not.toContain(secretsMap[envKey]);
        }
      }
    });

    it("correctly identifies unconfigured providers without emitting masking artifacts", async () => {
      // Clear all provider env keys
      for (const envKey of Object.values(PROVIDER_ENV_MAP)) {
        delete process.env[envKey];
      }

      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("success");

      for (const [providerId, _envKey] of Object.entries(PROVIDER_ENV_MAP)) {
        const providerStatus = json.vault[providerId];
        expect(providerStatus.configured).toBe(false);
        expect(providerStatus.masked).toBe("");
      }
    });
  });

  describe("POST /api/sentinel/vault - Secure Injection & Masked Acknowledgment", () => {
    it("vaults API key into server runtime process.env, returns star-masked acknowledgment, and never echoes raw key", async () => {
      const provider = "dashscope";
      const rawSecret = "sk-live-alicloud-dashscope-key-999888777";

      delete process.env.DASHSCOPE_API_KEY;

      const request = new NextRequest("http://localhost:3000/api/sentinel/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: rawSecret,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.provider).toBe("dashscope");
      expect(json.envKey).toBe("DASHSCOPE_API_KEY");
      expect(json.masked).toBe("********************");

      // Verify server runtime received the secret
      expect(process.env.DASHSCOPE_API_KEY).toBe(rawSecret);

      // Verify raw secret was NOT echoed back to client in the JSON response
      const rawSerialized = JSON.stringify(json);
      expect(rawSerialized).not.toContain(rawSecret);
    });

    it("rejects invalid or missing provider with 400 status", async () => {
      const request = new NextRequest("http://localhost:3000/api/sentinel/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "non_existent_provider_xyz",
          apiKey: "some_key",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toContain("Unknown provider");
    });

    it("rejects empty or whitespace-only apiKey with 400 status", async () => {
      const request = new NextRequest("http://localhost:3000/api/sentinel/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          apiKey: "   ",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toContain("Valid API Key string is required");
    });
  });

  describe("DELETE /api/sentinel/vault - Secret Removal", () => {
    it("deletes secret from server runtime environment upon request", async () => {
      process.env.GROQ_API_KEY = "gsk_to_be_deleted_secret";

      const request = new NextRequest("http://localhost:3000/api/sentinel/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "groq" }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Cleared GROQ_API_KEY");

      expect(process.env.GROQ_API_KEY).toBeUndefined();
    });
  });

  describe("Static Client Audit: Zero Secrets Persisted to localStorage & No Hardcoded IDs", () => {
    it("guarantees no client component in app/ writes API keys or secrets to localStorage", () => {
      const appDir = path.join(process.cwd(), "app");

      function findSourceFiles(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            if (file !== "api" && file !== "node_modules") {
              results = results.concat(findSourceFiles(filePath));
            }
          } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
            results.push(filePath);
          }
        }
        return results;
      }

      const clientFiles = findSourceFiles(appDir);
      expect(clientFiles.length).toBeGreaterThan(0);

      for (const filePath of clientFiles) {
        const content = fs.readFileSync(filePath, "utf-8");

        // Verify zero localStorage.setItem writing sentinel_api_keys
        expect(content).not.toMatch(/localStorage\.setItem\s*\(\s*["'`]sentinel_api_keys["'`]/);

        // Verify zero localStorage.setItem writing raw apiKey variable
        expect(content).not.toMatch(/localStorage\.setItem\s*\([^,]+,\s*(?:apiKey|rawKey|token|secret)\b/);
      }
    });

    it("guarantees zero reads from sentinel_api_keys in app/ directory", () => {
      const appDir = path.join(process.cwd(), "app");
      const violations: string[] = [];

      function scanDir(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) {
            scanDir(full);
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(full, "utf-8");
            if (content.includes("sentinel_api_keys")) {
              violations.push(full);
            }
          }
        }
      }

      scanDir(appDir);
      expect(violations).toEqual([]);
    });

    it("guarantees zero hardcoded Vercel or Cloudflare IDs in app/ directory", () => {
      const FORBIDDEN_IDS = [
        "prj_onSBHHpaYBeZVUJ6KAKhdRnqG6w5",
        "team_GJ823s9O5bAbHRCpuFt9mQmc",
        "08c4584f2d7f89d42713e4fdd5bb9538",
      ];

      const appDir = path.join(process.cwd(), "app");
      const violations: { file: string; id: string }[] = [];

      function scan(dir: string) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const full = path.join(dir, entry);
          if (fs.statSync(full).isDirectory()) {
            scan(full);
          } else if (/\.(ts|tsx)$/.test(entry)) {
            const content = fs.readFileSync(full, "utf-8");
            for (const id of FORBIDDEN_IDS) {
              if (content.includes(id)) {
                violations.push({ file: full, id });
              }
            }
          }
        }
      }

      scan(appDir);
      expect(violations).toEqual([]);
    });
  });
});
