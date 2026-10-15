import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ENV_MAP } from "@/app/lib/sentinelConfig";
import { getConsolidatedLiveProviders } from "@/app/lib/aiModelRegistry";

export const dynamic = "force-dynamic";

export interface SubsystemHealth {
  id: string;
  name: string;
  status: "healthy" | "warning" | "offline" | "idle";
  latencyMs?: number;
  message: string;
  details?: Record<string, any>;
}

export interface HealthIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  fixGuidance: string;
  fixAction?: "START_GPU" | "OPEN_SENTINEL" | "SET_SAFE_MODE" | "REFRESH_TUNNEL";
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const subsystems: SubsystemHealth[] = [];
  const issues: HealthIssue[] = [];

  // 1. Audit Serverless AI Sentinel Vault
  let configuredVaultKeysCount = 0;
  const configuredProviders: string[] = [];
  for (const [providerId, envKey] of Object.entries(PROVIDER_ENV_MAP)) {
    if (process.env[envKey] && process.env[envKey]!.trim().length > 0) {
      configuredVaultKeysCount++;
      configuredProviders.push(providerId);
    }
  }

  if (configuredVaultKeysCount > 0) {
    subsystems.push({
      id: "sentinel_vault",
      name: "AI Keys Sentinel Vault",
      status: "healthy",
      message: `${configuredVaultKeysCount} providers configured in serverless environment (${configuredProviders.join(", ")})`,
      details: { configuredProviders, totalConfigured: configuredVaultKeysCount },
    });
  } else {
    subsystems.push({
      id: "sentinel_vault",
      name: "AI Keys Sentinel Vault",
      status: "warning",
      message: "No custom API keys vaulted. Running in Zero-Key Free Tier mode (Nano Banana / Pollinations active).",
    });
    issues.push({
      id: "no_custom_keys",
      severity: "info",
      title: "No Custom API Keys Vaulted",
      description: "Custom provider keys (Mistral, Gemini, Groq, OpenRouter) are not set. The studio is operating on 100% free keyless models.",
      fixGuidance: "Go to the 'Sentinel AI Gateway' tab, enter your free tier keys (e.g. Mistral, Gemini, Groq), and click 'Encrypt & Save'.",
      fixAction: "OPEN_SENTINEL",
    });
  }

  // 2. Audit Live AI Models & Free Tier Safeguard
  try {
    const liveCatalog = await getConsolidatedLiveProviders(false);
    subsystems.push({
      id: "live_models",
      name: "Live AI Model Registry",
      status: "healthy",
      message: `${liveCatalog.totalModels} models live (${liveCatalog.freeModelsCount} Free Tier models across ${liveCatalog.providers.length} platforms)`,
      details: {
        totalModels: liveCatalog.totalModels,
        freeModelsCount: liveCatalog.freeModelsCount,
        platformCount: liveCatalog.providers.length,
      },
    });
  } catch (err: any) {
    subsystems.push({
      id: "live_models",
      name: "Live AI Model Registry",
      status: "warning",
      message: `Model registry fallback active: ${err.message}`,
    });
  }

  // 3. Audit GPU Backend & Cloudflare Tunnel
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    subsystems.push({
      id: "gpu_backend",
      name: "Kaggle Dual Tesla T4 GPU",
      status: "idle",
      message: "GPU Backend is currently in standby (power off). Cloud AI models remain 100% operational.",
    });
    issues.push({
      id: "gpu_idle",
      severity: "info",
      title: "GPU Backend In Standby",
      description: "The dedicated Kaggle Dual Tesla T4 GPU is deallocated to preserve your 30 hrs/week free compute quota.",
      fixGuidance: "Click '[⚡ Turn On GPU]' in the top navigation bar or run 'start-gpu' in your terminal when you want to use local Qwen DiT + LoRA fusion.",
      fixAction: "START_GPU",
    });
  } else {
    // Probe backend URL ping
    try {
      const probeStart = Date.now();
      const res = await fetch(`${backendUrl}/health`, {
        signal: AbortSignal.timeout(3500),
      });
      const probeLatency = Date.now() - probeStart;

      if (res.ok) {
        subsystems.push({
          id: "gpu_backend",
          name: "Kaggle Dual Tesla T4 GPU",
          status: "healthy",
          latencyMs: probeLatency,
          message: `GPU cluster online via Cloudflare Tunnel (${probeLatency}ms)`,
        });
      } else {
        subsystems.push({
          id: "gpu_backend",
          name: "Kaggle Dual Tesla T4 GPU",
          status: "warning",
          latencyMs: probeLatency,
          message: `GPU tunnel reachable but returned HTTP ${res.status}`,
        });
        issues.push({
          id: "gpu_http_error",
          severity: "warning",
          title: "GPU Tunnel Responded with Error",
          description: `Backend tunnel returned status HTTP ${res.status}.`,
          fixGuidance: "The Kaggle kernel may still be initializing models. Wait ~30s or restart using '[🛑 Turn Off GPU]' then '[⚡ Turn On GPU]'.",
          fixAction: "REFRESH_TUNNEL",
        });
      }
    } catch (e: any) {
      subsystems.push({
        id: "gpu_backend",
        name: "Kaggle Dual Tesla T4 GPU",
        status: "offline",
        message: "GPU tunnel not responding (stale or stopped).",
      });
      issues.push({
        id: "gpu_offline",
        severity: "warning",
        title: "GPU Cloudflare Tunnel Offline",
        description: "The saved backend tunnel URL is unreachable.",
        fixGuidance: "Click '[⚡ Turn On GPU]' to auto-provision a fresh Kaggle Dual T4 session, or switch to Nano Banana Turbo for instant zero-key cloud generation.",
        fixAction: "START_GPU",
      });
    }
  }

  // Calculate overall Health Score
  let healthScore = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") healthScore -= 35;
    else if (issue.severity === "warning") healthScore -= 15;
    else if (issue.severity === "info") healthScore -= 5;
  }
  healthScore = Math.max(20, Math.min(100, healthScore));

  const overallStatus =
    healthScore >= 90 ? "OPTIMAL" : healthScore >= 70 ? "HEALTHY" : "ATTENTION_REQUIRED";

  // Build markdown export report
  const reportMarkdown = `# Studio Health & Diagnostic Report
Generated: ${new Date().toISOString()}
Overall Score: ${healthScore}/100 (${overallStatus})

## Subsystems Status
${subsystems.map((s) => `- **${s.name}**: ${s.status.toUpperCase()} ${s.latencyMs ? `(${s.latencyMs}ms)` : ""} — ${s.message}`).join("\n")}

## Identified Issues & Fix Guidance
${issues.length === 0 ? "No issues detected. All studio systems operational!" : issues.map((i, idx) => `### ${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}\n- **Details**: ${i.description}\n- **Exact Fix Guidance**: ${i.fixGuidance}`).join("\n\n")}
`;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    latencyTotalMs: Date.now() - startTime,
    healthScore,
    status: overallStatus,
    summary:
      overallStatus === "OPTIMAL"
        ? "All studio AI systems, serverless vault, and model registries are running in peak state."
        : overallStatus === "HEALTHY"
        ? "Studio is healthy with keyless free-tier models ready. GPU backend is in quota-saving standby."
        : "Some subsystems require attention. Check fix guidance below.",
    subsystems,
    issues,
    reportMarkdown,
  });
}
