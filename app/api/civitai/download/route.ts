import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl } from "@/app/lib/tunnelDiscovery";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, name, trigger_words, backend_url } = body;

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "Download URL is required." }, { status: 400 });
    }

    const cleanName = (name || `lora_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = cleanName.endsWith(".safetensors") ? cleanName : `${cleanName}.safetensors`;

    // Attempt to dispatch download to Kaggle GPU backend
    let targetBackend: string | null | undefined = backend_url?.trim().replace(/\/+$/, "");
    if (!targetBackend) {
      targetBackend = await getActiveTunnelUrl();
    }

    let downloadedOnGpu = false;
    let gpuMessage = "";

    if (targetBackend) {
      try {
        const gpuRes = await fetch(`${targetBackend}/api/loras/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            name: cleanName,
            trigger_words: trigger_words || "",
          }),
          signal: AbortSignal.timeout(60000), // 60s timeout for download initiation
        });

        if (gpuRes.ok) {
          const gpuData = await gpuRes.json();
          downloadedOnGpu = true;
          gpuMessage = gpuData.storage || "5 TB Google Drive Vault";
        } else {
          const errData = await gpuRes.json().catch(() => ({}));
          console.warn("GPU LoRA download non-ok status:", errData);
        }
      } catch (gpuErr: any) {
        console.warn("GPU LoRA download fetch error:", gpuErr.message);
      }
    }

    // Persist to local vault_loras.json catalog so it appears in the Vault list immediately
    try {
      const dataPath = path.join(process.cwd(), "app", "data", "vault_loras.json");
      let loras: any[] = [];
      if (fs.existsSync(dataPath)) {
        loras = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      }

      const existingIdx = loras.findIndex((l) => l.filename === filename || l.name === cleanName);
      const newEntry = {
        name: cleanName,
        filename: filename,
        size_mb: body.size_mb || 0,
        is_active: false,
        scale: 0.8,
        trigger_words: trigger_words || "",
        storage: downloadedOnGpu ? "5 TB Google Drive Vault" : "5 TB Google Drive Vault (Queued for GPU sync)",
        download_url: url,
        created_at: Date.now(),
      };

      if (existingIdx >= 0) {
        loras[existingIdx] = { ...loras[existingIdx], ...newEntry };
      } else {
        loras.unshift(newEntry);
      }

      fs.writeFileSync(dataPath, JSON.stringify(loras, null, 2), "utf-8");
    } catch (fsErr: any) {
      console.warn("Could not write to vault_loras.json:", fsErr.message);
    }

    return NextResponse.json({
      status: "success",
      name: cleanName,
      filename: filename,
      downloaded_on_gpu: downloadedOnGpu,
      storage: downloadedOnGpu ? "5 TB Google Drive Vault" : "5 TB Google Drive Vault (Queued)",
      message: downloadedOnGpu
        ? `LoRA "${cleanName}" downloaded directly to 5 TB Google Drive Vault & GPU cache!`
        : `LoRA "${cleanName}" registered in 5 TB Google Drive Vault catalog. It will sync automatically when GPU is online.`,
    });
  } catch (err: any) {
    console.error("Civitai download proxy error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process Civitai LoRA download." },
      { status: 500 }
    );
  }
}
