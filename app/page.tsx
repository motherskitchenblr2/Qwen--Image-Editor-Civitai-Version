"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  Download,
  Sliders,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  FolderOpen,
  Layers,
  Zap,
  Power,
  Settings,
  Play,
  Check,
  Copy,
  ArrowRight,
  Tag,
  Undo2,
  Shield,
  Cpu,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import CivitaiLoraHub from "./components/CivitaiLoraHub";
import SentinelAiGateway from "./components/SentinelAiGateway";
import AiGeneratorHub from "./components/AiGeneratorHub";
import LiveAiModelSelector from "./components/LiveAiModelSelector";
import PromptActionButtons from "./components/PromptActionButtons";
import AgenticHealthGuardianModal from "./components/AgenticHealthGuardianModal";
import NsfwBlockedModal from "./components/NsfwBlockedModal";
import {
  isNsfwContent,
  isImageFileNsfw,
  isNsfwModeActive,
  setNsfwModeActive,
  triggerNsfwBlockedModal,
} from "./lib/nsfwFilter";
import { LiveAiModel } from "./lib/aiModelRegistry";
import {
  StudioLayout,
  ControlPanel,
  CanvasWorkspace,
  LoraModal,
  HistoryRibbon,
  LoRAItem,
  BackendLoRA,
} from "./components/studio";

