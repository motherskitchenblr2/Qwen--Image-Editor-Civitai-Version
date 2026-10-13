// In-memory cache for the latest active tunnel URL
let cachedTunnelUrl: string | null = null;

const GDRIVE_DIRECT_URL = "https://drive.google.com/uc?export=download&id=1CsejFXhS81WTExe1EdQIuT0Glo0KDE4h";
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";

export function edgeConfigUrl(): string {
  const query = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  return `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items${query}`;
}

export function setMemoryCachedTunnel(url: string | null) {
  cachedTunnelUrl = url ? url.trim().replace(/\/+$/, "") : null;
}

/**
 * Retrieve and verify active tunnel URL across:
 * 1. Fast in-memory cache
 * 2. Vercel Edge Config persistent store
 * 3. Google Drive direct vault file
 */
export async function getActiveTunnelUrl(): Promise<string | null> {
  // 1. If in-memory cache exists and is alive
  if (cachedTunnelUrl) {
    try {
      const ping = await fetch(`${cachedTunnelUrl}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (ping.ok) return cachedTunnelUrl;
    } catch {
      cachedTunnelUrl = null;
    }
  }

  // 2. Try Vercel Edge Config if environment variables are set
  if (VERCEL_TOKEN && EDGE_CONFIG_ID) {
    try {
      const ecRes = await fetch(edgeConfigUrl(), {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
        signal: AbortSignal.timeout(2500),
      });
      if (ecRes.ok) {
        const items = await ecRes.json();
        const tunnelItem = items.find((i: any) => i.key === "tunnel_url");
        if (tunnelItem?.value && typeof tunnelItem.value === "string") {
          const discoveredUrl = tunnelItem.value.trim().replace(/\/+$/, "");
          try {
            const healthCheck = await fetch(`${discoveredUrl}/api/health`, {
              signal: AbortSignal.timeout(2500),
            });
            if (healthCheck.ok) {
              cachedTunnelUrl = discoveredUrl;
              return discoveredUrl;
            }
          } catch {}
        }
      }
    } catch {}
  }

  // 3. Auto-fetch latest tunnel URL from Google Drive persistent vault
  try {
    const res = await fetch(GDRIVE_DIRECT_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const rawText = await res.text();
      const match = rawText.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        const discoveredUrl = match[0].trim().replace(/\/+$/, "");
        try {
          const healthCheck = await fetch(`${discoveredUrl}/api/health`, {
            signal: AbortSignal.timeout(2500),
          });
          if (healthCheck.ok) {
            cachedTunnelUrl = discoveredUrl;
            return discoveredUrl;
          }
        } catch {}
      }
    }
  } catch (err: any) {
    console.error("Tunnel auto-discovery error:", err);
  }

  return null;
}
