import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl } from "@/app/lib/tunnelDiscovery";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let backendUrl: string | null | undefined = searchParams.get("backend_url")?.trim().replace(/\/+$/, "");
    if (!backendUrl) {
      backendUrl = await getActiveTunnelUrl();
    }

    let gpuLoras: any[] = [];
    if (backendUrl) {
      try {
        const res = await fetch(`${backendUrl}/api/loras`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          gpuLoras = data.loras || [];
        }
      } catch (e) {
        console.warn("GPU /api/loras poll warning:", e);
      }
    }

    // Merge with local catalog from vault_loras.json
    const dataPath = path.join(process.cwd(), "app", "data", "vault_loras.json");
    let vaultLoras: any[] = [];
    if (fs.existsSync(dataPath)) {
      try {
        vaultLoras = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      } catch {}
    }

    const map = new Map<string, any>();
    // First insert vault loras
    for (const vl of vaultLoras) {
      map.set(vl.filename, {
        ...vl,
        storage: vl.storage || "Google Drive Vault",
      });
    }
    // Then override with active GPU state
    for (const gl of gpuLoras) {
      map.set(gl.filename, {
        ...map.get(gl.filename),
        ...gl,
      });
    }

    return NextResponse.json({
      status: "success",
      loras: Array.from(map.values()),
      backend_url: backendUrl || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list LoRAs." }, { status: 500 });
  }
}
