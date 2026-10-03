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
    const body = await req.json().catch(() => ({}));

    const gdriveToken = body.gdrive_token || process.env.GDRIVE_TOKEN_JSON;
    const gdriveCid = body.gdrive_client_id || process.env.GDRIVE_CLIENT_ID;
    const gdriveCsec = body.gdrive_client_secret || process.env.GDRIVE_CLIENT_SECRET;

    // If Google Drive token is available in runtime env or request, dynamically inject rclone setup cell in memory
    if (gdriveToken && typeof gdriveToken === "string") {
      const escapedToken = gdriveToken.trim();
      const escapedCid = (gdriveCid || "").trim();
      const escapedCsec = (gdriveCsec || "").trim();

      const configCell = {
        cell_type: "code",
        execution_count: null,
        id: "cell_gdrive_init",
        metadata: {},
        outputs: [],
        source: [
          "# Dynamic Google Drive Vault Provisioning\n",
          "import pathlib, os\n",
          "conf_dir = pathlib.Path('/root/.config/rclone')\n",
          "conf_dir.mkdir(parents=True, exist_ok=True)\n",
          `cfg = \"\"\"[gdrive]\\ntype = drive\\nscope = drive\\nclient_id = ${escapedCid}\\nclient_secret = ${escapedCsec}\\ntoken = ${escapedToken}\\n\"\"\"\n`,
          "(conf_dir / 'rclone.conf').write_text(cfg)\n",
          "os.chmod(conf_dir / 'rclone.conf', 0o600)\n",
          "print('✅ Dynamic rclone configuration provisioned successfully.')\n",
        ],
      };

      // Insert before server execution cell
      nbObj.cells.splice(2, 0, configCell);
    }

    const payload = {
      slug: KERNEL_SLUG,
      newTitle: KERNEL_TITLE,
      text: JSON.stringify(nbObj, null, 2),
      language: "python",
      kernelType: "notebook",
      isPrivate: false,
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
