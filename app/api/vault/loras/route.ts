import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "app", "data", "vault_loras.json");
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, "utf-8");
      const loras = JSON.parse(content);
      return NextResponse.json({
        source: "google_drive_vault",
        total: loras.length,
        loras,
      });
    }
    return NextResponse.json({ source: "google_drive_vault", total: 0, loras: [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load Google Drive Vault catalog", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataPath = path.join(process.cwd(), "app", "data", "vault_loras.json");
    let loras: any[] = [];
    if (fs.existsSync(dataPath)) {
      loras = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    }

    if (body.filename) {
      const existingIdx = loras.findIndex((l) => l.filename === body.filename);
      const newEntry = {
        name: body.name || body.filename.replace(/\.safetensors$/, ""),
        filename: body.filename,
        size_mb: body.size_mb || 0,
        is_active: !!body.is_active,
        scale: body.scale || 0.8,
        trigger_words: body.trigger_words || "",
        storage: "Google Drive Vault",
        gdrive_id: body.gdrive_id || "",
      };

      if (existingIdx >= 0) {
        loras[existingIdx] = { ...loras[existingIdx], ...newEntry };
      } else {
        loras.unshift(newEntry);
      }

      fs.writeFileSync(dataPath, JSON.stringify(loras, null, 2), "utf-8");
      return NextResponse.json({ success: true, lora: newEntry, total: loras.length });
    }

    return NextResponse.json({ error: "Missing filename in payload" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
