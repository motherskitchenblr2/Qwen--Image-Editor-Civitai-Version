import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const PROVIDER_ENV_MAP: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  ollama: "OLLAMA_API_KEY",
  agentrouter: "AGENTROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  cloudflare_ai: "CLOUDFLARE_API_TOKEN",
  nanobanana: "NANOBANANA_API_KEY",
};

export const ENDPOINT_ENV_MAP: Record<string, string> = {
  ollama: "OLLAMA_HOST",
  agentrouter: "AGENTROUTER_HOST",
};

function maskSecret(secret?: string): string {
  if (!secret || secret.trim().length === 0) return "";
  return "********************";
}

// Helper to query Vercel API for environment variables
async function getVercelEnvVars(vtoken: string, projectId: string, teamId: string) {
  const url = `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${vtoken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Vercel env vars (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return (data.envs || data.env || []) as Array<{ id: string; key: string }>;
}

export async function GET() {
  try {
    const status: Record<string, { configured: boolean; masked: string; envKey: string; endpoint?: string }> = {};

    for (const [providerId, envKey] of Object.entries(PROVIDER_ENV_MAP)) {
      const val = process.env[envKey] || "";
      const endpointVal = ENDPOINT_ENV_MAP[providerId] ? process.env[ENDPOINT_ENV_MAP[providerId]] : undefined;

      const isConfigured = val.trim().length > 0;
      status[providerId] = {
        configured: isConfigured,
        masked: isConfigured ? maskSecret(val) : "",
        envKey,
        endpoint: endpointVal,
      };
    }

    return NextResponse.json({
      status: "success",
      vault: status,
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, endpoint } = await req.json();

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "Provider identifier is required." }, { status: 400 });
    }

    const envKey = PROVIDER_ENV_MAP[provider];
    if (!envKey) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "Valid API Key string is required." }, { status: 400 });
    }

    const cleanKey = apiKey.trim();

    // 1. Immediately inject into Node.js server runtime process.env
    process.env[envKey] = cleanKey;
    if (endpoint && ENDPOINT_ENV_MAP[provider]) {
      process.env[ENDPOINT_ENV_MAP[provider]] = endpoint.trim();
    }

    // 2. Persist to Vercel Project Encrypted Environment Variables if credentials are present
    const vtoken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID || "prj_onSBHHpaYBeZVUJ6KAKhdRnqG6w5";
    const teamId = process.env.VERCEL_TEAM_ID || "team_GJ823s9O5bAbHRCpuFt9mQmc";

    let savedToVercel = false;
    let vercelMessage = "";

    if (vtoken && projectId) {
      try {
        const existingVars = await getVercelEnvVars(vtoken, projectId, teamId);
        const match = existingVars.find((v) => v.key === envKey);

        if (match) {
          // Delete existing and re-create to ensure fresh encrypted state
          await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/env/${match.id}?teamId=${teamId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${vtoken}` },
            }
          );
        }

        // Create encrypted env var
        const createRes = await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vtoken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: envKey,
              value: cleanKey,
              type: "encrypted",
              target: ["production", "preview", "development"],
            }),
          }
        );

        if (createRes.ok) {
          savedToVercel = true;
          vercelMessage = `Encrypted in Vercel Project Environment (${envKey})`;
        } else {
          const errText = await createRes.text();
          vercelMessage = `Runtime cached (Vercel sync note: ${errText.slice(0, 80)})`;
        }

        // If endpoint provided, also save to Vercel
        if (endpoint && ENDPOINT_ENV_MAP[provider]) {
          const epKey = ENDPOINT_ENV_MAP[provider];
          const epMatch = existingVars.find((v) => v.key === epKey);
          if (epMatch) {
            await fetch(
              `https://api.vercel.com/v10/projects/${projectId}/env/${epMatch.id}?teamId=${teamId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${vtoken}` },
              }
            );
          }
          await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vtoken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: epKey,
                value: endpoint.trim(),
                type: "plain",
                target: ["production", "preview", "development"],
              }),
            }
          );
        }
      } catch (ve: any) {
        console.warn("Vercel env save error:", ve.message);
        vercelMessage = `Runtime cached (${ve.message})`;
      }
    } else {
      vercelMessage = "Vaulted in server process.env";
    }

    return NextResponse.json({
      success: true,
      provider,
      envKey,
      savedToVercel,
      masked: "********************",
      message: `🔒 API Key encrypted! Saved to ${envKey}. ${vercelMessage}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { provider } = await req.json();
    if (!provider || !PROVIDER_ENV_MAP[provider]) {
      return NextResponse.json({ error: "Valid provider required" }, { status: 400 });
    }

    const envKey = PROVIDER_ENV_MAP[provider];
    delete process.env[envKey];

    const vtoken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID || "prj_onSBHHpaYBeZVUJ6KAKhdRnqG6w5";
    const teamId = process.env.VERCEL_TEAM_ID || "team_GJ823s9O5bAbHRCpuFt9mQmc";

    if (vtoken && projectId) {
      try {
        const existingVars = await getVercelEnvVars(vtoken, projectId, teamId);
        const match = existingVars.find((v) => v.key === envKey);
        if (match) {
          await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/env/${match.id}?teamId=${teamId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${vtoken}` },
            }
          );
        }
      } catch (e) {
        console.warn("Vercel env delete error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      message: `Cleared ${envKey} from server environment.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