export default function ImageEditorStudio() {
  // Navigation Tabs: Studio & Editor | AI Generator Hub | Civitai.red LoRA Hub | Outputs Gallery | Sentinel Gateway
  const [activeTab, setActiveTab] = useState<"studio" | "generators" | "loras" | "gallery" | "sentinel">("studio");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [studioMode, setStudioMode] = useState<"edit" | "generate">("edit");
  const [selectedStudioModel, setSelectedStudioModel] = useState<string>("kaggle-gpu");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Backend connection
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [vramStats, setVramStats] = useState<any>(null);

  // Editor states
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("Turn this image into a cyberpunk masterpiece with neon lighting and high details");
  const [negativePrompt, setNegativePrompt] = useState<string>("blurry, distorted, low quality, deformed, artifacts, oversaturated, high contrast, washed out, low resolution");
  const [trueCfgScale, setTrueCfgScale] = useState<number>(1.0);
  const [guidanceScale, setGuidanceScale] = useState<number>(1.0);
  const [steps, setSteps] = useState<number>(6);
  const [seed, setSeed] = useState<number | "">("");
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);

  // LoRA states
  const [availableLoras, setAvailableLoras] = useState<BackendLoRA[]>([]);
  const [activeLoras, setActiveLoras] = useState<LoRAItem[]>([]);
  const [selectedDropdownLora, setSelectedDropdownLora] = useState<string>("");
  const [isFusingLora, setIsFusingLora] = useState<boolean>(false);
  const [fusedStatusMessage, setFusedStatusMessage] = useState<string>("");
  const [isLoraModalOpen, setIsLoraModalOpen] = useState<boolean>(false);
  const [inpaintMask, setInpaintMask] = useState<string | null>(null);

  // Quick Downloader states
  const [civitaiUrl, setCivitaiUrl] = useState<string>("");
  const [loraCustomName, setLoraCustomName] = useState<string>("");
  const [isDownloadingLora, setIsDownloadingLora] = useState<boolean>(false);

  // GPU & Quota states
  const [isShuttingDown, setIsShuttingDown] = useState<boolean>(false);
  const [isStartingGpu, setIsStartingGpu] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [modelStatusMessage, setModelStatusMessage] = useState<string>("");
  const [bootMessage, setBootMessage] = useState<string>("");
  const [showAdvancedUrl, setShowAdvancedUrl] = useState<boolean>(false);

  // Auto-Shutdown Watchdog schedule states (Default: 5 Minutes Recommended)
  const [autoShutdownEnabled, setAutoShutdownEnabled] = useState<boolean>(true);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(5);
  const [tempAutoShutdownEnabled, setTempAutoShutdownEnabled] = useState<boolean>(true);
  const [tempIdleTimeoutMinutes, setTempIdleTimeoutMinutes] = useState<number>(5);
  const [isSavingIdleTimeout, setIsSavingIdleTimeout] = useState<boolean>(false);
  const [idleSaveSuccessMessage, setIdleSaveSuccessMessage] = useState<string>("");
  const [backendIdleStatus, setBackendIdleStatus] = useState<any>(null);

  // Async Progress Tracking
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStep, setGenerationStep] = useState<number>(0);
  const [totalGenerationSteps, setTotalGenerationSteps] = useState<number>(25);
  const [generationStatusText, setGenerationStatusText] = useState<string>("");

  // Gallery
  const [gallery, setGallery] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"result" | "original">("result");

  // NSFW / SFW Mode Controller state (Default: SFW safe mode)
  const [isNsfwMode, setIsNsfwMode] = useState<boolean>(false);

  useEffect(() => {
    setIsNsfwMode(isNsfwModeActive());
    const handleNsfwSync = (e: any) => {
      setIsNsfwMode(Boolean(e.detail?.enabled));
    };
    window.addEventListener("nsfw-mode-changed", handleNsfwSync);
    return () => window.removeEventListener("nsfw-mode-changed", handleNsfwSync);
  }, []);

  const handleToggleNsfwMode = (enabled: boolean) => {
    setIsNsfwMode(enabled);
    setNsfwModeActive(enabled);
    if (showToast) {
      showToast(
        enabled
          ? "⚠️ 18+ Unrestricted NSFW Mode Activated"
          : "🛡️ SFW Mode Activated (Safe & Filtered)",
        enabled ? "info" : "success"
      );
    }
  };

  // Day / Night Theme Controller ("night" | "day")
  const [theme, setTheme] = useState<"night" | "day">("night");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("qwen_studio_theme") as "night" | "day" | null;
      if (savedTheme === "day" || savedTheme === "night") {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
        if (savedTheme === "day") {
          document.body.classList.add("theme-day");
          document.documentElement.classList.add("theme-day");
        } else {
          document.body.classList.remove("theme-day");
          document.documentElement.classList.remove("theme-day");
        }
      }
    } catch (_) {}
  }, []);

  const handleToggleTheme = (newTheme: "night" | "day") => {
    setTheme(newTheme);
    try {
      localStorage.setItem("qwen_studio_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      if (newTheme === "day") {
        document.body.classList.add("theme-day");
        document.documentElement.classList.add("theme-day");
      } else {
        document.body.classList.remove("theme-day");
        document.documentElement.classList.remove("theme-day");
      }
    } catch (_) {}
    if (showToast) {
      showToast(
        newTheme === "day"
          ? "☀️ Neumorphic Dashboard Off-White Day Theme Activated"
          : "🌙 Cyberpunk Night Theme Activated",
        "info"
      );
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localLoraInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLocalLora, setIsUploadingLocalLora] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Auto-discover live backend from Google Drive & Vercel Registry & Kaggle Session State
  const autoDiscoverBackend = async () => {
    try {
      // 1. Check if candidate URL is already active directly from browser
      let candidate = backendUrl;
      if (!candidate && typeof window !== "undefined") {
        candidate = localStorage.getItem("qwen_backend_url") || "";
      }
      candidate = candidate ? candidate.trim().replace(/\/+$/, "") : "";

      if (candidate && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
        try {
          const directPing = await fetch(`${candidate}/api/health`, {
            signal: AbortSignal.timeout(3000),
          });
          if (directPing.ok) {
            const hData = await directPing.json();
            setBackendUrl(candidate);
            setIsConnected(true);
            setIsStartingGpu(false);
            setBootMessage("");
            localStorage.setItem("qwen_backend_url", candidate);

            const ready = Boolean(hData.model_ready);
            setIsModelReady(ready);
            setModelStatusMessage(hData.message || (ready ? "Dual Tesla T4 Ready" : "Warming up pipeline in GPU VRAM..."));
            if (hData.vram) setVramStats(hData.vram);
            fetchAvailableLoras(candidate);

            // Fetch idle timeout watchdog schedule from backend
            try {
              const idleRes = await fetch(`${candidate}/api/settings/idle-timeout`);
              if (idleRes.ok) {
                const idleData = await idleRes.json();
                setAutoShutdownEnabled(idleData.enabled);
                setIdleTimeoutMinutes(idleData.timeout_minutes);
                setTempAutoShutdownEnabled(idleData.enabled);
                setTempIdleTimeoutMinutes(idleData.timeout_minutes);
                setBackendIdleStatus(idleData);
              }
            } catch {}

            // Sync to server registry
            fetch("/api/tunnel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: candidate }),
            }).catch(() => {});

            return candidate;
          }
        } catch {
          // Direct probe failed; proceed with server discovery
        }
      }

      const query = candidate ? `?candidate_url=${encodeURIComponent(candidate)}` : "";
      const res = await fetch(`/api/backend/status${query}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const { coordinated_state, is_alive, tunnel_url, kernel_status, model_ready, model_message, vram } = data;

        if (is_alive && tunnel_url) {
          const cleanUrl = tunnel_url.replace(/\/+$/, "");
          setBackendUrl(cleanUrl);
          setIsConnected(true);
          setIsStartingGpu(false);
          setBootMessage("");
          localStorage.setItem("qwen_backend_url", cleanUrl);

          const ready = Boolean(model_ready);
          setIsModelReady(ready);
          setModelStatusMessage(model_message || (ready ? "Dual Tesla T4 Ready" : "Warming up pipeline in GPU VRAM..."));
          if (vram) setVramStats(vram);
          fetchAvailableLoras(cleanUrl);

          // Fetch idle timeout watchdog schedule from backend
          try {
            const idleRes = await fetch(`${cleanUrl}/api/settings/idle-timeout`);
            if (idleRes.ok) {
              const idleData = await idleRes.json();
              setAutoShutdownEnabled(idleData.enabled);
              setIdleTimeoutMinutes(idleData.timeout_minutes);
              setTempAutoShutdownEnabled(idleData.enabled);
              setTempIdleTimeoutMinutes(idleData.timeout_minutes);
              setBackendIdleStatus(idleData);
            }
          } catch {}

          return cleanUrl;
        } else if (coordinated_state === "warming_up" || kernel_status === "RUNNING") {
          // If already connected via a direct tunnel, preserve connection
          if (!isConnected) {
            setIsStartingGpu(true);
            setIsConnected(false);
            setIsModelReady(false);
            setBootMessage("Dual Tesla T4s active on Kaggle (~90s)... Auto-connecting tunnel.");
          }
        } else if (coordinated_state === "queued" || kernel_status === "QUEUED") {
          if (!isConnected) {
            setIsStartingGpu(true);
            setIsConnected(false);
            setIsModelReady(false);
            setBootMessage("Kaggle GPU session queued... Waiting for worker allocation.");
          }
        } else {
          // Offline / stopped
          if (!isShuttingDown) {
            setIsConnected(false);
            setIsModelReady(false);
            setIsStartingGpu(false);
            setBootMessage("");
            setBackendUrl("");
          }
        }
      }
    } catch (e) {
      console.warn("Backend status coordinator check error:", e);
    }
    return null;
  };

  // Mount effect: load saved and initiate auto-discovery polling
  useEffect(() => {
    // 1. Immediately restore cached LoRAs from browser storage (0ms flash, zero data loss on refresh)
    try {
      const cachedLoras = localStorage.getItem("qwen_vault_loras");
      if (cachedLoras) {
        const parsed = JSON.parse(cachedLoras);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableLoras(parsed);
        }
      }
    } catch (e) {
      console.warn("Cached LoRAs load error:", e);
    }

    // 2. Load permanent Google Drive Vault catalog from server
    fetch("/api/vault/loras")
      .then((res) => res.json())
      .then((data) => {
        if (data.loras && Array.isArray(data.loras) && data.loras.length > 0) {
          setAvailableLoras((prev) => {
            const map = new Map<string, BackendLoRA>();
            data.loras.forEach((l: BackendLoRA) => map.set(l.filename, l));
            prev.forEach((l) => {
              if (map.has(l.filename)) {
                map.set(l.filename, { ...map.get(l.filename)!, ...l });
              } else {
                map.set(l.filename, l);
              }
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem("qwen_vault_loras", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn("Google Drive Vault catalog fetch:", err));

    // 3. Immediately restore saved backend URL and perform health check
    try {
      const savedBackend = localStorage.getItem("qwen_backend_url");
      if (savedBackend) {
        const cleanSaved = savedBackend.replace(/\/+$/, "");
        setBackendUrl(cleanSaved);
      }
    } catch {}

    // 4. Restore idle timeout watchdog preferences
    try {
      const savedIdleM = localStorage.getItem("qwen_idle_timeout_minutes");
      if (savedIdleM) {
        const m = parseInt(savedIdleM, 10);
        if ([5, 10, 15, 30].includes(m)) {
          setIdleTimeoutMinutes(m);
          setTempIdleTimeoutMinutes(m);
        }
      }
      const savedIdleEnabled = localStorage.getItem("qwen_idle_timeout_enabled");
      if (savedIdleEnabled !== null) {
        const en = savedIdleEnabled === "true";
        setAutoShutdownEnabled(en);
        setTempAutoShutdownEnabled(en);
      }
    } catch {}

    autoDiscoverBackend();
    const interval = setInterval(() => {
      autoDiscoverBackend();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async (urlToCheck?: string) => {
    setIsCheckingHealth(true);
    try {
      const target = (urlToCheck || backendUrl || "").trim().replace(/\/+$/, "");
      if (target && (target.startsWith("http://") || target.startsWith("https://"))) {
        try {
          const directPing = await fetch(`${target}/api/health`, {
            signal: AbortSignal.timeout(3500),
          });
          if (directPing.ok) {
            const hData = await directPing.json();
            setBackendUrl(target);
            setIsConnected(true);
            setIsStartingGpu(false);
            setBootMessage("");
            localStorage.setItem("qwen_backend_url", target);

            const ready = Boolean(hData.model_ready);
            setIsModelReady(ready);
            setModelStatusMessage(hData.message || (ready ? "Dual Tesla T4 Ready" : "Warming up pipeline in GPU VRAM..."));
            if (hData.vram) setVramStats(hData.vram);
            fetchAvailableLoras(target);

            fetch("/api/tunnel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: target }),
            }).catch(() => {});
            return;
          }
        } catch {}
      }
      await autoDiscoverBackend();
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleStartGpu = async (forceRestart: boolean = false) => {
    setIsStartingGpu(true);
    setBootMessage(forceRestart ? "Force restarting Kaggle GPU session..." : "Checking Kaggle Dual Tesla T4 GPU status...");
    try {
      const res = await fetch("/api/backend/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_restart: forceRestart }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "already_running" && data.tunnel_url) {
          setBootMessage("GPU is already online! Connecting...");
          setBackendUrl(data.tunnel_url);
          await checkBackend(data.tunnel_url);
          setIsStartingGpu(false);
          setBootMessage("");
          return;
        }

        setBootMessage(data.message || "Kaggle booting Dual T4s (~90s)... Auto-connecting when ready.");
        let connectedUrl: string | null = null;
        let attempts = 0;
        while (!connectedUrl && attempts < 35) {
          await new Promise((r) => setTimeout(r, 4000));
          attempts++;
          connectedUrl = await autoDiscoverBackend();
          if (connectedUrl) break;
        }
        if (!connectedUrl) {
          setBootMessage("Still warming up models on Kaggle. It will auto-connect momentarily...");
        }
      } else {
        setIsStartingGpu(false);
        setBootMessage("");
        alert(`Launch response: ${data.message || "Could not reach Kaggle API."}`);
      }
    } catch (e: any) {
      setIsStartingGpu(false);
      setBootMessage("");
      alert(`Launch error: ${e.message}`);
    }
  };

  const handleShutdownGpu = async () => {
    if (!confirm("Are you sure you want to stop the Kaggle GPU backend? This will deallocate the GPU instance immediately to protect your quota.")) {
      return;
    }
    setIsShuttingDown(true);
    try {
      const targetUrl = backendUrl || (typeof window !== "undefined" ? localStorage.getItem("qwen_backend_url") || "" : "");
      const res = await fetch("/api/backend/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_url: targetUrl }),
      });
      const data = await res.json().catch(() => ({}));
      setIsConnected(false);
      setIsModelReady(false);
      setIsStartingGpu(false);
      setBootMessage("");
      setBackendUrl("");
      localStorage.removeItem("qwen_backend_url");
      alert(data.message || "✅ Kaggle GPU backend stopped and deallocated! All rolling GPU queues cleared.");
    } catch {
      setIsConnected(false);
      setIsModelReady(false);
      setIsStartingGpu(false);
      setBootMessage("");
      setBackendUrl("");
      localStorage.removeItem("qwen_backend_url");
      alert("✅ Shutdown signal sent! Tunnel is disconnected and GPU is powering down.");
    } finally {
      setIsShuttingDown(false);
    }
  };

  const handleSaveIdleTimeout = async () => {
    setIsSavingIdleTimeout(true);
    setIdleSaveSuccessMessage("");
    try {
      setAutoShutdownEnabled(tempAutoShutdownEnabled);
      setIdleTimeoutMinutes(tempIdleTimeoutMinutes);
      localStorage.setItem("qwen_idle_timeout_enabled", String(tempAutoShutdownEnabled));
      localStorage.setItem("qwen_idle_timeout_minutes", String(tempIdleTimeoutMinutes));

      if (backendUrl && isConnected) {
        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const res = await fetch(`${cleanUrl}/api/settings/idle-timeout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: tempAutoShutdownEnabled,
            timeout_minutes: tempIdleTimeoutMinutes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIdleSaveSuccessMessage(`✅ Saved! Auto-shutdown active for ${tempIdleTimeoutMinutes} minutes.`);
          setBackendIdleStatus(data);
        } else {
          setIdleSaveSuccessMessage(`Saved locally (${tempIdleTimeoutMinutes} min). Will sync on connect.`);
        }
      } else {
        setIdleSaveSuccessMessage(`Saved locally (${tempIdleTimeoutMinutes} min). Takes effect on GPU start.`);
      }
    } catch (e: any) {
      setIdleSaveSuccessMessage(`Saved locally (${tempIdleTimeoutMinutes} min).`);
    } finally {
      setIsSavingIdleTimeout(false);
      setTimeout(() => setIdleSaveSuccessMessage(""), 5000);
    }
  };

  const handleCancelIdleTimeout = () => {
    setTempAutoShutdownEnabled(autoShutdownEnabled);
    setTempIdleTimeoutMinutes(idleTimeoutMinutes);
    setIdleSaveSuccessMessage("");
    setShowAdvancedUrl(false);
  };

  const fetchAvailableLoras = async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/loras`);
      if (res.ok) {
        const data = await res.json();
        const backendLoras: BackendLoRA[] = data.loras || [];
        setAvailableLoras((prev) => {
          const map = new Map<string, BackendLoRA>();
          prev.forEach((l) => map.set(l.filename, l));
          backendLoras.forEach((bl) => {
            const existing = map.get(bl.filename);
            if (existing) {
              map.set(bl.filename, { ...existing, ...bl });
            } else {
              map.set(bl.filename, bl);
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem("qwen_vault_loras", JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (e) {
      console.error("Failed to fetch LoRAs:", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isNsfwMode && isImageFileNsfw(file.name)) {
        triggerNsfwBlockedModal();
        if (e.target) e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setOriginalImage(uploadEvent.target?.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    if (!isNsfwMode && isNsfwContent(prompt)) {
      triggerNsfwBlockedModal();
      return;
    }
    setIsEnhancingPrompt(true);
    try {
      const activeCopilot = localStorage.getItem("sentinel_active_copilot") || "gemini";

      const res = await fetch("/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: activeCopilot,
          nsfw_enabled: isNsfwMode,
        }),
      });

      if (res.status === 403) {
        triggerNsfwBlockedModal();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.enhancedPrompt) {
          setPrompt(data.enhancedPrompt);
        }
      }
    } catch (e) {
      console.warn("Enhance prompt error:", e);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // ── LoRA Dropdown & GPU Fusing Logic ──────────────────────────────
  const handleSelectLoraFromDropdown = (filename: string) => {
    if (!filename) {
      setSelectedDropdownLora("");
      setActiveLoras([]);
      return;
    }
    const lora = availableLoras.find((l) => l.filename === filename || l.name === filename);
    if (!lora) return;

    // Single Selected LoRA Mode: guarantees only the chosen LoRA from the dropdown is loaded & fused
    setSelectedDropdownLora(filename);
    setActiveLoras([{ name: lora.name, scale: lora.scale || 0.8 }]);

    if (lora.trigger_words && !prompt.includes(lora.trigger_words)) {
      setPrompt((prev) => `${prev}, ${lora.trigger_words}`);
    }
  };

  const handleLocalLoraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".safetensors")) {
      alert("Please select a valid .safetensors LoRA file.");
      if (localLoraInputRef.current) localLoraInputRef.current.value = "";
      return;
    }

    if (!backendUrl || !isConnected) {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const cleanFilename = safeFilename.endsWith(".safetensors") ? safeFilename : `${safeFilename}.safetensors`;
      const loraName = file.name.replace(".safetensors", "");

      try {
        await fetch("/api/vault/loras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: loraName,
            filename: cleanFilename,
            size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          }),
        });
      } catch {}

      const newLora = {
        name: loraName,
        filename: cleanFilename,
        size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
        is_active: false,
      };

      setAvailableLoras((prev) => {
        const filtered = prev.filter((l) => l.filename !== cleanFilename);
        const updated = [newLora, ...filtered];
        try {
          localStorage.setItem("qwen_vault_loras", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setSelectedDropdownLora(cleanFilename);
      setActiveLoras([{ name: loraName, scale: 0.8 }]);
      setFusedStatusMessage(`✅ LoRA "${loraName}" registered in Studio! Selected & ready.`);
      setTimeout(() => setFusedStatusMessage(""), 6000);
      if (localLoraInputRef.current) localLoraInputRef.current.value = "";
      return;
    }

    setIsUploadingLocalLora(true);
    setUploadProgress(0);
    setFusedStatusMessage(`Uploading local LoRA "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(".safetensors", ""));

      // Use XMLHttpRequest for real-time progress percentage
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${cleanUrl}/api/loras/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
            setFusedStatusMessage(`Uploading local LoRA: ${percent}%...`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error during LoRA upload."));
        xhr.send(formData);
      });

      // Register in local Next.js Vault registry
      try {
        await fetch("/api/vault/loras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name.replace(".safetensors", ""),
            filename: file.name.endsWith(".safetensors") ? file.name : `${file.name}.safetensors`,
            size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          }),
        });
      } catch {}

      // Refresh available LoRAs from backend
      await fetchAvailableLoras(cleanUrl);

      // Clean filename for auto-selection
      const safeFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const cleanFilename = safeFilename.endsWith(".safetensors") ? safeFilename : `${safeFilename}.safetensors`;
      const loraName = file.name.replace(".safetensors", "");

      // Auto-select ONLY this uploaded LoRA as requested
      setSelectedDropdownLora(cleanFilename);
      setActiveLoras([{ name: loraName, scale: 0.8 }]);

      setFusedStatusMessage(`✅ LoRA "${loraName}" uploaded! Selected & ready to fuse into GPU.`);
      setTimeout(() => setFusedStatusMessage(""), 6000);
    } catch (err: any) {
      console.error("Upload LoRA error:", err);
      alert(`Local LoRA upload error: ${err.message || err}`);
      setFusedStatusMessage("");
    } finally {
      setIsUploadingLocalLora(false);
      setUploadProgress(0);
      if (localLoraInputRef.current) localLoraInputRef.current.value = "";
    }
  };

  const handleFuseLora = async (lorasToFuse = activeLoras) => {
    if (!backendUrl || !isConnected) {
      alert("Please turn on or connect the Kaggle Dual T4 GPU first.");
      return;
    }
    if (!isModelReady) {
      alert(`The Dual T4 GPU model pipeline is still warming up (${modelStatusMessage || "loading weights into VRAM"}). Please wait for the green 'Ready' indicator before fusing LoRAs.`);
      return;
    }
    if (lorasToFuse.length === 0) {
      alert("Please select at least one LoRA from the dropdown.");
      return;
    }

    setIsFusingLora(true);
    setFusedStatusMessage("Loading & fusing LoRA weights into GPU DiT layers...");
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/loras/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loras: lorasToFuse }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to fuse LoRA on GPU");
      }

      const data = await res.json();
      const fusedCount = Object.keys(data.active_loras || {}).length;
      if (fusedCount === 0) {
        setFusedStatusMessage(`⚠️ LoRA is not downloaded in GPU cache yet. Please download it from Civitai Hub or Quick Downloader first.`);
      } else {
        setFusedStatusMessage(`✅ ${fusedCount} LoRA(s) fused into GPU VRAM!`);
      }
      setTimeout(() => setFusedStatusMessage(""), 6000);
      fetchAvailableLoras(cleanUrl);
    } catch (e: any) {
      alert(`LoRA Fuse error: ${e.message}`);
      setFusedStatusMessage("");
    } finally {
      setIsFusingLora(false);
    }
  };

  const handleUnloadLoras = async () => {
    if (!backendUrl || !isConnected) return;
    setIsFusingLora(true);
    setFusedStatusMessage("Unloading LoRAs from GPU and restoring base Qwen model...");
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      await fetch(`${cleanUrl}/api/loras/unload`, { method: "POST" });
      setActiveLoras([]);
      setFusedStatusMessage("✅ All LoRAs unloaded. Base model restored.");
      setTimeout(() => setFusedStatusMessage(""), 4000);
      fetchAvailableLoras(cleanUrl);
    } catch (e: any) {
      alert(`Unload error: ${e.message}`);
    } finally {
      setIsFusingLora(false);
    }
  };

  // Called from CivitaiLoraHub when user clicks "Use in Studio"
  const handleSelectForStudio = (loraFilename: string, triggerWords?: string[]) => {
    const lora = availableLoras.find((l) => l.filename === loraFilename || l.name === loraFilename) || {
      name: loraFilename.replace(".safetensors", ""),
      filename: loraFilename,
      size_mb: 0,
      is_active: false,
    };

    if (!activeLoras.some((l) => l.name === lora.name)) {
      setActiveLoras((prev) => [...prev.slice(-2), { name: lora.name, scale: 0.8 }]);
    }

    if (triggerWords && triggerWords.length > 0) {
      const words = triggerWords.join(", ");
      if (!prompt.includes(words)) {
        setPrompt((prev) => `${prev}, ${words}`);
      }
    }

    setActiveTab("studio");
  };

  const handleToggleLoraInStack = (lora: BackendLoRA) => {
    setActiveLoras((prev) => {
      const exists = prev.some((l) => l.name === lora.name);
      if (exists) {
        return prev.filter((l) => l.name !== lora.name);
      }
      if (prev.length >= 3) {
        showToast("Maximum 3 LoRAs can be stacked simultaneously", "info");
        return prev;
      }
      return [...prev, { name: lora.name, scale: 0.8 }];
    });
  };

  const handleUpdateLoraScale = (name: string, scale: number) => {
    setActiveLoras((prev) =>
      prev.map((item) => (item.name === name ? { ...item, scale } : item))
    );
  };

  const handleInjectTriggers = (triggers: string) => {
    if (!prompt.includes(triggers)) {
      setPrompt((prev) => (prev ? `${prev}, ${triggers}` : triggers));
      showToast("Inserted trigger words into prompt!", "success");
    }
  };

  const handleQuickDownloadLora = async () => {
    if (!civitaiUrl || !backendUrl || !isConnected) return;
    setIsDownloadingLora(true);
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/loras/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: civitaiUrl,
          name: loraCustomName || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Download failed");
      }

      const data = await res.json();
      setCivitaiUrl("");
      setLoraCustomName("");
      fetchAvailableLoras(cleanUrl);
      alert(`✅ LoRA "${data.name}" saved to 5 TB Google Drive Vault and ready for inference!`);
    } catch (e: any) {
      alert(`Download error: ${e.message}`);
    } finally {
      setIsDownloadingLora(false);
    }
  };

  // ── Unified Inference Engine (Kaggle GPU + Cloud AI Models) ─────
  const handleGenerate = async () => {
    // Validation based on mode & model
    if (selectedStudioModel === "kaggle-gpu") {
      if (!originalImage) {
        alert("Please upload a source image for Image-to-Image editing on Kaggle GPU.");
        return;
      }
      if (!backendUrl || !isConnected) {
        alert("Dual Tesla T4 GPU is offline. Click 'Turn On GPU' or switch engine to 'Nano Banana' or 'Alibaba Qwen Cloud' for instant generation!");
        return;
      }
    } else {
      if (studioMode === "edit" && !originalImage) {
        alert("Please upload a source image for Image Editing mode.");
        return;
      }
    }

    if (!prompt || !prompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }

    if (!isNsfwMode && (isNsfwContent(prompt) || isNsfwContent(negativePrompt))) {
      triggerNsfwBlockedModal();
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep(0);
    setGenerationElapsed(0);

    const timer = setInterval(() => {
      setGenerationElapsed((prev) => prev + 1);
    }, 1000);

    try {
      if (selectedStudioModel === "kaggle-gpu") {
        setTotalGenerationSteps(Number(steps));
        setGenerationStatusText(Number(steps) <= 4 ? "⚡ Initializing 4-Step Rapid Edit (~15-25s)..." : "Initializing GPU inference job...");

        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const payload = {
          image_base64: originalImage,
          prompt: prompt,
          negative_prompt: negativePrompt,
          true_cfg_scale: Number(trueCfgScale),
          guidance_scale: Number(guidanceScale),
          num_inference_steps: Number(steps),
          seed: seed === "" ? null : Number(seed),
          loras: activeLoras,
          mask_base64: inpaintMask || undefined,
          async_mode: true,
        };

        const res = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            nsfw_enabled: isNsfwMode,
            backend_url: cleanUrl || undefined,
          }),
        });

        if (res.status === 403) {
          triggerNsfwBlockedModal();
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || "Request failed");
        }

        const data = await res.json();

        if (data.task_id) {
          setGenerationStatusText(Number(steps) <= 4 ? "⚡ Rapid job queued on GPU DiT layers..." : `Task ${data.task_id} queued on Dual Tesla T4s...`);
          let completed = false;
          let attempts = 0;
          const maxAttempts = 300;

          while (!completed && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            attempts++;

            try {
              const statusUrl = cleanUrl
                ? `/api/edit/status/${data.task_id}?backend_url=${encodeURIComponent(cleanUrl)}`
                : `/api/edit/status/${data.task_id}`;
              const statusRes = await fetch(statusUrl);
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === "completed" && statusData.image_base64) {
                  setEditedImage(statusData.image_base64);
                  setGallery((prev) => [statusData.image_base64, ...prev]);
                  setViewMode("result");
                  setGenerationStatusText("Completed in Rapid Time!");
                  completed = true;
                  break;
                } else if (statusData.status === "failed") {
                  throw new Error(statusData.error || "Inference failed on GPU");
                } else {
                  const totalSt = statusData.total_steps || Number(steps);
                  const currSt = statusData.step || 0;
                  const pct = typeof statusData.progress === "number" && statusData.progress > 0
                    ? Math.round(statusData.progress)
                    : (totalSt > 0 ? Math.round((currSt / totalSt) * 100) : 0);
                  setGenerationProgress(pct);
                  setGenerationStep(currSt);
                  setTotalGenerationSteps(totalSt);
                  if (statusData.stage) {
                    setGenerationStatusText(`${statusData.stage} (${pct}%)`);
                  } else if (currSt === 0) {
                    const elapsedSec = Math.round(attempts * 1.5);
                    setGenerationStatusText(`⚡ Encoding prompt & image features (${elapsedSec}s)...`);
                  } else if (totalSt <= 4) {
                    setGenerationStatusText(`⚡ Rapid Step ${currSt}/${totalSt} (${pct}%)`);
                  } else {
                    setGenerationStatusText(`Step ${currSt}/${totalSt} (${pct}%)`);
                  }
                }
              }
            } catch (pollErr: any) {
              console.warn("Status poll warning:", pollErr);
            }
          }

          if (!completed) {
            throw new Error("Generation timed out.");
          }
        } else if (data.image_base64) {
          setEditedImage(data.image_base64);
          setGallery((prev) => [data.image_base64, ...prev]);
          setViewMode("result");
        }
      } else {
        // Cloud API Engine: Nano Banana Turbo, Alibaba Qwen Cloud, Google Imagen 3, Hugging Face Hub, Cloudflare Workers AI
        const isHf = selectedStudioModel.startsWith("huggingface/") || selectedStudioModel.startsWith("hf/") || (selectedStudioModel.includes("/") && !selectedStudioModel.includes("@cf/"));
        setGenerationStatusText(
          selectedStudioModel === "nano-banana"
            ? "⚡ Synthesizing with Nano Banana Turbo (~1.5s)..."
            : selectedStudioModel === "google-imagen"
            ? "Synthesizing with Google Gemini Vision Engine..."
            : isHf
            ? `Synthesizing with Hugging Face (${selectedStudioModel.split("/").pop()})...`
            : selectedStudioModel === "qwen-cloud"
            ? `Synthesizing with Alibaba ${studioMode === "edit" ? "qwen-image-edit" : "qwen-image"}...`
            : "Synthesizing with Cloud AI Engine..."
        );
        setGenerationProgress(35);

        const targetCloudModel =
          selectedStudioModel === "qwen-cloud"
            ? (studioMode === "edit" ? "qwen-image-edit" : "qwen-image")
            : selectedStudioModel === "google-imagen"
            ? "google-imagen"
            : selectedStudioModel === "cf-lucid"
            ? "@cf/leonardo/lucid-origin"
            : selectedStudioModel === "cf-flux"
            ? "@cf/black-forest-labs/flux-1-schnell"
            : selectedStudioModel;

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            negative_prompt: negativePrompt,
            model: targetCloudModel,
            mode: studioMode,
            image_base64: originalImage || undefined,
            mask_base64: inpaintMask || undefined,
            seed: seed === "" ? null : Number(seed),
            nsfw_enabled: isNsfwMode,
          }),
        });

        if (res.status === 403) {
          triggerNsfwBlockedModal();
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.code === "QUOTA_EXHAUSTED" || res.status === 402) {
            throw new Error(data.error || "Alibaba Cloud quota exhausted on free tier. Switched recommendation to Nano Banana.");
          }
          throw new Error(data.error || `Cloud generation failed (${res.status})`);
        }

        const outImg = data.image_url || data.image_base64;
        if (!outImg) {
          throw new Error("No image data returned from generator engine.");
        }

        setGenerationProgress(100);
        setGenerationStatusText("Generated successfully!");
        setEditedImage(outImg);
        setGallery((prev) => [outImg, ...prev]);
        setViewMode("result");
      }
    } catch (e: any) {
      console.error("Generation failed:", e);
      alert(`Generation notice: ${e.message || e}`);
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
      if (selectedStudioModel === "kaggle-gpu" && isConnected) {
        checkBackend();
      }
    }
  };

  return (
    <div className={`flex flex-col ${activeTab === "studio" ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen"} bg-transparent text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative ${theme === "day" ? "theme-day" : "theme-night"}`}>
      {/* ── Top Unified Header Bar (Frozen at Top of Viewport) ── */}
      <header className="border-b border-cyan-500/30 bg-slate-950/95 backdrop-blur-2xl px-4 lg:px-8 py-2.5 fixed top-0 left-0 right-0 z-50 shadow-[0_4px_30px_rgba(6,182,212,0.15)] w-full">
        <div className="w-full flex items-center justify-between gap-3 lg:gap-6">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-gradient-to-tr from-cyan-400 via-teal-400 to-indigo-500 p-2 rounded-xl text-black shadow-[0_0_15px_rgba(6,182,212,0.45)] shrink-0 animate-neon-cyan">
              <Sparkles className="w-5 h-5 fill-black" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-base sm:text-lg lg:text-xl leading-none tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                Qwen Image Editor Studio
              </h1>
              <span className="text-[10px] text-cyan-300/80 font-mono font-semibold tracking-wider mt-1">
                Dual Tesla T4 &bull; 5 TB Vault
              </span>
            </div>
          </div>

          {/* Center: Main View Tabs (Desktop Segmented Control) */}
          <nav className="hidden lg:flex items-center gap-1 bg-black/80 p-1 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.12)]">
            <button
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                activeTab === "studio"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio &amp; Editor</span>
            </button>
            <button
              onClick={() => setActiveTab("generators")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                activeTab === "generators"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Generators</span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-400/60 rounded-full text-[9px] text-amber-300 font-extrabold shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                NEW
              </span>
            </button>
            <button
              onClick={() => setActiveTab("loras")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                activeTab === "loras"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Civitai LoRA Hub</span>
              {availableLoras.length > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-900 border border-cyan-500/40 rounded-full text-[10px] text-cyan-300 font-mono font-black">
                  {availableLoras.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                activeTab === "gallery"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Gallery</span>
              {gallery.length > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-700/80 rounded-full text-[10px] text-slate-300 font-mono font-bold">
                  {gallery.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("sentinel")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                activeTab === "sentinel"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "text-slate-300 hover:text-cyan-300 hover:bg-slate-900/60"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sentinel</span>
            </button>
          </nav>

          {/* Right: System Status Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Unified GPU Toggle Button: Green dot if online, amber if offline */}
            {isConnected ? (
              <button
                onClick={handleShutdownGpu}
                disabled={isShuttingDown}
                title="GPU is Online. Click to turn off and save quota."
                className="group flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-rose-500/25 border border-emerald-400/80 hover:border-rose-400 text-emerald-200 hover:text-rose-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 group-hover:bg-rose-400"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 group-hover:bg-rose-400"></span>
                </span>
                <span className="hidden sm:inline group-hover:hidden">GPU Online</span>
                <span className="inline sm:hidden group-hover:hidden">Online</span>
                <span className="hidden group-hover:inline text-rose-300">{isShuttingDown ? "Stopping..." : "Turn Off"}</span>
              </button>
            ) : isStartingGpu ? (
              <button
                onClick={handleShutdownGpu}
                disabled={isShuttingDown}
                title="GPU is booting on Kaggle (~90s). Click to halt."
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-rose-500/25 border border-amber-400/80 hover:border-rose-400 text-amber-200 hover:text-rose-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="hidden sm:inline">{isShuttingDown ? "Halting..." : "Booting GPU..."}</span>
                <span className="sm:hidden">{isShuttingDown ? "Stop" : "Booting"}</span>
              </button>
            ) : (
              <button
                onClick={() => handleStartGpu()}
                title="Click to Turn On Kaggle Dual Tesla T4 GPU"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-emerald-500/20 border border-amber-500/50 hover:border-emerald-400 text-amber-300 hover:text-emerald-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="hidden sm:inline">⚡ GPU Offline</span>
                <span className="sm:hidden">Offline</span>
                <span className="hidden md:inline text-[10px] text-slate-400 font-normal pl-0.5">&bull; Turn On</span>
              </button>
            )}

            {/* Theme Toggle ("🌙 NIGHT" / "☀️ DAY NEO") */}
            <button
              onClick={() => handleToggleTheme(theme === "day" ? "night" : "day")}
              title={theme === "day" ? "Switch to Night Mode" : "Switch to Day Mode"}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-black transition active:scale-95 ${
                theme === "day"
                  ? "bg-slate-100 hover:bg-white border-white/90 text-slate-900 shadow-[2px_2px_6px_rgba(163,177,198,0.45),-2px_-2px_6px_#ffffff]"
                  : "bg-slate-900/90 hover:bg-slate-800 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              }`}
            >
              {theme === "day" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span className="hidden md:inline font-extrabold tracking-wide">DAY NEO</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-300 fill-cyan-400/20" />
                  <span className="hidden md:inline font-extrabold tracking-wide">NIGHT</span>
                </>
              )}
            </button>

            {/* Safety Toggle ("🛡️ SFW SAFE" / "🔞 NSFW ON") */}
            <button
              onClick={() => handleToggleNsfwMode(!isNsfwMode)}
              title={isNsfwMode ? "NSFW Active (Click to enable SFW Safe Mode)" : "SFW Safe Mode Active (Click to unlock NSFW Mode)"}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
                isNsfwMode
                  ? "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              }`}
            >
              {isNsfwMode ? (
                <>
                  <span className="text-xs leading-none">🔞</span>
                  <span className="hidden md:inline font-extrabold tracking-wide">NSFW ON</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline font-extrabold tracking-wide">SFW SAFE</span>
                </>
              )}
            </button>

            {/* Advanced / Manual URL Override Toggle */}
            <button
              onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
              title="Inspect backend tunnel URL"
              className="p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200 rounded-xl shadow-sm transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Toggle for Center Tabs */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 rounded-xl transition"
              title="Open Navigation Menu"
            >
              {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Out Drawer / Dropdown */}
        {isMobileNavOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-cyan-500/25 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
            <button
              onClick={() => { setActiveTab("studio"); setIsMobileNavOpen(false); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
                activeTab === "studio"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio &amp; Editor</span>
            </button>
            <button
              onClick={() => { setActiveTab("generators"); setIsMobileNavOpen(false); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
                activeTab === "generators"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Generators</span>
            </button>
            <button
              onClick={() => { setActiveTab("loras"); setIsMobileNavOpen(false); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
                activeTab === "loras"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Civitai LoRAs</span>
            </button>
            <button
              onClick={() => { setActiveTab("gallery"); setIsMobileNavOpen(false); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
                activeTab === "gallery"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>
            <button
              onClick={() => { setActiveTab("sentinel"); setIsMobileNavOpen(false); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-black transition ${
                activeTab === "sentinel"
                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black shadow-md"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sentinel</span>
            </button>
          </div>
        )}
      </header>

      {/* Header spacer: preserves natural document flow height beneath frozen header */}
      <div className="h-14 sm:h-16 shrink-0" aria-hidden="true" />

      {/* Booting Notification Banner */}
      {bootMessage && (
        <div className="bg-cyan-950/70 border-b border-cyan-800/80 px-6 py-2 flex items-center justify-between text-xs text-cyan-200">
          <span className="flex items-center gap-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            {bootMessage}
          </span>
          <span className="text-cyan-400/80 text-[11px]">Auto-discovering endpoint via Drive Vault...</span>
        </div>
      )}

      {/* ── Settings: GPU Configuration Card ── */}
      {showAdvancedUrl && (
        <div className="bg-slate-950/95 border-b border-cyan-500/50 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.2)] px-6 py-5 backdrop-blur-2xl animate-fadeIn">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                  <Settings className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    Settings: GPU Configuration Card
                  </h3>
                  <p className="text-[11px] text-cyan-300/70">
                    Configure backend ingress and schedule automatic GPU shutdown to preserve your quota.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelIdleTimeout}
                className="text-slate-400 hover:text-cyan-300 text-xs px-2.5 py-1 rounded-lg hover:bg-cyan-950/50 hover:border hover:border-cyan-500/40 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Ingress Link Connection */}
            <div className="bg-black/70 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.12)] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Cloudflare Tunnel Ingress URL
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold shadow-sm ${
                  isConnected ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-neon-emerald" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}>
                  {isConnected ? "● Tunnel Active" : "○ Disconnected"}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://your-tunnel.trycloudflare.com (Auto-discovered from Drive Vault)"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="flex-1 bg-slate-900/90 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] focus:outline-none"
                />
                <button
                  onClick={() => checkBackend()}
                  disabled={isCheckingHealth}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 rounded-lg font-semibold border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] transition text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? "animate-spin" : ""}`} />
                  Verify Link
                </button>
              </div>
            </div>

            {/* ── Global NSFW / SFW Content Mode Controller Card ── */}
            <div className="bg-black/70 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${isNsfwMode ? "text-rose-400 animate-pulse" : "text-emerald-400"}`} />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                      Global Content Mode &amp; Safety Filter
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isNsfwMode
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                    }`}>
                      {isNsfwMode ? "🔞 18+ Unrestricted NSFW" : "🛡️ SFW Safe Mode"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Master toggle that comprehensively controls image generations, source uploads, prompt brainstorming, and Sentinel AI chat across the entire application.
                  </p>
                </div>
              </div>

              {/* SFW / NSFW Mode Selection Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SFW Safe Mode Option */}
                <label
                  onClick={() => handleToggleNsfwMode(false)}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    !isNsfwMode
                      ? "bg-emerald-500/15 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nsfw_mode_selector"
                        checked={!isNsfwMode}
                        onChange={() => handleToggleNsfwMode(false)}
                        className="w-4 h-4 accent-emerald-400 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" /> SFW Safe Mode
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 rounded font-mono font-bold leading-none">
                      DEFAULT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                    Strict content safety. Blocks adult, explicit, or inappropriate prompts, uploads, and AI chat. Any attempt triggers <span className="font-mono text-cyan-300">&quot;NSFW Blocked by Admin&quot;</span> popup modal.
                  </p>
                </label>

                {/* NSFW Unrestricted Mode Option */}
                <label
                  onClick={() => handleToggleNsfwMode(true)}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    isNsfwMode
                      ? "bg-rose-500/20 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                      : "bg-slate-950/80 border-slate-800 hover:border-rose-500/40 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nsfw_mode_selector"
                        checked={isNsfwMode}
                        onChange={() => handleToggleNsfwMode(true)}
                        className="w-4 h-4 accent-rose-400 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="text-sm leading-none">🔞</span> 18+ Unrestricted NSFW Mode
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/25 text-rose-300 border border-rose-400/60 rounded font-mono font-bold leading-none">
                      UNLOCKED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                    Completely unlocks all generation engines, image edits, brainstorming, and AI chat for unfiltered adult &amp; creative workflows.
                  </p>
                </label>
              </div>
            </div>

            {/* ── Auto-Shutdown Watchdog Schedule Card ── */}
            <div className="bg-black/70 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)] rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                      Schedule Turn Off GPU Automatically if Not Used
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                      Quota Protection
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Automatically stops and terminates the Kaggle GPU container if no edits or API requests are made within the scheduled inactivity time window.
                  </p>
                </div>
              </div>

              {/* Master Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-900/80 border border-cyan-500/30 px-3 py-2 rounded-lg hover:border-cyan-400 transition">
                <input
                  type="checkbox"
                  checked={tempAutoShutdownEnabled}
                  onChange={(e) => setTempAutoShutdownEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded bg-black cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  Enable Automatic GPU Turn Off when Inactive
                </span>
              </label>

              {/* Checkbox Options Grid: 5, 10, 15, 30 minutes */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-cyan-300/80 uppercase tracking-wider">
                  Select Inactivity Duration (Minutes):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { m: 5, label: "5 Minutes", badge: "Default (Recommended)", isDefault: true, color: "text-emerald-300", desc: "Recommended default quota saver" },
                    { m: 10, label: "10 Minutes", badge: "Quick Edits", isDefault: false, color: "text-cyan-300", desc: "Turns off after 10m idle" },
                    { m: 15, label: "15 Minutes", badge: "Standard", isDefault: false, color: "text-cyan-300", desc: "Turns off after 15m idle" },
                    { m: 30, label: "30 Minutes", badge: "Extended Work", isDefault: false, color: "text-amber-300", desc: "Turns off after 30m idle" },
                  ].map((opt) => {
                    const isSelected = tempAutoShutdownEnabled && tempIdleTimeoutMinutes === opt.m;
                    return (
                      <label
                        key={opt.m}
                        className={`flex flex-col p-2.5 rounded-xl border cursor-pointer select-none transition-all relative overflow-hidden ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                            : "bg-slate-950/80 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80"
                        } ${!tempAutoShutdownEnabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <input
                            type="checkbox"
                            disabled={!tempAutoShutdownEnabled}
                            checked={isSelected}
                            onChange={() => {
                              setTempAutoShutdownEnabled(true);
                              setTempIdleTimeoutMinutes(opt.m);
                            }}
                            className="w-4 h-4 accent-cyan-400 rounded bg-black cursor-pointer"
                          />
                          <span className={`text-[10px] font-mono font-bold ${opt.color}`}>
                            {opt.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold text-white">
                            {opt.label}
                          </span>
                          {opt.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 rounded font-mono font-bold leading-none shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {opt.desc}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status and Active Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Active Schedule:</span>
                  <span className="font-mono font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    {autoShutdownEnabled ? `Auto-stop after ${idleTimeoutMinutes} minutes idle (Recommended Default: 5 min)` : "Disabled (Manual Stop Only)"}
                  </span>
                </div>
                {backendIdleStatus?.current_idle_seconds !== undefined && isConnected && (
                  <span className="text-[11px] font-mono text-cyan-400/80">
                    Current idle: {Math.round(backendIdleStatus.current_idle_seconds)}s
                  </span>
                )}
              </div>

              {/* Success Notification */}
              {idleSaveSuccessMessage && (
                <div className="bg-emerald-950/80 border border-emerald-500/80 px-3 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{idleSaveSuccessMessage}</span>
                </div>
              )}

              {/* Action Buttons: Emergency Halt, Cancel and Save */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleShutdownGpu}
                  disabled={isShuttingDown}
                  title="Immediately supersedes and deallocates any running or queued Kaggle GPU workers to fix rolling icons"
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/70 text-rose-200 rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition active:scale-95 disabled:opacity-50"
                >
                  <Power className={`w-3.5 h-3.5 ${isShuttingDown ? "animate-spin" : ""}`} />
                  <span>{isShuttingDown ? "Halting Kaggle..." : "Halt & Dismiss All Kaggle GPU Sessions"}</span>
                </button>
                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleCancelIdleTimeout}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIdleTimeout}
                    disabled={isSavingIdleTimeout}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-extrabold rounded-lg text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] transition active:scale-95 disabled:opacity-50"
                  >
                  {isSavingIdleTimeout ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ── MAIN CONTENT BY TAB ──────────────────────────────────── */}
      {activeTab === "generators" ? (
        <AiGeneratorHub
          onSendToStudio={(imageUrl, promptText) => {
            setOriginalImage(imageUrl);
            setEditedImage(null);
            if (promptText) setPrompt(promptText);
            setStudioMode("edit");
            setActiveTab("studio");
          }}
        />
      ) : activeTab === "loras" ? (
        <CivitaiLoraHub
          backendUrl={backendUrl}
          isConnected={isConnected}
          isModelReady={isModelReady}
          availableLoras={availableLoras}
          onLoraDownloaded={(name) => {
            if (backendUrl) fetchAvailableLoras(backendUrl);
          }}
          onSelectForStudio={handleSelectForStudio}
        />
      ) : activeTab === "gallery" ? (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                <ImageIcon className="w-5 h-5 text-cyan-400 animate-pulse" />
                Persistent Output Gallery
              </h2>
              <p className="text-xs text-cyan-300/80">All outputs auto-sync to Google Drive `AI_Storage/outputs/`</p>
            </div>
            <button
              onClick={() => setActiveTab("studio")}
              className="px-4 py-2 bg-slate-900 hover:bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)] transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back to Editor</span>
            </button>
          </div>

          {gallery.length === 0 ? (
            <div className="bg-black/60 border border-cyan-500/35 shadow-[0_0_25px_rgba(6,182,212,0.15)] rounded-3xl p-16 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-cyan-500/50 mx-auto animate-pulse" />
              <p className="text-sm font-bold text-white">No images generated in this session yet</p>
              <p className="text-xs text-slate-300">
                Uploaded images and edits are automatically mirrored to your 5 TB Google Drive Vault.
              </p>
              <button
                onClick={() => setActiveTab("studio")}
                className="mt-2 px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition active:scale-95"
              >
                Create First Edit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gallery.map((img, idx) => (
                <div
                  key={idx}
                  className="group bg-slate-950/90 border border-cyan-500/35 hover:border-cyan-400 rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all duration-300"
                >
                  <div className="aspect-square bg-black relative overflow-hidden">
                    <img src={img} alt={`Output ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="p-3 bg-slate-950 flex items-center justify-between gap-2 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-300/80">Creation #{gallery.length - idx}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setOriginalImage(img);
                          setEditedImage(null);
                          setActiveTab("studio");
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-semibold text-slate-200 hover:text-cyan-200 rounded-lg transition"
                        title="Send back to editor for iterative refinement"
                      >
                        Refine
                      </button>
                      <a
                        href={img}
                        download={`qwen_creation_${idx + 1}.png`}
                        className="p-1.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)] transition"
                        title="Download full quality PNG"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "sentinel" ? (
        <SentinelAiGateway />
      ) : (
        /* ── TWO-COLUMN STUDIO & LIVE CANVAS WORKSPACE ─────────────── */
        <StudioLayout
          controlPanel={
            <ControlPanel
              studioMode={studioMode}
              setStudioMode={setStudioMode}
              selectedStudioModel={selectedStudioModel}
              setSelectedStudioModel={setSelectedStudioModel}
              prompt={prompt}
              setPrompt={setPrompt}
              negativePrompt={negativePrompt}
              setNegativePrompt={setNegativePrompt}
              handleEnhancePrompt={handleEnhancePrompt}
              isEnhancingPrompt={isEnhancingPrompt}
              showToast={showToast}
              trueCfgScale={trueCfgScale}
              setTrueCfgScale={setTrueCfgScale}
              guidanceScale={guidanceScale}
              setGuidanceScale={setGuidanceScale}
              steps={steps}
              setSteps={setSteps}
              seed={seed}
              setSeed={setSeed}
              activeLoras={activeLoras}
              setActiveLoras={setActiveLoras}
              availableLoras={availableLoras}
              onOpenLoraModal={() => setIsLoraModalOpen(true)}
              handleFuseLora={handleFuseLora}
              handleUnloadLoras={handleUnloadLoras}
              isFusingLora={isFusingLora}
              fusedStatusMessage={fusedStatusMessage}
              isConnected={isConnected}
              isModelReady={isModelReady}
              modelStatusMessage={modelStatusMessage}
              handleGenerate={handleGenerate}
              isGenerating={isGenerating}
              originalImage={originalImage}
              generationStatusText={generationStatusText}
              generationProgress={generationProgress}
              generationElapsed={generationElapsed}
              onSwitchToCloud={() => {
                setIsGenerating(false);
                setSelectedStudioModel("nano-banana");
                setGenerationStatusText("");
              }}
            />
          }
          canvasWorkspace={
            <CanvasWorkspace
              originalImage={originalImage}
              editedImage={editedImage}
              studioMode={studioMode}
              onUploadImage={handleImageUpload}
              onSendResultToInput={() => {
                if (editedImage) {
                  setOriginalImage(editedImage);
                  setEditedImage(null);
                  showToast("Result sent to input for iterative refinement!", "success");
                }
              }}
              onMaskChange={setInpaintMask}
              fileInputRef={fileInputRef}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
            />
          }
          historyRibbon={
            <HistoryRibbon
              gallery={gallery}
              activeImage={editedImage || originalImage}
              onSelectImage={(img) => {
                setEditedImage(img);
                setViewMode("result");
              }}
              onSendToInput={(img) => {
                setOriginalImage(img);
                setEditedImage(null);
                showToast("Image sent to input for iterative refinement!", "success");
              }}
              onClearHistory={() => setGallery([])}
            />
          }
        />
      )}

      {/* Hidden LoRA File Input for Local Safetensors */}
      <input
        type="file"
        ref={localLoraInputRef}
        onChange={handleLocalLoraFileChange}
        accept=".safetensors"
        className="hidden"
      />

      {/* ── LoRA Studio & Multi-Stack Manager Modal ── */}
      <LoraModal
        isOpen={isLoraModalOpen}
        onClose={() => setIsLoraModalOpen(false)}
        availableLoras={availableLoras}
        activeLoras={activeLoras}
        onToggleLora={handleToggleLoraInStack}
        onUpdateLoraScale={handleUpdateLoraScale}
        onInjectTriggers={handleInjectTriggers}
        onFuseLoras={() => handleFuseLora(activeLoras)}
        onUnloadLoras={handleUnloadLoras}
        isFusing={isFusingLora}
        isModelReady={isModelReady}
        isConnected={isConnected}
        onBrowseLocal={() => localLoraInputRef.current?.click()}
        isUploadingLocal={isUploadingLocalLora}
        uploadProgress={uploadProgress}
        civitaiUrl={civitaiUrl}
        setCivitaiUrl={setCivitaiUrl}
        loraCustomName={loraCustomName}
        setLoraCustomName={setLoraCustomName}
        onQuickDownload={handleQuickDownloadLora}
        isDownloading={isDownloadingLora}
        onOpenCivitaiHub={() => {
          setIsLoraModalOpen(false);
          setActiveTab("loras");
        }}
      />

      {/* ── Agentic AI Health Guardian Floating Modal & Doctor ── */}
      <AgenticHealthGuardianModal
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTurnOnGpu={() => handleStartGpu()}
        showToast={showToast}
        onApplyPromptToStudio={(newPrompt, newNegative) => {
          setPrompt(newPrompt);
          if (newNegative) setNegativePrompt(newNegative);
          setActiveTab("studio");
        }}
      />

      {/* ── Strict NSFW Blocked by Admin Modal ── */}
      <NsfwBlockedModal onOpenSettings={() => setShowAdvancedUrl(true)} />

      {/* ── Floating Toast Notification Banner ── */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-xl animate-fadeIn ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20"
              : toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-500/20"
              : "bg-cyan-950/90 border-cyan-500/50 text-cyan-200 shadow-cyan-500/20"
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
