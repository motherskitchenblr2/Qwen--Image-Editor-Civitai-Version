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

    const res = await fetch(`${targetBackend}/api/loras/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loras }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || `GPU Microservice HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fuse LoRAs." }, { status: 500 });
  }
}
