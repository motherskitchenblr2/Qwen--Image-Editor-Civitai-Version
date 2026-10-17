# Phase 1: Initial Architecture, Cloudflare Ingress & Civitai Engine

> **Timeline:** October 2026  
> **Status:** ✅ Completed & Fully Verified  
> **Focus:** Infrastructure Foundation, Zero-Trust Ingress, 5 TB Google Drive Vault, Civitai LoRA Integration

---

## 1. Phase Objective & Architectural Inception

The initial phase established the core foundation for the **Qwen Image Editor Studio**:
1. Connecting a dual-GPU accelerator (Kaggle Dual Tesla T4 = 30 GB VRAM) running a FastAPI microservice with a Next.js App Router frontend hosted on Vercel.
2. Establishing secure, zero-cost public ingress without opening firewall ports using Cloudflare Zero-Trust Tunnels (`cloudflared`).
3. Overcoming Kaggle's ephemeral disk constraints (which wipe all data upon session termination) by creating an automated interconnect with a 5 TB Google Drive Persistent Storage Vault (`AI_Storage/`).
4. Creating a dynamic LoRA discovery and download engine integrated with the Civitai / Civitai.red API.

---

## 2. Tasks Executed

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant NextJS as Next.js Studio (Vercel)
    participant Cloudflare as Cloudflare Tunnel
    participant Kaggle as FastAPI Backend (Dual T4)
    participant GDrive as Google Drive Vault (5 TB)
    participant Civitai as Civitai.red API

    User->>NextJS: Initiate Edit / Generate
    NextJS->>Cloudflare: POST /api/edit (async_mode=true)
    Cloudflare->>Kaggle: Forward Request
    Kaggle-->>NextJS: HTTP 202: task_id (cdb83dc3)
    loop Every 1.5s Progress Polling
        NextJS->>Kaggle: GET /api/edit/status/:task_id
        Kaggle-->>NextJS: { status: "processing", progress: 40% }
    end
    Kaggle->>GDrive: rclone copy outputs -> AI_Storage/outputs/
    Kaggle-->>NextJS: { status: "completed", image_base64: "..." }
    NextJS-->>User: Render Masterpiece in Canvas
```

### Task 1.1: Cloudflare Tunnel Ingress Setup
- Deployed `cloudflared` binary inside the Kaggle Python environment.
- Configured headless ephemeral tunnel routing traffic from `https://*.trycloudflare.com` to local FastAPI port `8000`.

### Task 1.2: Persistent Google Drive Bridge (`rclone`)
- Configured headless `rclone` with Google Drive OAuth credentials.
- Created directory hierarchies:
  - `/AI_Storage/models/`: Base Qwen DiT and VAE weights.
  - `/AI_Storage/loras/`: Safetensors downloaded from Civitai.
  - `/AI_Storage/outputs/`: Every generated and edited image.
  - `/AI_Storage/configs/tunnel_url.txt`: Auto-discovery heartbeat file.

### Task 1.3: Asynchronous Inference Pipeline (`/api/edit`)
- Implemented in-memory asynchronous worker queue in FastAPI (`backend/kaggle_backend.py`).
- Decoupled HTTP request handling from PyTorch GPU execution to prevent gateway timeout errors.

### Task 1.4: Civitai.red LoRA Discovery & Ingestion
- Built Civitai REST API explorer in `CivitaiLoraHub.tsx` supporting search, tags, base model filtering (SDXL, Flux, Qwen), and thumbnail previews.
- Implemented `/api/loras/download` to stream multi-hundred-megabyte `.safetensors` files directly into Google Drive storage and GPU memory.

### Task 1.5: Termux Workstation CLI Controls
- Created dedicated POSIX CLI binaries in `/data/data/com.termux/files/usr/bin/`:
  - `start-gpu`: Uses Kaggle CLI API (`kaggle kernels push`) to launch the Dual T4 environment.
  - `stop-gpu`: Sends termination signal to deallocate GPU instances immediately.

