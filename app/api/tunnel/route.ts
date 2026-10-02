import { NextRequest, NextResponse } from "next/server";

// In-memory cache for the latest active tunnel URL
let cachedTunnelUrl: string | null = null;
let lastRegisteredAt: number = 0;

const GDRIVE_DIRECT_URL = "https://drive.google.com/uc?export=download&id=1CsejFXhS81WTExe1EdQIuT0Glo0KDE4h";

export async function GET() {
  // 1. If we have an in-memory registered URL, check if it is alive
  if (cachedTunnelUrl) {
    try {
      const ping = await fetch(`${cachedTunnelUrl}/api/health`, {
        signal: AbortSignal.timeout(2500),
      });
      if (ping.ok) {
        return NextResponse.json({
          url: cachedTunnelUrl,
          is_alive: true,
          source: "memory_registry",
        });
      }
    } catch {
      // Stale or dead, proceed to check Google Drive
      cachedTunnelUrl = null;
    }
  }

  // 2. Auto-fetch latest tunnel URL from Google Drive persistent vault
  try {
    const res = await fetch(GDRIVE_DIRECT_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const rawText = await res.text();
      const match = rawText.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        const discoveredUrl = match[0];
        try {
          const healthCheck = await fetch(`${discoveredUrl}/api/health`, {
            signal: AbortSignal.timeout(3000),
          });
          if (healthCheck.ok) {
            cachedTunnelUrl = discoveredUrl;
            return NextResponse.json({
              url: discoveredUrl,
              is_alive: true,
              source: "gdrive_vault",
            });
          }
        } catch {
          return NextResponse.json({
            url: null,
            is_alive: false,
            last_known: discoveredUrl,
          });
        }
      }
    }
  } catch (err: any) {
    console.error("Tunnel auto-discovery error:", err);
  }

  return NextResponse.json({ url: null, is_alive: false });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.url && typeof body.url === "string") {
      cachedTunnelUrl = body.url.trim().replace(/\/+$/, "");
      lastRegisteredAt = Date.now();
      return NextResponse.json({
        status: "registered",
        url: cachedTunnelUrl,
      });
    }
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
