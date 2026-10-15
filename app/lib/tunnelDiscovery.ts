// In-memory cache for the latest active tunnel URL
let cachedTunnelUrl: string | null = null;

const GDRIVE_DIRECT_URL = "https://drive.google.com/uc?export=download&id=1CsejFXhS81WTExe1EdQIuT0Glo0KDE4h";
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || "ecfg_jrfqmkp4it8vhueya5fazog2m9vk";
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
 * Persist tunnel URL to Vercel Edge Config across all serverless instances
 */
export async function saveTunnelToEdgeConfig(url: string | null): Promise<boolean> {
  const cleanUrl = url ? url.trim().replace(/\/+$/, "") : "";
  setMemoryCachedTunnel(cleanUrl || null);

  if (!VERCEL_TOKEN || !EDGE_CONFIG_ID) return false;

  try {
    const res = await fetch(edgeConfigUrl(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          { operation: "upsert", key: "tunnel_url", value: cleanUrl },
          { operation: "upsert", key: "last_updated", value: Date.now() },
        ],
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn("Failed to persist tunnel to Edge Config:", e);
    return false;
  }
}

/**
 * Retrieve and verify active tunnel URL across:
 * 0. Caller-provided candidate URL (from client localStorage / query)
 * 1. Fast in-memory cache
 * 2. Vercel Edge Config persistent store
 * 3. Google Drive direct vault file
 */
export async function getActiveTunnelUrl(candidateUrl?: string): Promise<string | null> {
  // 0. Prioritize candidate URL if supplied and verified live
  if (candidateUrl && typeof candidateUrl === "string") {
    const cleanCand = candidateUrl.trim().replace(/\/+$/, "");
    if (cleanCand.startsWith("http://") || cleanCand.startsWith("https://")) {
      try {
        const ping = await fetch(`${cleanCand}/api/health`, {
          signal: AbortSignal.timeout(3000),
        });
        if (ping.ok) {
          cachedTunnelUrl = cleanCand;
          // Sync to Edge Config in background
          saveTunnelToEdgeConfig(cleanCand).catch(() => {});
          return cleanCand;
        }
      } catch {}
    }
  }

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
        const tunnelItem = Array.isArray(items) ? items.find((i: any) => i.key === "tunnel_url") : null;
        if (tunnelItem?.value && typeof tunnelItem.value === "string") {
          const discoveredUrl = tunnelItem.value.trim().replace(/\/+$/, "");
          if (discoveredUrl.length > 5) {
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
            saveTunnelToEdgeConfig(discoveredUrl).catch(() => {});
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
