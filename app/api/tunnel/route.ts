import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl, setMemoryCachedTunnel, edgeConfigUrl } from "../../lib/tunnelDiscovery";

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";

export async function GET() {
  const activeUrl = await getActiveTunnelUrl();
  if (activeUrl) {
    return NextResponse.json({
      url: activeUrl,
      is_alive: true,
      source: "verified_registry",
    });
  }

  return NextResponse.json({ url: null, is_alive: false });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.url && typeof body.url === "string") {
    const cleanUrl = body.url.trim().replace(/\/+$/, "");
    setMemoryCachedTunnel(cleanUrl);

    // Persist to Vercel Edge Config in background if configured
    if (VERCEL_TOKEN && EDGE_CONFIG_ID) {
      fetch(edgeConfigUrl(), {
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
        }
      ).catch((e) => console.warn("Edge config save note:", e));
    }

    return NextResponse.json({
      status: "registered",
      url: cleanUrl,
    });
  }
  return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
}
