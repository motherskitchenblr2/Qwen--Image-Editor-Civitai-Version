import { NextResponse } from "next/server";
import { getActiveTunnelUrl } from "../../../lib/tunnelDiscovery";

const STATUS_API_URL = "https://api.kaggle.com/v1/kernels.KernelsApiService/GetKernelSessionStatus";
const USERNAME = "developerchief";
const KERNEL_SLUG = "qwen-image-editor-civitai-version";

export async function GET() {
  try {
    const token = process.env.KAGGLE_API_TOKEN;
    const activeUrl = await getActiveTunnelUrl();

    let kernelStatus = "UNKNOWN";
    let failureMessage = "";

    if (token) {
      try {
        const kRes = await fetch(STATUS_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userName: USERNAME,
            kernelSlug: KERNEL_SLUG,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (kRes.ok) {
          const kData = await kRes.json();
          kernelStatus = kData.status || "UNKNOWN";
          failureMessage = kData.failureMessage || "";
        }
      } catch (ke) {
        console.warn("Kaggle session status poll note:", ke);
      }
    }

    let isAlive = Boolean(activeUrl);
    let modelReady = false;
    let modelMessage = "";
    let vramStats = null;

    if (isAlive && activeUrl) {
      try {
        const hRes = await fetch(`${activeUrl}/api/health`, {
          signal: AbortSignal.timeout(3000),
        });
        if (hRes.ok) {
          const hData = await hRes.json();
          modelReady = Boolean(hData.model_ready);
          modelMessage = hData.message || "";
          vramStats = hData.vram || null;
        } else {
          isAlive = false;
        }
      } catch (he) {
        console.warn("Backend status health ping note:", he);
        isAlive = false;
      }
    }

    // Derived coordinated lifecycle states:
    // "online" | "warming_up" | "queued" | "offline" | "error"
    let coordinatedState = "offline";
    if (isAlive) {
      coordinatedState = "online";
    } else if (kernelStatus === "RUNNING") {
      coordinatedState = "warming_up";
    } else if (kernelStatus === "QUEUED") {
      coordinatedState = "queued";
    } else if (kernelStatus === "ERROR") {
      coordinatedState = "error";
    } else {
      coordinatedState = "offline";
    }

    return NextResponse.json({
      coordinated_state: coordinatedState,
      is_alive: isAlive,
      tunnel_url: isAlive ? activeUrl : null,
      kernel_status: kernelStatus,
      failure_message: failureMessage,
      model_ready: modelReady,
      model_message: modelMessage,
      vram: vramStats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { coordinated_state: "offline", is_alive: false, error: err.message },
      { status: 500 }
    );
  }
}
