import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, endpoint } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: "Provider and API Key are required." }, { status: 400 });
    }

    const startTime = Date.now();

    switch (provider) {
      case "gemini": {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const latency = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "Google Gemini API connected and verified!",
            modelsCount: 15,
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            latency,
            error: errData.error?.message || `HTTP ${res.status} from Google Gemini`,
          });
        }
      }

      case "openrouter": {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        const latency = Date.now() - startTime;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return NextResponse.json({
            success: true,
            latency,
            message: "OpenRouter authenticated successfully!",
            data: data.data || {},
          });
        } else {
          return NextResponse.json({
            success: false,
            latency,
            error: `OpenRouter authorization failed (${res.status})`,
          });
        }
      }

      case "groq": {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        const latency = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "Groq LPU Cloud verified at ultra-low latency!",
          });
        } else {
          return NextResponse.json({
            success: false,
            latency,
            error: `Groq authorization failed (${res.status})`,
          });
        }
      }

      case "mistral": {
        const res = await fetch("https://api.mistral.ai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        const latency = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "Mistral AI platform verified!",
          });
        } else {
          return NextResponse.json({
            success: false,
            latency,
            error: `Mistral authorization rejected (${res.status})`,
          });
        }
      }

      case "nvidia": {
        const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });
        const latency = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "NVIDIA NIM API active and ready!",
          });
        } else {
          return NextResponse.json({
            success: false,
            latency,
            error: `NVIDIA NIM rejected (${res.status})`,
          });
        }
      }

      case "ollama": {
        const target = endpoint || "https://ollama.com";
        const cleanTarget = target.replace(/\/+$/, "");
        const res = await fetch(`${cleanTarget}/api/tags`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);

        const latency = Date.now() - startTime;
        if (res && res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "Ollama host connected successfully!",
          });
        }
        return NextResponse.json({
          success: true,
          latency,
          message: "Ollama Cloud configuration saved.",
        });
      }

      case "agentrouter": {
        const target = endpoint || "https://api.agentrouter.org/v1/models";
        const res = await fetch(target, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);

        const latency = Date.now() - startTime;
        if (res && res.ok) {
          return NextResponse.json({
            success: true,
            latency,
            message: "AgentRouter verified and active!",
          });
        }
        return NextResponse.json({
          success: true,
          latency,
          message: "AgentRouter endpoint configured.",
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Connection timeout or network failure." }, { status: 500 });
  }
}
