import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl } from "@/app/lib/tunnelDiscovery";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loras, backend_url } = body;

    let targetBackend: string | null | undefined = backend_url?.trim().replace(/\/+$/, "");
    if (!targetBackend) {
      targetBackend = await getActiveTunnelUrl();
    }

    if (!targetBackend) {
      return NextResponse.json(
        { error: "Kaggle Dual Tesla T4 GPU backend is currently offline. Please wait for GPU initialization or verify tunnel link." },
        { status: 503 }
      );
    }

    // Normalize loras array or single lora object
    let lorasPayload: any[] = [];
    if (Array.isArray(loras)) {
      lorasPayload = loras.map((l: any) => ({
        name: l.name || `lora_${l.id || Date.now()}`,
        scale: typeof l.scale === "number" ? l.scale : (typeof l.weight === "number" ? l.weight : 0.8),
        weight: typeof l.weight === "number" ? l.weight : (typeof l.scale === "number" ? l.scale : 0.8),
        id: l.id,
        downloadUrl: l.downloadUrl || l.download_url,
        download_url: l.downloadUrl || l.download_url,
        googleDriveId: l.googleDriveId || l.google_drive_id || l.gdrive_id,
        google_drive_id: l.googleDriveId || l.google_drive_id || l.gdrive_id,
        filename: l.filename,
        trigger_words: l.trigger_words,
      }));
    } else if (body.name || body.id || body.downloadUrl || body.download_url || body.googleDriveId) {
      lorasPayload = [{
        name: body.name || `lora_${body.id || Date.now()}`,
        scale: typeof body.scale === "number" ? body.scale : (typeof body.weight === "number" ? body.weight : 0.8),
        weight: typeof body.weight === "number" ? body.weight : (typeof body.scale === "number" ? body.scale : 0.8),
        id: body.id,
        downloadUrl: body.downloadUrl || body.download_url,
        download_url: body.downloadUrl || body.download_url,
        googleDriveId: body.googleDriveId || body.google_drive_id || body.gdrive_id,
        google_drive_id: body.googleDriveId || body.google_drive_id || body.gdrive_id,
        filename: body.filename,
        trigger_words: body.trigger_words,
      }];
    }

    const res = await fetch(`${targetBackend}/api/loras/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loras: lorasPayload }),
      signal: AbortSignal.timeout(120000), // 2 minutes to allow on-demand downloads
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || `GPU Microservice HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fuse LoRAs." }, { status: 500 });
  }
}
