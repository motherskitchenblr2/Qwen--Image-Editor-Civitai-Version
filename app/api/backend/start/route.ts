import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getActiveTunnelUrl } from "../../../lib/tunnelDiscovery";

const KAGGLE_API_URL = "https://api.kaggle.com/v1/kernels.KernelsApiService/SaveKernel";
const STATUS_API_URL = "https://api.kaggle.com/v1/kernels.KernelsApiService/GetKernelSessionStatus";
const USERNAME = "developerchief";
const KERNEL_SLUG = "qwen-image-editor-civitai-version";
const KERNEL_TITLE = "Qwen -Image-Editor-Civitai-Version";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.KAGGLE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          status: "error",
          message: "KAGGLE_API_TOKEN environment variable not found on server.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const forceRestart = Boolean(body.force_restart);

    // Check if an existing GPU session is already running on Kaggle
    if (!forceRestart) {
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
          signal: AbortSignal.timeout(4000),
        });

        if (kRes.ok) {
          const kData = await kRes.json();
          const kStatus = kData.status;

          // If session is already RUNNING or QUEUED, prevent duplicate rolling jobs!
          if (kStatus === "RUNNING" || kStatus === "QUEUED") {
            const activeTunnel = await getActiveTunnelUrl();
            if (activeTunnel) {
              return NextResponse.json({
                status: "already_running",
                kernel_status: kStatus,
                tunnel_url: activeTunnel,
                message: "GPU instance is already running and connected!",
              });
            }

            return NextResponse.json({
              status: "already_running",
              kernel_status: kStatus,
              tunnel_url: null,
              message: `GPU session is already active on Kaggle (${kStatus}). Waiting for tunnel ingress...`,
            });
          }
        }
      } catch (err) {
        console.warn("Pre-launch Kaggle status check note:", err);
      }
    }

    // Read packaged notebook template
    const nbPath = path.join(process.cwd(), "app", "api", "backend", "start", "notebook.json");
    if (!fs.existsSync(nbPath)) {
      return NextResponse.json(
        { status: "error", message: "Kernel notebook template not found on server." },
        { status: 500 }
      );
    }

    const nbObj = JSON.parse(fs.readFileSync(nbPath, "utf-8"));
    // Ensure notebook cells never contain dynamically injected cleartext credentials
    nbObj.cells = nbObj.cells.filter(
      (cell: any) => cell.id !== "cell_gdrive_init" && !JSON.stringify(cell.source || "").includes("rclone.conf")
    );

    const payload = {
      slug: `${USERNAME}/${KERNEL_SLUG}`,
      newTitle: KERNEL_TITLE,
      text: JSON.stringify(nbObj, null, 2),
      language: "python",
      kernelType: "notebook",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true,
      sessionTimeoutSeconds: 7200,
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
      const data = await kaggleRes.json();
      return NextResponse.json({
        status: "starting",
        message: "Kaggle Dual Tesla T4 GPU backend boot sequence triggered successfully!",
        data,
      });
    } else {
      const errText = await kaggleRes.text();
      return NextResponse.json(
        {
          status: "failed",
          message: `Kaggle API rejected launch: ${errText}`,
        },
        { status: kaggleRes.status }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
