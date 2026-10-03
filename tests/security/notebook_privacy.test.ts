import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { POST } from "@/app/api/backend/start/route";

describe("Security: Kaggle Notebook Privacy & Token Zero-Leak", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Static Source Code Privacy Audit", () => {
    it("strictly configures 'isPrivate: true' and eliminates 'isPrivate: false' from source", () => {
      const routeFilePath = path.join(process.cwd(), "app", "api", "backend", "start", "route.ts");
      const fileContent = fs.readFileSync(routeFilePath, "utf-8");

      // Verify that isPrivate: true is configured
      expect(fileContent).toMatch(/isPrivate:\s*true/);

      // Verify that isPrivate: false does NOT exist in the route handler
      expect(fileContent).not.toMatch(/isPrivate:\s*false/);
    });

    it("ensures backend/kernel-metadata.json defines is_private === true", () => {
      const metaPath = path.join(process.cwd(), "backend", "kernel-metadata.json");
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      expect(meta.is_private).toBe(true);
    });
  });

  describe("Runtime Kaggle Kernel Payload Privacy Contract", () => {
    it("submits SaveKernel payload to Kaggle API with isPrivate: true", async () => {
      process.env.KAGGLE_API_TOKEN = "test_kaggle_secret_token_abc123";

      let capturedUrl = "";
      let capturedInit: any = undefined;

      // Mock global fetch to capture Kaggle API request
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return new Response(JSON.stringify({ ref: "developerchief/qwen-image-editor-civitai-version", status: "queued" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const request = new NextRequest("http://localhost:3000/api/backend/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("starting");

      // Verify fetch was dispatched to Kaggle API
      expect(capturedUrl).toBe("https://api.kaggle.com/v1/kernels.KernelsApiService/SaveKernel");
      expect(capturedInit).toBeDefined();
      expect(capturedInit?.headers).toMatchObject({
        Authorization: "Bearer test_kaggle_secret_token_abc123",
      });

      // Parse payload sent to Kaggle
      const payload = JSON.parse(capturedInit?.body as string);
      expect(payload.isPrivate).toBe(true);
      expect(payload.kernelType).toBe("notebook");
      expect(payload.enableGpu).toBe(true);
    });

    it("ensures Google Drive OAuth tokens are never injected into notebook cells and server KAGGLE_API_TOKEN is never leaked into notebook text", async () => {
      const kaggleSecret = "super_secret_kaggle_api_token_99999";
      const gdriveSecretToken = "ya29.a0AfH6SMD_sensitive_oauth_bearer_secret";
      const gdriveCid = "my-gdrive-client-id.apps.googleusercontent.com";
      const gdriveCsec = "GOCSPX-secret_client_secret_xyz";

      process.env.KAGGLE_API_TOKEN = kaggleSecret;

      let capturedPayload: any = null;

      vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
        capturedPayload = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ status: "queued" }), { status: 200 });
      });

      const request = new NextRequest("http://localhost:3000/api/backend/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gdrive_token: gdriveSecretToken,
          gdrive_client_id: gdriveCid,
          gdrive_client_secret: gdriveCsec,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(capturedPayload).not.toBeNull();
      // Crucial security invariant: isPrivate must be strictly true
      expect(capturedPayload.isPrivate).toBe(true);

      // Verify server secrets are NEVER written to notebook cells
      expect(capturedPayload.text).not.toContain(kaggleSecret);
      expect(capturedPayload.text).not.toContain(gdriveSecretToken);
      expect(capturedPayload.text).not.toContain(gdriveCsec);

      // Verify dynamic rclone cleartext cells are NOT present in notebook
      const notebookObj = JSON.parse(capturedPayload.text);
      const hasInitCell = notebookObj.cells.some(
        (c: any) => c.id === "cell_gdrive_init" || JSON.stringify(c.source).includes(gdriveSecretToken)
      );
      expect(hasInitCell).toBe(false);
    });

    it("rejects request with 500 when KAGGLE_API_TOKEN is missing without making network calls", async () => {
      delete process.env.KAGGLE_API_TOKEN;

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const request = new NextRequest("http://localhost:3000/api/backend/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.status).toBe("error");
      expect(json.message).toContain("KAGGLE_API_TOKEN environment variable not found");

      // Verify zero network calls were attempted
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
