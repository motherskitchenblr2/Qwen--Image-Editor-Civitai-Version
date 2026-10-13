import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl } from "../../../../lib/tunnelDiscovery";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    let backendUrl: string | null | undefined = searchParams.get("backend_url")?.trim().replace(/\/+$/, "");
    if (!backendUrl) {
      backendUrl = await getActiveTunnelUrl();
    }

    if (!backendUrl) {
      return NextResponse.json({ error: "GPU backend unavailable" }, { status: 503 });
    }

    const res = await fetch(`${backendUrl}/api/edit/status/${taskId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GPU status poll HTTP ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Status polling failed" }, { status: 500 });
  }
}
