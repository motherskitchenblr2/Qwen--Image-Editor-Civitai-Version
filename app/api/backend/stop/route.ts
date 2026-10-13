import { NextRequest, NextResponse } from "next/server";
import { getActiveTunnelUrl, setMemoryCachedTunnel, edgeConfigUrl } from "../../../lib/tunnelDiscovery";

const KAGGLE_API_URL = "https://api.kaggle.com/v1/kernels.KernelsApiService/SaveKernel";
const KERNEL_SLUG = "developerchief/qwen-image-editor-civitai-version";
const KERNEL_TITLE = "Qwen -Image-Editor-Civitai-Version";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.KAGGLE_API_TOKEN;
    const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || "";
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";

    // 1. Tier 1: Send /api/shutdown to live tunnel if reachable (graceful teardown)
    const activeUrl = await getActiveTunnelUrl();
    if (activeUrl) {
      try {
        await fetch(`${activeUrl}/api/shutdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(3000),
        });
      } catch (e) {
        console.warn("Tunnel shutdown ping failed (continuing to Kaggle supersede kill):", e);
      }
    }

    // 2. Clear memory cache and Edge Config store
    setMemoryCachedTunnel(null);
    if (VERCEL_TOKEN && EDGE_CONFIG_ID) {
      fetch(edgeConfigUrl(), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            { operation: "upsert", key: "tunnel_url", value: "" },
            { operation: "upsert", key: "last_updated", value: Date.now() },
          ],
        }),
      }).catch((e) => console.warn("Edge config clear note:", e));
    }

    // 3. Tier 2: Guarantee Kaggle kernel halts and releases GPU quota
    // Pushes a minimal 0-GPU CPU notebook stub that runs sys.exit(0).
    // In Kaggle's orchestrator, pushing a new version immediately halts all previous
    // running versions of the kernel and cancels pending queues.
    let kaggleSuccess = false;
    let kaggleMessage = "";

    if (token) {
      const stopNb = {
        cells: [
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "# 🛑 EMERGENCY GPU SHUTDOWN STUB\n",
              "# Automatically supersedes and halts all active GPU workers to deallocate quota immediately.\n",
              "import sys\n",
              "print('✅ Kaggle GPU worker successfully halted and deallocated.')\n",
              "sys.exit(0)\n",
            ],
          },
        ],
        metadata: {
          kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
          language_info: { name: "python", version: "3.12" },
        },
        nbformat: 4,
        nbformat_minor: 4,
      };

      const payload = {
        slug: KERNEL_SLUG,
        newTitle: KERNEL_TITLE,
        text: JSON.stringify(stopNb, null, 2),
        language: "python",
        kernelType: "notebook",
        isPrivate: true,
        enableGpu: false, // ZERO GPU — releases Tesla T4s instantly!
        enableInternet: false,
        sessionTimeoutSeconds: 300,
      };

      const kaggleRes = await fetch(KAGGLE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (kaggleRes.ok) {
        kaggleSuccess = true;
        kaggleMessage = "Kaggle GPU instance deallocated and queue cleared.";
      } else {
        const err = await kaggleRes.text();
        kaggleMessage = `Kaggle API response: ${err}`;
      }
    } else {
      kaggleMessage = "KAGGLE_API_TOKEN not configured on server; tunnel cache cleared.";
    }

    return NextResponse.json({
      status: "stopped",
      message: kaggleSuccess
        ? "✅ Kaggle GPU backend stopped and deallocated! All rolling GPU queues cleared."
        : `Shutdown processed. ${kaggleMessage}`,
      tunnel_cleared: true,
      kaggle_superseded: kaggleSuccess,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message || "Failed to stop backend" },
      { status: 500 }
    );
  }
}
