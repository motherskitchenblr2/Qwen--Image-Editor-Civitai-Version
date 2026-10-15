import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl, saveTunnelToEdgeConfig } from "../../lib/tunnelDiscovery";

export async function GET(req: NextRequest) {
  const candidate = req?.nextUrl?.searchParams?.get("candidate_url") || undefined;
  const activeUrl = await getActiveTunnelUrl(candidate);
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
  const body = await req.json().catch(() => ({}));
  if (body.url && typeof body.url === "string") {
    const cleanUrl = body.url.trim().replace(/\/+$/, "");
    
    // Await Edge Config persistence so it survives lambda freeze
    await saveTunnelToEdgeConfig(cleanUrl);

    return NextResponse.json({
      status: "registered",
      url: cleanUrl,
    });
  }
  return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
}
