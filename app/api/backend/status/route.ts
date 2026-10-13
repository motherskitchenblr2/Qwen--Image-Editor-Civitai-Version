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

    const isAlive = Boolean(activeUrl);

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
      tunnel_url: activeUrl,
      kernel_status: kernelStatus,
      failure_message: failureMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { coordinated_state: "offline", is_alive: false, error: err.message },
      { status: 500 }
    );
  }
}
