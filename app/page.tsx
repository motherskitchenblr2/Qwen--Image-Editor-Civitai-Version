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
} from "lucide-react";
import CivitaiLoraHub from "./components/CivitaiLoraHub";
import SentinelAiGateway from "./components/SentinelAiGateway";
import AiGeneratorHub from "./components/AiGeneratorHub";

interface LoRAItem {
  name: string;
  scale: number;
}

interface BackendLoRA {
  name: string;
  filename: string;
  size_mb: number;
  is_active: boolean;
  scale?: number;
  trigger_words?: string;
}

export default function ImageEditorStudio() {
  // Navigation Tabs: Studio & Editor | AI Generator Hub | Civitai.red LoRA Hub | Outputs Gallery | Sentinel Gateway
  const [activeTab, setActiveTab] = useState<"studio" | "generators" | "loras" | "gallery" | "sentinel">("studio");
  const [studioMode, setStudioMode] = useState<"edit" | "generate">("edit");
  const [selectedStudioModel, setSelectedStudioModel] = useState<"kaggle-gpu" | "qwen-cloud" | "nano-banana" | "google-imagen" | "cf-lucid" | "cf-flux">("kaggle-gpu");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);

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
  const [negativePrompt, setNegativePrompt] = useState<string>("blurry, distorted, low quality, deformed, artifacts");
  const [trueCfgScale, setTrueCfgScale] = useState<number>(1.0);
  const [guidanceScale, setGuidanceScale] = useState<number>(1.0);
  const [steps, setSteps] = useState<number>(4);
  const [seed, setSeed] = useState<number | "">("");
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);

  // LoRA states
  const [availableLoras, setAvailableLoras] = useState<BackendLoRA[]>([]);
  const [activeLoras, setActiveLoras] = useState<LoRAItem[]>([]);
  const [selectedDropdownLora, setSelectedDropdownLora] = useState<string>("");
  const [isFusingLora, setIsFusingLora] = useState<boolean>(false);
  const [fusedStatusMessage, setFusedStatusMessage] = useState<string>("");

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localLoraInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLocalLora, setIsUploadingLocalLora] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Auto-discover live backend from Google Drive & Vercel Registry
  const autoDiscoverBackend = async () => {
    try {
      const res = await fetch("/api/tunnel", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.is_alive && data.url) {
          const cleanUrl = data.url.replace(/\/+$/, "");
          setBackendUrl(cleanUrl);
          setIsConnected(true);
          setIsStartingGpu(false);
          setBootMessage("");
          localStorage.setItem("qwen_backend_url", cleanUrl);
          checkBackend(cleanUrl);
          return cleanUrl;
        }
      }
    } catch (e) {
      console.warn("Auto-discovery check:", e);
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
        checkBackend(cleanSaved);
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
      if (!isConnected) {
        autoDiscoverBackend();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const checkBackend = async (urlToCheck?: string) => {
    const target = urlToCheck || backendUrl;
    if (!target) return;
    setIsCheckingHealth(true);
    try {
      const cleanUrl = target.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setIsConnected(true);
        const ready = Boolean(data.model_ready);
        setIsModelReady(ready);
        setModelStatusMessage(data.message || (ready ? "Model ready on Dual T4 GPUs" : "Warming up pipeline in GPU VRAM..."));
        setVramStats(data.vram);
        localStorage.setItem("qwen_backend_url", cleanUrl);
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
      } else {
        setIsConnected(false);
        setIsModelReady(false);
      }
    } catch {
      setIsConnected(false);
      setIsModelReady(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleStartGpu = async () => {
    setIsStartingGpu(true);
    setBootMessage("Triggering Kaggle Dual Tesla T4 GPU boot sequence...");
    try {
      const res = await fetch("/api/backend/start", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBootMessage("Kaggle booting Dual T4s (~90s)... Auto-connecting when ready.");
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
    if (!backendUrl) return;
    if (!confirm("Are you sure you want to stop the Kaggle GPU backend? This will deallocate the GPU instance immediately to protect your quota.")) {
      return;
    }
    setIsShuttingDown(true);
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      await fetch(`${cleanUrl}/api/shutdown`, { method: "POST" });
      setIsConnected(false);
      setBackendUrl("");
      localStorage.removeItem("qwen_backend_url");
      alert("✅ Kaggle GPU backend terminated! GPU instance deallocated immediately.");
    } catch {
      setIsConnected(false);
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
    setIsEnhancingPrompt(true);
    try {
      const activeCopilot = localStorage.getItem("sentinel_active_copilot") || "gemini";

      const res = await fetch("/api/sentinel/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: activeCopilot,
        }),
      });

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
      alert("Kaggle Dual Tesla T4 GPU backend is currently offline. Please turn on the GPU first to upload your local LoRA into the storage vault.");
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
      setFusedStatusMessage(`✅ ${Object.keys(data.active_loras || {}).length} LoRA(s) fused into GPU VRAM!`);
      setTimeout(() => setFusedStatusMessage(""), 5000);
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
      setActiveLoras((prev) => [...prev, { name: lora.name, scale: 0.8 }]);
    }

    if (triggerWords && triggerWords.length > 0) {
      const words = triggerWords.join(", ");
      if (!prompt.includes(words)) {
        setPrompt((prev) => `${prev}, ${words}`);
      }
    }

    setActiveTab("studio");
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
          async_mode: true,
        };

        const res = await fetch(`${cleanUrl}/api/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Request failed");
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
              const statusRes = await fetch(`${cleanUrl}/api/edit/status/${data.task_id}`);
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
                  const pct = totalSt > 0 ? Math.round((currSt / totalSt) * 100) : (statusData.progress || 0);
                  setGenerationProgress(pct);
                  setGenerationStep(currSt);
                  setTotalGenerationSteps(totalSt);
                  if (totalSt <= 4) {
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
        // Cloud API Engine: Nano Banana Turbo, Alibaba Qwen Cloud, Google Imagen 3, Cloudflare Workers AI
        setGenerationStatusText(
          selectedStudioModel === "nano-banana"
            ? "⚡ Synthesizing with Nano Banana Turbo (~1.5s)..."
            : selectedStudioModel === "google-imagen"
            ? "Synthesizing with Google Imagen 3 (AI Studio)..."
            : selectedStudioModel === "qwen-cloud"
            ? `Synthesizing with Alibaba ${studioMode === "edit" ? "qwen-image-edit" : "qwen-image"}...`
            : "Synthesizing with Cloudflare Workers AI (~3s)..."
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
            : "nano-banana";

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            negative_prompt: negativePrompt,
            model: targetCloudModel,
            mode: studioMode,
            image_base64: studioMode === "edit" ? originalImage : undefined,
            seed: seed === "" ? null : Number(seed),
          }),
        });

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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-3 sm:px-6 py-2.5 lg:py-3 sticky top-0 z-50 shadow-md w-full max-w-full">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-2.5 lg:gap-4 w-full">
          {/* Top Row on Mobile: Brand on Left, Quick GPU Controls on Right */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-cyan-500 to-indigo-500 p-2 rounded-xl text-black shadow-lg shadow-cyan-500/25 shrink-0">
                <Sparkles className="w-4 h-4 fill-black" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base lg:text-lg leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Qwen Image Editor Studio
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Dual Tesla T4 &bull; 5 TB Google Drive Vault</p>
              </div>
            </div>

            {/* Mobile GPU Power Toggle Button (Right side on mobile only) */}
            <div className="flex items-center gap-1.5 lg:hidden shrink-0">
              {isConnected ? (
                <div className="flex items-center gap-1.5">
                  <span
                    title={modelStatusMessage}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      isModelReady
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isModelReady ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
                    <span>{isModelReady ? "Ready" : "Warming..."}</span>
                  </span>
                  <button
                    onClick={handleShutdownGpu}
                    disabled={isShuttingDown}
                    title="Turn off GPU"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition"
                  >
                    <Power className={`w-3 h-3 ${isShuttingDown ? "animate-spin" : ""}`} />
                    <span>Stop</span>
                  </button>
                </div>
              ) : isStartingGpu ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-semibold animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Booting...</span>
                </span>
              ) : (
                <button
                  onClick={handleStartGpu}
                  title="Boot Kaggle GPU"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg text-[11px] font-bold shadow-sm transition"
                >
                  <Zap className="w-3 h-3 fill-slate-950" />
                  <span>Start GPU</span>
                </button>
              )}
              <button
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Switcher Navigation - Full width with clean horizontal swipe on mobile, center on desktop */}
          <div className="w-full lg:w-auto overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/90 p-1 sm:p-1.5 rounded-2xl border border-slate-800/80 shadow-inner w-max mx-auto lg:mx-0">
              <button
                onClick={() => setActiveTab("studio")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  activeTab === "studio"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Studio &amp; Editor</span>
              </button>
              <button
                onClick={() => setActiveTab("generators")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  activeTab === "generators"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>AI Generators</span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 rounded-full text-[9px] text-amber-300 font-bold">
                  NEW
                </span>
              </button>
              <button
                onClick={() => setActiveTab("loras")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  activeTab === "loras"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Civitai LoRA Hub</span>
                {availableLoras.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-700/80 rounded-full text-[10px] text-cyan-300 font-mono font-bold">
                    {availableLoras.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("gallery")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  activeTab === "gallery"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Gallery</span>
                {gallery.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-700/80 rounded-full text-[10px] text-slate-300 font-mono">
                    {gallery.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("sentinel")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  activeTab === "sentinel"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Sentinel</span>
              </button>
            </div>
          </div>

          {/* Desktop GPU 1-Click Power Hub (Hidden on mobile, visible on desktop) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {/* Status Badge */}
            <div
              title={isConnected ? modelStatusMessage : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition ${
                isConnected
                  ? isModelReady
                    ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-300 shadow-sm shadow-emerald-900/20"
                    : "bg-amber-950/60 border-amber-700/80 text-amber-300 animate-pulse"
                  : isStartingGpu
                  ? "bg-amber-950/60 border-amber-700/80 text-amber-300 animate-pulse"
                  : "bg-slate-900/80 border-slate-800 text-slate-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? isModelReady
                      ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                      : "bg-amber-400 animate-ping"
                    : isStartingGpu
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span>
                {isConnected
                  ? isModelReady
                    ? "Dual Tesla T4 Ready"
                    : "Dual T4 Warming Up (~60s)"
                  : isStartingGpu
                  ? "Booting Kaggle GPU..."
                  : "GPU Offline (Quota Safe)"}
              </span>
            </div>

            {/* 1-Click Power Toggle */}
            {isConnected ? (
              <button
                onClick={handleShutdownGpu}
                disabled={isShuttingDown}
                title="Stop Kaggle GPU immediately to prevent burning quota"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-900/30 transition active:scale-95 disabled:opacity-50"
              >
                <Power className={`w-3.5 h-3.5 ${isShuttingDown ? "animate-spin" : ""}`} />
                <span>{isShuttingDown ? "Stopping GPU..." : "Turn Off GPU"}</span>
              </button>
            ) : isStartingGpu ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Booting Dual T4s (~90s)...</span>
              </button>
            ) : (
              <button
                onClick={handleStartGpu}
                title="One-click boot Kaggle Dual Tesla T4s and auto-connect tunnel"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Turn On GPU</span>
              </button>
            )}

            {/* Advanced / Manual URL Override Toggle */}
            <button
              onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
              title="Advanced: Inspect or override tunnel URL"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Storage Badge */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Vault:</span>
              <span className="text-slate-200 font-medium">5.0 TiB Google Drive</span>
            </div>
          </div>
        </div>
      </header>

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
        <div className="bg-slate-900/98 border-b border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] px-6 py-5 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Settings: GPU Configuration Card
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure backend ingress and schedule automatic GPU shutdown to preserve your quota.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelIdleTimeout}
                className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-md hover:bg-slate-800 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Ingress Link Connection */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Cloudflare Tunnel Ingress URL
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  isConnected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
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
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
                <button
                  onClick={() => checkBackend()}
                  disabled={isCheckingHealth}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? "animate-spin" : ""}`} />
                  Verify Link
                </button>
              </div>
            </div>

            {/* ── Auto-Shutdown Watchdog Schedule Card ── */}
            <div className="bg-gradient-to-br from-slate-950/90 to-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Schedule Turn Off GPU Automatically if Not Used
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Quota Protection
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically stops and terminates the Kaggle GPU container if no edits or API requests are made within the scheduled inactivity time window.
                  </p>
                </div>
              </div>

              {/* Master Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-lg hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={tempAutoShutdownEnabled}
                  onChange={(e) => setTempAutoShutdownEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded bg-slate-950 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Enable Automatic GPU Turn Off when Inactive
                </span>
              </label>

              {/* Checkbox Options Grid: 5, 10, 15, 30 minutes */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Inactivity Duration (Minutes):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { m: 5, label: "5 Minutes", badge: "Default (Recommended)", isDefault: true, color: "text-emerald-400", desc: "Recommended default quota saver" },
                    { m: 10, label: "10 Minutes", badge: "Quick Edits", isDefault: false, color: "text-cyan-400", desc: "Turns off after 10m idle" },
                    { m: 15, label: "15 Minutes", badge: "Standard", isDefault: false, color: "text-cyan-300", desc: "Turns off after 15m idle" },
                    { m: 30, label: "30 Minutes", badge: "Extended Work", isDefault: false, color: "text-amber-400", desc: "Turns off after 30m idle" },
                  ].map((opt) => {
                    const isSelected = tempAutoShutdownEnabled && tempIdleTimeoutMinutes === opt.m;
                    return (
                      <label
                        key={opt.m}
                        className={`flex flex-col p-2.5 rounded-xl border cursor-pointer select-none transition-all relative overflow-hidden ${
                          isSelected
                            ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                            : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
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
                            className="w-4 h-4 accent-cyan-500 rounded bg-slate-900 cursor-pointer"
                          />
                          <span className={`text-[10px] font-mono font-bold ${opt.color}`}>
                            {opt.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold text-slate-200">
                            {opt.label}
                          </span>
                          {opt.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono font-bold leading-none">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {opt.desc}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status and Active Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Active Schedule:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {autoShutdownEnabled ? `Auto-stop after ${idleTimeoutMinutes} minutes idle (Recommended Default: 5 min)` : "Disabled (Manual Stop Only)"}
                  </span>
                </div>
                {backendIdleStatus?.current_idle_seconds !== undefined && isConnected && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Current idle: {Math.round(backendIdleStatus.current_idle_seconds)}s
                  </span>
                )}
              </div>

              {/* Success Notification */}
              {idleSaveSuccessMessage && (
                <div className="bg-emerald-950/80 border border-emerald-600/60 px-3 py-2 rounded-lg text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{idleSaveSuccessMessage}</span>
                </div>
              )}

              {/* Action Buttons: Cancel and Save */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleCancelIdleTimeout}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIdleTimeout}
                  disabled={isSavingIdleTimeout}
                  className="flex items-center gap-1.5 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
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
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                Persistent Output Gallery
              </h2>
              <p className="text-xs text-slate-400">All outputs auto-sync to Google Drive `AI_Storage/outputs/`</p>
            </div>
            <button
              onClick={() => setActiveTab("studio")}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back to Editor</span>
            </button>
          </div>

          {gallery.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-16 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No images generated in this session yet</p>
              <p className="text-xs text-slate-500">
                Uploaded images and edits are automatically mirrored to your 5 TB Google Drive Vault.
              </p>
              <button
                onClick={() => setActiveTab("studio")}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-black font-bold text-xs rounded-xl transition"
              >
                Create First Edit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gallery.map((img, idx) => (
                <div
                  key={idx}
                  className="group bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-cyan-500/40 transition shadow-lg"
                >
                  <div className="aspect-square bg-slate-950 relative overflow-hidden">
                    <img src={img} alt={`Output ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="p-3 bg-slate-900/90 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">Creation #{gallery.length - idx}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setOriginalImage(img);
                          setEditedImage(null);
                          setActiveTab("studio");
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 rounded-lg transition"
                        title="Send back to editor for iterative refinement"
                      >
                        Refine
                      </button>
                      <a
                        href={img}
                        download={`qwen_creation_${idx + 1}.png`}
                        className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition"
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
        /* ── STUDIO & EDITOR TAB ───────────────────────────────── */
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full max-w-full overflow-hidden animate-fadeIn">
          {/* Left: Input & Tuning Panel (4 cols) */}
          <section className="lg:col-span-4 flex flex-col gap-4 sm:gap-5 bg-slate-900/40 border border-slate-800/80 p-3.5 sm:p-5 rounded-2xl w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Sliders className="w-4 h-4 text-cyan-400" /> Generation Settings
              </span>
            </div>

            {/* ── Mode Selection: Equal-Sized Buttons in One Line (UI-UX-PRO-MAX) ── */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full">
              <button
                type="button"
                onClick={() => setStudioMode("generate")}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  studioMode === "generate"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>🎨 Generate</span>
                <span className="hidden sm:inline"> Image</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioMode("edit")}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  studioMode === "edit"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>✨ Edit</span>
                <span className="hidden sm:inline"> Image</span>
              </button>
            </div>

            {/* ── AI Engine Model Selector ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  AI Engine Model
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {selectedStudioModel === "nano-banana" ? "⚡ Sub-2s" : selectedStudioModel === "kaggle-gpu" ? "Dual T4s" : "Cloud API"}
                </span>
              </div>
              <select
                value={selectedStudioModel}
                onChange={(e) => setSelectedStudioModel(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 h-9 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="kaggle-gpu">Dual Tesla T4 (Kaggle GPU + LoRA Vault)</option>
                <option value="qwen-cloud">Alibaba Qwen Cloud ({studioMode === "generate" ? "qwen-image" : "qwen-image-edit"})</option>
                <option value="nano-banana">⚡ Nano Banana Turbo (~1.5s Ultra-Fast)</option>
                <option value="google-imagen">Google Imagen 3 (Google AI Studio)</option>
                <option value="cf-lucid">Cloudflare Lucid Origin (~3s Edge)</option>
                <option value="cf-flux">Cloudflare Flux 1 Schnell (~3.5s DiT)</option>
              </select>
            </div>

            {/* Edit / Generation Instruction Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  {studioMode === "generate" ? "Generation Prompt" : "Edit Prompt"}
                </label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancingPrompt || !prompt.trim()}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-0.5 rounded-lg transition active:scale-95 disabled:opacity-40"
                  title="Enhance prompt with active Sentinel AI copilot"
                >
                  <Sparkles className={`w-3 h-3 ${isEnhancingPrompt ? "animate-spin text-cyan-400" : "fill-cyan-400"}`} />
                  <span>{isEnhancingPrompt ? "Enhancing..." : "⚡ AI Enhance"}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Turn the jacket into red leather, add cyberpunk neon highlights"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Negative Prompt</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* ── LoRA Selection Dropdown & Dynamic GPU Fusing Hub ── */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
              <input
                type="file"
                ref={localLoraInputRef}
                onChange={handleLocalLoraFileChange}
                accept=".safetensors"
                className="hidden"
              />

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  LoRA Model Dropdown
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => localLoraInputRef.current?.click()}
                    disabled={isUploadingLocalLora || !isConnected}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition font-medium disabled:opacity-40"
                    title="Upload and fuse a locally downloaded .safetensors LoRA"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Browse Locally</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("loras")}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition font-medium"
                    title="Explore Civitai LoRAs"
                  >
                    <span>Civitai Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Upload Progress Indicator */}
              {isUploadingLocalLora && (
                <div className="p-2.5 rounded-xl border border-emerald-800/80 bg-emerald-950/70 text-xs text-emerald-200 flex flex-col gap-1.5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Uploading Local LoRA to GPU Storage...
                    </span>
                    <span className="font-mono font-bold text-emerald-300">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* LoRA Dropdown Selector */}
              <div className="relative">
                <select
                  value={selectedDropdownLora}
                  onChange={(e) => handleSelectLoraFromDropdown(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="">
                    {availableLoras.length === 0
                      ? "-- No LoRAs in Vault (Click Browse Locally / Hub) --"
                      : `-- Select LoRA to Fuse into GPU (${availableLoras.length} Available) --`}
                  </option>
                  {availableLoras.map((lora) => (
                    <option key={lora.filename} value={lora.filename}>
                      {lora.name} ({lora.size_mb} MB) {lora.is_active ? "⚡ [ACTIVE IN VRAM]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fusing Status / Live Animation Message */}
              {fusedStatusMessage && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    isFusingLora
                      ? "bg-cyan-950/70 border-cyan-800/80 text-cyan-200 animate-pulse"
                      : "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                  }`}
                >
                  {isFusingLora ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{fusedStatusMessage}</span>
                </div>
              )}

              {/* Active LoRA Cards */}
              {activeLoras.length > 0 && (
                <div className="space-y-2 mt-1">
                  {activeLoras.map((lora, idx) => (
                    <div key={idx} className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 truncate max-w-[180px]">{lora.name}</span>
                        <button
                          onClick={() => setActiveLoras((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Remove from stack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Scale / Weight:</span>
                        <span className="text-cyan-400 font-mono font-semibold">{lora.scale}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={lora.scale}
                        onChange={(e) => {
                          const newScale = parseFloat(e.target.value);
                          setActiveLoras((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, scale: newScale } : item))
                          );
                        }}
                        className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}

                  {/* Actions for Selected LoRAs */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleFuseLora(activeLoras)}
                      disabled={isFusingLora || !isConnected || !isModelReady}
                      title={!isModelReady && isConnected ? `GPU pipeline is warming up: ${modelStatusMessage}` : "Fuse selected LoRA into GPU"}
                      className="flex-1 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-bold rounded-lg transition shadow-md shadow-cyan-500/10 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                    >
                      {isFusingLora ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : !isModelReady && isConnected ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-black" />
                      )}
                      <span>
                        {isFusingLora
                          ? "Fusing..."
                          : !isModelReady && isConnected
                          ? "Warming Up..."
                          : "Fuse into GPU"}
                      </span>
                    </button>
                    <button
                      onClick={handleUnloadLoras}
                      disabled={isFusingLora || !isConnected}
                      title="Unload all LoRAs from GPU"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sliders: True-CFG, Guidance, Steps */}
            <div className="space-y-4 pt-2 border-t border-slate-800/60">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Qwen True-CFG Scale</span>
                  <span className="font-semibold text-cyan-400">{trueCfgScale}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.5"
                  value={trueCfgScale}
                  onChange={(e) => setTrueCfgScale(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Guidance Scale</span>
                  <span className="font-semibold text-cyan-400">{guidanceScale}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Inference Steps</span>
                  <div className="flex items-center gap-1.5">
                    {steps === 4 && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
                        ⚡ Rapid (13-25s)
                      </span>
                    )}
                    <span className="font-semibold text-cyan-400">{steps}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                {/* Step Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[
                    { s: 4, label: "⚡ 4 Steps", sub: "15-25s" },
                    { s: 6, label: "6 Steps", sub: "Balanced" },
                    { s: 8, label: "8 Steps", sub: "High" },
                    { s: 12, label: "12 Steps", sub: "Max" },
                  ].map((preset) => (
                    <button
                      key={preset.s}
                      type="button"
                      onClick={() => setSteps(preset.s)}
                      className={`py-1 px-1 rounded text-center border transition-all ${
                        steps === preset.s
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                          : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-[11px] font-semibold leading-tight">{preset.label}</div>
                      <div className="text-[9px] text-slate-500 leading-tight">{preset.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="text-xs text-slate-300">Seed</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300 transition"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>

            {/* ── Action Buttons Row: Smaller, Equal-Sized Consistency (UI-UX-PRO-MAX) ── */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  (selectedStudioModel === "kaggle-gpu" && (!originalImage || !isConnected)) ||
                  (studioMode === "edit" && !originalImage && selectedStudioModel !== "kaggle-gpu")
                }
                className={`flex-1 h-9 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md ${
                  isGenerating ||
                  (selectedStudioModel === "kaggle-gpu" && (!originalImage || !isConnected)) ||
                  (studioMode === "edit" && !originalImage && selectedStudioModel !== "kaggle-gpu")
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 text-black hover:opacity-95 shadow-cyan-500/25"
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : studioMode === "generate" ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span>Generate Image</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Apply Image Edit</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancingPrompt || !prompt.trim()}
                title="AI Enhance Prompt"
                className="h-9 px-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isEnhancingPrompt ? "animate-spin text-cyan-400" : "fill-cyan-400"}`} />
                <span>{isEnhancingPrompt ? "..." : "Enhance"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                title="Randomize seed"
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <span>🎲</span>
                <span>Seed</span>
              </button>
            </div>

            {/* Progress Bar & Status */}
            {isGenerating && (
              <div className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-400 font-medium truncate max-w-[200px]">{generationStatusText}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-[11px] font-mono">{generationElapsed}s</span>
                    <span className="text-slate-300 font-mono font-semibold">{generationProgress}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(4, Math.min(100, generationProgress))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{steps <= 4 ? "⚡ Rapid 4-Step Pipeline (~15-25s)" : "Standard DiT Pipeline"}</span>
                  <span>{generationElapsed > 0 ? `${generationElapsed}s elapsed` : "Starting..."}</span>
                </div>
              </div>
            )}
          </section>

          {/* Center: Canvas & Image Comparison (5 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/80 px-4 py-2.5 rounded-xl">
              <span className="text-xs font-semibold text-slate-300">Canvas Preview</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode("result")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                    viewMode === "result" ? "bg-cyan-500 text-black shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Result
                </button>
                <button
                  onClick={() => setViewMode("original")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                    viewMode === "original" ? "bg-cyan-500 text-black shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Original
                </button>
              </div>
            </div>

            {/* Main Visual Display */}
            <div className="flex-1 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden group">
              {viewMode === "result" && editedImage ? (
                <img src={editedImage} alt="Edited result" className="max-h-[460px] w-auto object-contain rounded-xl shadow-2xl" />
              ) : originalImage ? (
                <img src={originalImage} alt="Source upload" className="max-h-[460px] w-auto object-contain rounded-xl shadow-2xl" />
              ) : studioMode === "generate" ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center max-w-sm">
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 shadow-lg shadow-cyan-500/10">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Text-to-Image Generation Mode</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Type your creative prompt and click &quot;Generate Image&quot; below. No source image required!
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition"
                >
                  <div className="p-4 bg-slate-900 rounded-full text-slate-400 group-hover:text-cyan-400 transition">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-200">Upload source image</p>
                    <p className="text-xs text-slate-500 mt-0.5">PNG, JPG or WebP (max 10MB)</p>
                  </div>
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

              {/* Quick Actions overlay */}
              {editedImage && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
                  <a
                    href={editedImage}
                    download="qwen_masterpiece.png"
                    className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Right: LoRA Vault & Quick Downloader (3 cols) */}
          <section className="lg:col-span-3 flex flex-col gap-5 bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Database className="w-4 h-4 text-cyan-400" /> Vault LoRAs ({availableLoras.length})
              </span>
              <button
                onClick={() => setActiveTab("loras")}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Browse Hub &rarr;
              </button>
            </div>

            {/* Browse & Upload Local LoRA */}
            <button
              onClick={() => localLoraInputRef.current?.click()}
              disabled={isUploadingLocalLora || !isConnected}
              className="w-full py-2 px-3 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2 transition shadow-sm active:scale-95 disabled:opacity-40"
              title="Upload a .safetensors LoRA from local storage to Vault"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browse Local LoRA (.safetensors)</span>
            </button>

            {/* Quick Civitai URL Downloader */}
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-xs font-medium text-slate-300">Quick URL Download</span>
              <input
                type="text"
                placeholder="Paste Civitai / Civitai.red URL or ID"
                value={civitaiUrl}
                onChange={(e) => setCivitaiUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="Custom Name (optional)"
                value={loraCustomName}
                onChange={(e) => setLoraCustomName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                onClick={handleQuickDownloadLora}
                disabled={!civitaiUrl || !isConnected || isDownloadingLora}
                className={`w-full py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  !civitaiUrl || !isConnected || isDownloadingLora
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold"
                }`}
              >
                {isDownloadingLora ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download to Google Drive
              </button>
            </div>

            {/* Downloaded LoRAs in Vault */}
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Google Drive Cached LoRAs
              </span>
              {availableLoras.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-slate-800 rounded-xl space-y-2">
                  <Layers className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500">No LoRAs in Vault yet.</p>
                  <button
                    onClick={() => setActiveTab("loras")}
                    className="text-xs text-cyan-400 hover:underline font-medium"
                  >
                    Open Civitai.red Hub &rarr;
                  </button>
                </div>
              ) : (
                availableLoras.map((lora, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl space-y-1.5 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate max-w-[150px]">{lora.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{lora.size_mb} MB</span>
                    </div>

                    {lora.trigger_words && (
                      <p className="text-[10px] text-cyan-400/80 truncate font-mono">
                        Trigger: {lora.trigger_words}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleSelectLoraFromDropdown(lora.filename)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg font-medium transition"
                      >
                        + Add to Stack
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