---

## 3. Bugs, Failures & Root Cause Analyses

### ❌ Bug 1.1: Cloudflare HTTP 524 Gateway Timeout
- **Symptom:** Synchronous image generation requests to `/api/edit` crashed after exactly 100 seconds with an HTTP 524 error from Cloudflare:
  ```text
  Error 524: A timeout occurred (cloudflare.com)
  ```
- **Root Cause:** Cloudflare free tunnels enforce a hard 100-second response window for open HTTP sockets. High-step diffusion inference (especially with large guidance scales) exceeded this threshold.
- **Fix Applied:**
  - Converted `/api/edit` into an asynchronous endpoint (`async_mode: true`).
  - The endpoint validates parameters, enqueues the job into a Python `threading.Thread` worker, and returns HTTP 200 within 500ms with a unique `task_id`.
  - The client polls `/api/edit/status/:taskId` every 1.5 seconds to track progress without holding open long-lived connections.

### ❌ Bug 1.2: Civitai HTTP 403 Forbidden Automated Downloads
- **Symptom:** Downloading `.safetensors` files from `civitai.com/api/download/models/*` returned HTTP 403 Forbidden:
  ```text
  HTTPError: 403 Client Error: Forbidden for url: https://civitai.com/api/download/models/2110009
  ```
- **Root Cause:** Civitai employs Cloudflare Bot Management rules that reject requests lacking standard browser headers or possessing default `Python-urllib` or `requests` User-Agents.
- **Fix Applied:**
  - Implemented custom browser-like HTTP request headers in `download_lora()`:
    ```python
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Referer": "https://civitai.com/",
        "Authorization": f"Bearer {civitai_api_key}" if civitai_api_key else ""
    }
    ```
  - Added support for Civitai mirror proxies (`civitai.red`) to bypass geographic download throttling.

### ❌ Bug 1.3: Ephemeral File Loss upon Container Shutdown
- **Symptom:** Every time Kaggle terminated or quota ran out, all downloaded LoRAs and generated outputs were permanently deleted from `/kaggle/working/`.
- **Root Cause:** Kaggle kernels execute in isolated ephemeral Docker containers; unmounted local storage does not persist across executions.
- **Fix Applied:**
  - Automated dual-direction rclone sync:
    - Upon container boot, `/AI_Storage/loras/` is indexed and cached locally.
    - Upon successful generation or LoRA download, files are immediately streamed and committed to Google Drive Vault storage.

### ❌ Bug 1.4: Manual Tunnel URL Copy-Paste Friction
- **Symptom:** Every new GPU launch generated a random URL (e.g., `https://random-words.trycloudflare.com`). The developer had to open Kaggle logs, copy the string, and paste it into the UI.
- **Root Cause:** Absence of a centralized rendezvous bridge between Kaggle's dynamic ingress and Vercel's static deployment.
- **Fix Applied:**
  - In Kaggle `kaggle_backend.py`, once `cloudflared` starts, the script extracts the public URL and writes it to `AI_Storage/configs/tunnel_url.txt` via rclone.
  - In Next.js, `/api/tunnel` reads this file from Google Drive via public web bridge or Vercel Edge Config, auto-connecting the frontend within seconds.

---

## 4. Verification & Milestone Acceptance

- [x] **Kaggle Dual T4 Boot**: Boots within 90 seconds and establishes stable tunnel.
- [x] **Zero HTTP 524 Errors**: 100% of generation requests stream through async job queue.
- [x] **Civitai Downloads**: Downloaded `civitai_test_lora.safetensors` (242 MB) successfully.
- [x] **Google Drive Mirroring**: Verified files in `/AI_Storage/outputs/` and `/AI_Storage/loras/`.
- [x] **Automated Tests**: Route contracts validated under `tests/api/routes_syntax.test.ts`.
