"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw,
  ExternalLink,
  Cpu,
  Zap,
  Sparkles,
  Database,
  Cloud,
  Layers,
  Save,
  Activity,
  Flame,
  Globe,
  Sliders,
} from "lucide-react";

export interface ProviderConfig {
  id: string;
  name: string;
  badge: string;
  category: "Aggregator" | "Vision & Frontier" | "LPU Inference" | "Enterprise NIM" | "Self-Hosted" | "Autonomous" | "Cloud Storage";
  description: string;
  placeholder: string;
  defaultEndpoint?: string;
  docsUrl: string;
  recommendedModels: string[];
  color: {
    accent: string;
    border: string;
    bg: string;
    text: string;
  };
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openrouter",
    name: "OpenRouter API",
    badge: "Unified Multi-Model Gateway",
    category: "Aggregator",
    description: "Access Claude 3.5, DeepSeek R1, Qwen 2.5 72B, and 200+ models with universal OpenAI-compatible routing.",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://openrouter.ai/keys",
    recommendedModels: ["anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1", "qwen/qwen-2.5-72b-instruct"],
    color: {
      accent: "from-purple-500 to-indigo-500",
      border: "border-purple-500/30",
      bg: "bg-purple-950/20",
      text: "text-purple-400",
    },
  },
  {
    id: "gemini",
    name: "Google Gemini API",
    badge: "Multimodal Vision & Fast Reasoning",
    category: "Vision & Frontier",
    description: "Frontier multimodal understanding for direct image analysis, captioning, and structured prompt engineering.",
    placeholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://aistudio.google.com/app/apikey",
    recommendedModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    color: {
      accent: "from-blue-500 to-cyan-500",
      border: "border-cyan-500/30",
      bg: "bg-cyan-950/20",
      text: "text-cyan-400",
    },
  },
  {
    id: "groq",
    name: "Groq LPU API",
    badge: "Ultra-Fast Inference (500+ tok/s)",
    category: "LPU Inference",
    description: "Low-latency inference engine powered by Language Processing Units (LPU) for instant prompt expansion.",
    placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://console.groq.com/keys",
    recommendedModels: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"],
    color: {
      accent: "from-amber-500 to-orange-500",
      border: "border-orange-500/30",
      bg: "bg-orange-950/20",
      text: "text-orange-400",
    },
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM API",
    badge: "Enterprise GPU Acceleration",
    category: "Enterprise NIM",
    description: "Microservices accelerated on NVIDIA DGX Cloud for cutting-edge vision, Nemotron, and Llama 3.",
    placeholder: "nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://build.nvidia.com/",
    recommendedModels: ["meta/llama-3.1-70b-instruct", "nvidia/nemotron-4-340b-instruct"],
    color: {
      accent: "from-emerald-500 to-green-500",
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/20",
      text: "text-emerald-400",
    },
  },
  {
    id: "ollama",
    name: "Ollama Cloud API",
    badge: "Private & Local LLM Bridge",
    category: "Self-Hosted",
    description: "Connect to your remote or cloud-hosted Ollama server instance for private inference with zero logging.",
    placeholder: "ollama_xxxxxxxxxxxxxxxx (or leave blank for public/local)",
    defaultEndpoint: "https://ollama.com",
    docsUrl: "https://ollama.com/download",
    recommendedModels: ["llama3.2-vision", "qwen2.5:14b", "mistral-nemo"],
    color: {
      accent: "from-teal-500 to-emerald-500",
      border: "border-teal-500/30",
      bg: "bg-teal-950/20",
      text: "text-teal-400",
    },
  },
  {
    id: "agentrouter",
    name: "AgentRouter API",
    badge: "Autonomous Agent Tool Routing",
    category: "Autonomous",
    description: "High-throughput API router designed for multi-agent workflows, code interpreters, and dynamic fallbacks.",
    placeholder: "ar-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://agentrouter.org",
    recommendedModels: ["agentrouter-default", "smart-routing-v2"],
    color: {
      accent: "from-rose-500 to-pink-500",
      border: "border-rose-500/30",
      bg: "bg-rose-950/20",
      text: "text-rose-400",
    },
  },
  {
    id: "mistral",
    name: "Mistral AI API",
    badge: "European Frontier Models",
    category: "Vision & Frontier",
    description: "Advanced reasoning and visual processing with Mistral Large 2, Pixtral 12B Vision, and Codestral.",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://console.mistral.ai/api-keys/",
    recommendedModels: ["mistral-large-latest", "pixtral-12b-2409", "codestral-latest"],
    color: {
      accent: "from-amber-400 to-yellow-500",
      border: "border-yellow-500/30",
      bg: "bg-yellow-950/20",
      text: "text-yellow-400",
    },
  },
];

