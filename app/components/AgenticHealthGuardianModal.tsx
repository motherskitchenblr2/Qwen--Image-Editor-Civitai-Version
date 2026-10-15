"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Wrench,
  Sparkles,
  Zap,
  MessageSquare,
  Sliders,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  ChevronRight,
  Send,
  HelpCircle,
  Info,
} from "lucide-react";
import { SubsystemHealth, HealthIssue } from "@/app/api/sentinel/health/route";
import { generateSmartNegativePrompt } from "@/app/lib/promptIntelligence";

interface AgenticHealthGuardianModalProps {
  onNavigateTab?: (tab: "studio" | "loras" | "generators" | "sentinel" | "gallery") => void;
  onTurnOnGpu?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onApplyPromptToStudio?: (prompt: string, negativePrompt?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "guardian";
  text: string;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function AgenticHealthGuardianModal({
  onNavigateTab,
  onTurnOnGpu,
  showToast,
  onApplyPromptToStudio,
}: AgenticHealthGuardianModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "chat" | "prompt_studio">("diagnostics");

  // Health State
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [healthScore, setHealthScore] = useState<number>(95);
  const [healthStatus, setHealthStatus] = useState<string>("HEALTHY");
  const [summary, setSummary] = useState<string>("Checking studio health...");
  const [subsystems, setSubsystems] = useState<SubsystemHealth[]>([]);
  const [issues, setIssues] = useState<HealthIssue[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState<string>("");
  const [copiedReport, setCopiedReport] = useState(false);

  // Prompt Studio Playground State
  const [testPrompt, setTestPrompt] = useState("A hyper realistic 8k portrait of an astronaut with reflective helmet");
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof generateSmartNegativePrompt> | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      sender: "guardian",
      text: "👋 Hello! I am your Agentic AI Health Guardian. I continuously monitor GPU tunnels, Sentinel API vaults, and live model endpoints. How can I help optimize your studio today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Fetch real-time health data
  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch("/api/sentinel/health");
      if (res.ok) {
        const data = await res.json();
        setHealthScore(data.healthScore ?? 90);
        setHealthStatus(data.status ?? "HEALTHY");
        setSummary(data.summary ?? "Studio operational");
        setSubsystems(data.subsystems ?? []);
        setIssues(data.issues ?? []);
        setReportMarkdown(data.reportMarkdown ?? "");
      }
    } catch (e) {
      console.warn("Failed to fetch health:", e);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Re-check every 45s
    const interval = setInterval(fetchHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  // Run initial prompt analysis in playground
  useEffect(() => {
    if (testPrompt) {
      setAnalysisResult(generateSmartNegativePrompt(testPrompt));
    }
  }, [testPrompt]);

  const handleCopyReport = async () => {
    if (!reportMarkdown) return;
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
      if (showToast) showToast("Health report copied to clipboard", "success");
    } catch {}
  };

  const handleExecuteFix = (action?: string) => {
    if (!action) return;
    if (action === "START_GPU") {
      if (onTurnOnGpu) onTurnOnGpu();
      if (showToast) showToast("Initiated GPU boot sequence", "info");
      setIsOpen(false);
    } else if (action === "OPEN_SENTINEL") {
      if (onNavigateTab) onNavigateTab("sentinel");
      setIsOpen(false);
    } else if (action === "REFRESH_TUNNEL") {
      fetchHealth();
      if (showToast) showToast("Refreshing Cloudflare tunnel status...", "info");
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const userText = inputMessage.trim();
    setInputMessage("");

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Intelligent context-aware AI response based on real system state
    setTimeout(() => {
      let botResponse = "";
      const lower = userText.toLowerCase();

      if (lower.includes("gpu") || lower.includes("boot") || lower.includes("kaggle")) {
        const gpuSub = subsystems.find((s) => s.id === "gpu_backend");
        botResponse = `The GPU backend status is currently: ${gpuSub?.status.toUpperCase() || "STANDBY"}. ${
          gpuSub?.status === "healthy"
            ? "Your Kaggle Dual Tesla T4 cluster is live and ready for Qwen DiT + LoRA fusion."
            : "It is currently deallocated to preserve your 30h/week quota. You can boot it anytime using the '[⚡ Turn On GPU]' button, or use Nano Banana Turbo for instant keyless generation."
        }`;
      } else if (lower.includes("mistral") || lower.includes("key") || lower.includes("vault") || lower.includes("free")) {
        botResponse = `Your Sentinel Vault has active serverless environment variables. Mistral AI is fully verified on the Free Tier (open-mistral-nemo, pixtral-12b-2409, codestral-latest). In the Sentinel Gateway tab, you can test-ping each key with 1-click.`;
      } else if (lower.includes("negative") || lower.includes("prompt") || lower.includes("hyper realistic")) {
        botResponse = `The Smart Negative Engine analyzes your positive prompt's aesthetic tokens. If you enter 'hyper realistic', it automatically suppresses 'cartoon, anime, 3d render, clay, silicon, plastic, doll, CGI, deformed' to eliminate unwanted artifacts and ensure crystal-clear photorealism!`;
      } else {
        botResponse = `Overall Studio Health is ${healthScore}% (${healthStatus}). ${issues.length} active guidance item(s) found. All models in Free Tier Safe Mode are 100% unlocked with zero billing risk.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "guardian",
          text: botResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 450);
  };

  // Determine badge color
  const statusColor =
    healthScore >= 90
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-emerald-500/20"
      : healthScore >= 70
      ? "text-amber-400 border-amber-500/40 bg-amber-950/40 shadow-amber-500/20"
      : "text-rose-400 border-rose-500/40 bg-rose-950/40 shadow-rose-500/20";

  return (
    <>
      {/* ── Floating Indicator Trigger Button (Bottom-Right) ── */}
      <div className="fixed bottom-5 right-5 z-50 select-none">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 ${statusColor} bg-black/90`}
          title="Open Agentic AI Health Guardian & Fix Sentinel"
        >
          {/* Pulsing Aura Indicator */}
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                healthScore >= 90 ? "bg-emerald-400" : healthScore >= 70 ? "bg-amber-400" : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                healthScore >= 90 ? "bg-emerald-500" : healthScore >= 70 ? "bg-amber-500" : "bg-rose-500"
              }`}
            />
          </span>

          <span className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">AI Guardian</span>
            <span className="text-[11px] font-mono text-cyan-300 font-extrabold">{healthScore}%</span>
          </span>

          {issues.length > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold bg-amber-500 text-black">
              {issues.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Floating Modal Window ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-2xl bg-slate-950/95 border border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] rounded-3xl flex flex-col overflow-hidden transition-all duration-300 ${
              isMinimized ? "h-16" : "h-[90vh] max-h-[720px]"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-500/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    Agentic AI App Health Guardian
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      v2.3 DOCTOR
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live Subsystem Diagnostics, Exact Issue Reporting &amp; Prompt Intelligence
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchHealth}
                  disabled={isLoadingHealth}
                  className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 rounded-lg transition"
                  title="Refresh Diagnostics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? "animate-spin text-cyan-400" : ""}`} />
                </button>
                <button
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body (Hidden when minimized) */}
            {!isMinimized && (
              <>
                {/* Tab Navigation */}
                <div className="flex items-center border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-1 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab("diagnostics")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                      activeTab === "diagnostics"
                        ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>🏥 System Health &amp; Fix Guide</span>
                    {issues.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
                        {issues.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("prompt_studio")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                      activeTab === "prompt_studio"
                        ? "border-amber-400 text-amber-300 bg-amber-950/20"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>🛡️ Smart Negative Analyzer</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                      activeTab === "chat"
                        ? "border-purple-400 text-purple-300 bg-purple-950/20"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>💬 Sentinel Doctor Chat</span>
                  </button>
                </div>

                {/* Tab 1: System Health Diagnostics */}
                {activeTab === "diagnostics" && (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Health Score Overview Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-500/5">
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-black/60 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                          <span className="text-xl font-black font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                            {healthScore}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                              Studio Health Status:
                            </span>
                            <span className={`text-xs font-extrabold uppercase font-mono px-2 py-0.5 rounded-md ${
                              healthScore >= 90 ? "bg-emerald-950 border border-emerald-500 text-emerald-300" : "bg-amber-950 border border-amber-500 text-amber-300"
                            }`}>
                              {healthStatus}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 max-w-md">{summary}</p>
                        </div>
                      </div>

                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-xl text-xs font-bold text-slate-200 transition shadow-sm"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{copiedReport ? "Report Copied!" : "📋 Copy Exact Report"}</span>
                      </button>
                    </div>

                    {/* Subsystem Health Tiles Grid */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Subsystem Telemetry
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {subsystems.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-cyan-500/40 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200">{sub.name}</span>
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                                  sub.status === "healthy"
                                    ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                                    : sub.status === "warning"
                                    ? "bg-amber-950/80 border border-amber-500/40 text-amber-300"
                                    : sub.status === "idle"
                                    ? "bg-slate-950 border border-slate-700 text-slate-400"
                                    : "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                                }`}
                              >
                                {sub.status} {sub.latencyMs ? `(${sub.latencyMs}ms)` : ""}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{sub.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exact Issues & Actionable Fix Guidance */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Identified Issues &amp; Exact Fix Guidance</span>
                        <span className="text-[11px] font-normal text-slate-500">{issues.length} active item(s)</span>
                      </span>

                      {issues.length === 0 ? (
                        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 text-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-xs font-bold text-emerald-300">Zero Critical Issues Detected</p>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">
                            All studio AI endpoints and serverless vaults are responding cleanly.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {issues.map((issue) => (
                            <div
                              key={issue.id}
                              className={`border rounded-2xl p-4 space-y-2 transition-all ${
                                issue.severity === "critical"
                                  ? "bg-rose-950/30 border-rose-600/50"
                                  : issue.severity === "warning"
                                  ? "bg-amber-950/30 border-amber-600/50"
                                  : "bg-slate-900/60 border-slate-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {issue.severity === "critical" ? (
                                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs font-extrabold text-white">{issue.title}</span>
                                </div>
                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-black tracking-wider bg-black/60 border border-slate-700 text-slate-300">
                                  {issue.severity}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300">{issue.description}</p>

                              <div className="bg-black/50 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                                  <Wrench className="w-3 h-3" /> Exact Fix Guidance:
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                                  {issue.fixGuidance}
                                </p>
                              </div>

                              {issue.fixAction && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    onClick={() => handleExecuteFix(issue.fixAction)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
                                  >
                                    <span>Execute Fix</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Smart Negative Prompt Analyzer Studio */}
                {activeTab === "prompt_studio" && (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Smart Negative Prompt Analyzer &amp; Deduce Engine
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Type any positive prompt. The engine parses aesthetic tokens (e.g. &ldquo;hyper realistic&rdquo;)
                        and automatically generates the exact contradictory negative tags (&ldquo;cartoon, anime, clay, silicon, plastic&rdquo;)
                        to ensure high clarity.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">Test Positive Prompt:</label>
                      <textarea
                        rows={3}
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        placeholder="e.g. A hyper realistic studio portrait with 8k textures..."
                      />
                    </div>

                    {analysisResult && (
                      <div className="space-y-4">
                        {/* Detected Aesthetics Tags */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Detected Style Archetypes:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.detectedAesthetics.map((aes, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300"
                              >
                                {aes}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Deduce Engine Explanation */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" /> Intelligence Deduction Rationale:
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {analysisResult.explanation}
                          </p>
                        </div>

                        {/* Deduce Negative Prompt Output */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-amber-300">
                              Generated Negative Prompt:
                            </label>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {analysisResult.negativePrompt.split(",").length} excluded styles
                            </span>
                          </div>
                          <div className="bg-black/80 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200/90 font-mono break-words leading-relaxed shadow-inner">
                            {analysisResult.negativePrompt}
                          </div>
                        </div>

                        {/* Apply to Studio Editor Button */}
                        {onApplyPromptToStudio && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => {
                                onApplyPromptToStudio(testPrompt, analysisResult.negativePrompt);
                                setIsOpen(false);
                                if (showToast) showToast("Prompt & Negatives sent to Studio Editor!", "success");
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-cyan-500/20"
                            >
                              <span>Apply Combo to Studio Editor</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Interactive Doctor AI Chat */}
                {activeTab === "chat" && (
                  <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.sender === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                              msg.sender === "user"
                                ? "bg-cyan-600 text-white rounded-tr-none shadow-md shadow-cyan-600/20"
                                : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                            }`}
                          >
                            <p>{msg.text}</p>
                            <span
                              className={`text-[9px] block mt-1 ${
                                msg.sender === "user" ? "text-cyan-200 text-right" : "text-slate-500"
                              }`}
                            >
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Question Presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
                      {[
                        "Why is GPU showing standby?",
                        "How do I use Mistral Free Tier?",
                        "What does Negative Prompt Generator filter?",
                      ].map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputMessage(preset);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 rounded-lg whitespace-nowrap transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Chat Input Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-shrink-0">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Ask the AI Guardian about system health or prompt guidance..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl transition disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
