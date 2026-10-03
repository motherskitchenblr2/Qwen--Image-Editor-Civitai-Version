import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KAGGLE_API_URL = "https://api.kaggle.com/v1/kernels.KernelsApiService/SaveKernel";
const KERNEL_SLUG = "developerchief/qwen-image-editor-civitai-version";
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
    // Filter out any legacy or rogue credential provisioning cells from template
    nbObj.cells = nbObj.cells.filter(
      (cell: any) => cell.id !== "cell_gdrive_init" && !JSON.stringify(cell.source || "").includes("rclone.conf")
    );

    const payload = {
      slug: KERNEL_SLUG,
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