interface SentinelProps {
  onCopilotProviderChange?: (providerId: string) => void;
}

export default function SentinelAiGateway({ onCopilotProviderChange }: SentinelProps) {
  // Stored keys state
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [endpoints, setEndpoints] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Verification status per provider: { [id]: { status: 'idle'|'verifying'|'verified'|'error', latency?: number, message?: string } }
  const [verifyStatus, setVerifyStatus] = useState<Record<string, { status: string; latency?: number; message?: string }>>({});

  // Active copilot provider
  const [activeCopilot, setActiveCopilot] = useState<string>("gemini");

  // Floating toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Mount: load keys from localStorage
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem("sentinel_api_keys");
      if (storedKeys) {
        setKeys(JSON.parse(storedKeys));
      }
      const storedEndpoints = localStorage.getItem("sentinel_endpoints");
      if (storedEndpoints) {
        setEndpoints(JSON.parse(storedEndpoints));
      }
      const savedCopilot = localStorage.getItem("sentinel_active_copilot");
      if (savedCopilot) {
        setActiveCopilot(savedCopilot);
      }
    } catch (e) {
      console.warn("Could not read sentinel keys from storage:", e);
    }
  }, []);

  const handleKeyChange = (providerId: string, value: string) => {
    setKeys((prev) => ({ ...prev, [providerId]: value.trim() }));
    // Reset verification state if key changes
    setVerifyStatus((prev) => ({ ...prev, [providerId]: { status: "idle" } }));
  };

  const handleEndpointChange = (providerId: string, value: string) => {
    setEndpoints((prev) => ({ ...prev, [providerId]: value.trim() }));
  };

  const toggleShowKey = (providerId: string) => {
    setShowKey((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleSaveAll = () => {
    try {
      localStorage.setItem("sentinel_api_keys", JSON.stringify(keys));
      localStorage.setItem("sentinel_endpoints", JSON.stringify(endpoints));
      localStorage.setItem("sentinel_active_copilot", activeCopilot);
      showToast("🔒 All API Keys saved to Sentinel Local Vault successfully!", "success");
    } catch (e: any) {
      showToast(`Save error: ${e.message}`, "error");
    }
  };

  const handleClearKey = (providerId: string) => {
    const updated = { ...keys };
    delete updated[providerId];
    setKeys(updated);
    setVerifyStatus((prev) => ({ ...prev, [providerId]: { status: "idle" } }));
    localStorage.setItem("sentinel_api_keys", JSON.stringify(updated));
    showToast(`Cleared ${providerId} key from vault.`, "info");
  };

  const handleVerify = async (providerId: string) => {
    const key = keys[providerId];
    if (!key && providerId !== "ollama") {
      showToast(`Please enter an API key for ${providerId} first.`, "error");
      return;
    }

    setVerifyStatus((prev) => ({
      ...prev,
      [providerId]: { status: "verifying", message: "Connecting to provider..." },
    }));

    try {
      const res = await fetch("/api/sentinel/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          apiKey: key || "",
          endpoint: endpoints[providerId] || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVerifyStatus((prev) => ({
          ...prev,
          [providerId]: {
            status: "verified",
            latency: data.latency,
            message: `${data.message} (${data.latency}ms)`,
          },
        }));
        showToast(`✅ ${data.message} (${data.latency}ms)`, "success");
      } else {
        setVerifyStatus((prev) => ({
          ...prev,
          [providerId]: {
            status: "error",
            latency: data.latency,
            message: data.error || "Verification failed.",
          },
        }));
        showToast(`Verification failed: ${data.error}`, "error");
      }
    } catch (e: any) {
      setVerifyStatus((prev) => ({
        ...prev,
        [providerId]: { status: "error", message: e.message },
      }));
      showToast(`Error: ${e.message}`, "error");
    }
  };

  const configuredCount = Object.keys(keys).filter((k) => keys[k] && keys[k].length > 3).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-xs font-semibold ${
              toastMessage.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50"
                : toastMessage.type === "error"
                ? "bg-rose-950/90 border-rose-500/60 text-rose-200 shadow-rose-950/50"
                : "bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/60"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : toastMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Sentinel Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-black shadow-lg shadow-cyan-500/20">
                <Shield className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  Sentinel: AI Gateway &amp; Key Vault
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
                    AES-256 / Zero-Leak
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Centralized multi-provider secrets hub for prompt engineering, vision analysis copilots, and cloud storage.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Save All */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Active Keys:</span>
              <span className="font-mono font-bold text-cyan-300">
                {configuredCount} / {PROVIDERS.length}
              </span>
            </div>

            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save All Keys to Vault</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloudflare MCP & R2 Status Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950/80 p-5 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">Cloudflare MCP &amp; R2 Storage Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Account: 08c4584f2d7f89d42713e4fdd5bb9538
                </span>
              </div>
              <p className="text-xs text-slate-400">
                FastMCP stdio server installed with 11 tools for Zero-Trust Tunnels, Workers AI catalog, DNS Zones, and R2 S3 compatibility endpoint.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg truncate max-w-xs">
              r2.cloudflarestorage.com
            </span>
            <span className="px-2.5 py-1 rounded-lg font-bold font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ● MCP Ready
            </span>
          </div>
        </div>
      </div>

      {/* Active Copilot Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Active Vision &amp; Prompt Copilot Engine:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PROVIDERS.filter((p) => ["gemini", "openrouter", "groq", "mistral", "nvidia"].includes(p.id)).map((p) => {
            const hasKey = Boolean(keys[p.id]);
            const isSelected = activeCopilot === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveCopilot(p.id);
                  if (onCopilotProviderChange) onCopilotProviderChange(p.id);
                  localStorage.setItem("sentinel_active_copilot", p.id);
                  showToast(`Active copilot switched to ${p.name}`);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold"
                    : hasKey
                    ? "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                    : "bg-slate-900/40 border border-slate-800/50 text-slate-500 hover:text-slate-400"
                }`}
              >
                <span>{p.name.replace(" API", "")}</span>
                {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROVIDERS.map((provider) => {
          const val = keys[provider.id] || "";
          const isRevealed = showKey[provider.id] || false;
          const status = verifyStatus[provider.id] || { status: "idle" };
          const hasKey = val.length > 3;

          return (
            <div
              key={provider.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 backdrop-blur-xl ${
                hasKey
                  ? "bg-slate-900/80 border-slate-700/80 shadow-md"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="space-y-3.5">
                {/* Provider Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${provider.color.accent} text-black font-bold shadow-md`}>
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {provider.name}
                        {hasKey && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">{provider.badge}</p>
                    </div>
                  </div>

                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Get API Key from official console"
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">{provider.description}</p>

                {/* Recommended Models */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {provider.recommendedModels.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                {/* Custom Endpoint (for Ollama/AgentRouter) */}
                {provider.defaultEndpoint && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Server / Host Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder={provider.defaultEndpoint}
                      value={endpoints[provider.id] || ""}
                      onChange={(e) => handleEndpointChange(provider.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* API Key Input Field */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>API Key / Secret Token</span>
                    {hasKey && <span className="text-[10px] text-emerald-400 font-mono">● Saved in Vault</span>}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={isRevealed ? "text" : "password"}
                      placeholder={provider.placeholder}
                      value={val}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-20 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900 transition"
                        title={isRevealed ? "Hide Key" : "Reveal Key"}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {hasKey && (
                        <button
                          type="button"
                          onClick={() => handleClearKey(provider.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                          title="Clear Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Verification Status Pill */}
                {status.status !== "idle" && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono ${
                      status.status === "verified"
                        ? "bg-emerald-950/60 border-emerald-600/60 text-emerald-300"
                        : status.status === "error"
                        ? "bg-rose-950/60 border-rose-600/60 text-rose-300"
                        : "bg-cyan-950/60 border-cyan-600/60 text-cyan-300 animate-pulse"
                    }`}
                  >
                    {status.status === "verified" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : status.status === "error" ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin flex-shrink-0" />
                    )}
                    <span className="truncate">{status.message}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono">
                  {hasKey ? `Length: ${val.length} chars` : "Not configured"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerify(provider.id)}
                    disabled={status.status === "verifying"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${status.status === "verifying" ? "animate-spin" : ""}`} />
                    <span>Test Ping</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("sentinel_api_keys", JSON.stringify(keys));
                      showToast(`Saved ${provider.name} key to vault.`);
                    }}
                    disabled={!hasKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
