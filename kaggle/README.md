# 🚀 Kaggle Dual Tesla T4 Workstation Engine

[![Hardware: 2x Tesla T4](https://img.shields.io/badge/Hardware-2x_Tesla_T4_(30GB_VRAM)-00f2fe?style=for-the-badge&logo=nvidia)](https://www.kaggle.com)
[![Pipeline: Qwen Turbo Distilled](https://img.shields.io/badge/Pipeline-Qwen_Image_2.1_Viggle_Turbo-ff0844?style=for-the-badge&logo=huggingface)](https://huggingface.co/Viggle/Qwen-Image-2.1-viggle-turbo)
[![Security: Read--Only Git Safe](https://img.shields.io/badge/Security-Read--Only_Git_Mount-4caf50?style=for-the-badge&logo=github)](https://github.com/motherskitchenblr2/Qwen--Image-Editor-Civitai-Version)

A production-grade, uneditable, and undeletable execution package for the **Qwen Image Editor Studio** on Kaggle.

---

## 🛡️ Why Use this Repository Copy on Kaggle?

> [!IMPORTANT]
> **Accident Prevention & Git Immobility:**  
> When you link this GitHub repository directly into Kaggle as an external input or Git-backed script:
> - **Read-Only Filesystem:** Kaggle mounts linked GitHub repository files inside `/kaggle/input/...` as **strictly uneditable and undeletable**.
> - **Zero Accidental Overwrites:** You or any collaborator cannot accidentally modify, corrupt, or delete the runtime backend code from inside the Kaggle notebook UI.
> - **Single Source of Truth:** All updates are safely committed and reviewed on GitHub first, then cleanly pulled into Kaggle with deterministic versioning.

---

## ⚡ Execution Architecture

```mermaid
flowchart TD
    subgraph GitHub["GitHub Safe Repository (/kaggle/)"]
        REPO_NOTEBOOK["qwen_image_editor_backend.ipynb\n(Uneditable & Undeletable)"]
        REPO_BACKEND["kaggle_backend.py\n(FastAPI Engine)"]
        REPO_META["kernel-metadata.json\n(is_private: true)"]
    end

    subgraph KaggleKernel["Kaggle Container (Tesla T4 x2 = 30 GB VRAM)"]
        INPUT_MOUNT["Read-Only Input Mount\n(/kaggle/input/.../kaggle/)"]
        RUNNER["Cell 1: Dependencies\nCell 2: Sync to /kaggle/working/server.py\nCell 3: python3 server.py"]
        GPU0["GPU 0: Tesla T4 (DiT Transformer in 4-bit NF4) ~7.2 GB"]
        GPU1["GPU 1: Tesla T4 (Text Encoder + VAE) ~4.2 GB"]
    end

    subgraph CloudBridge["Cloud Ingress & Storage"]
        CFT["Cloudflare Zero-Trust Tunnel\n(Auto-synced to Google Drive Vault)"]
        VERCEL["Live Studio Frontend\n(https://qwen-image-editor-studio.vercel.app)"]
    end

    REPO_NOTEBOOK --> INPUT_MOUNT
    REPO_BACKEND --> INPUT_MOUNT
    INPUT_MOUNT --> RUNNER
    RUNNER --> GPU0
    RUNNER --> GPU1
    RUNNER --> CFT
    CFT --> VERCEL
```

---

## 📋 How to Link this Repository in Kaggle (Step-by-Step)

### Option A: Direct Git Integration (Recommended for Safety)
1. Open [Kaggle](https://www.kaggle.com) and click **Create** &rarr; **New Notebook**.
2. In the notebook editor menu, click **File** &rarr; **Link to Git Repository** (or **GitHub** in the sidebar).
3. Select this repository: `motherskitchenblr2/Qwen--Image-Editor-Civitai-Version`.
4. Point to the notebook path:  
   `kaggle/qwen_image_editor_backend.ipynb`
5. The notebook will open in **read-only / tracked mode**, preventing accidental in-browser code alterations.

### Option B: Add as Read-Only Input
1. In your Kaggle notebook session, open the right-hand **Notebook Options** panel.
2. Click **Add Input** &rarr; **GitHub Repositories**.
3. Paste: `https://github.com/motherskitchenblr2/Qwen--Image-Editor-Civitai-Version.git`.
4. Run the uneditable script directly from the mounted input path:
   ```bash
   python3 /kaggle/input/qwen-image-editor-civitai-version/kaggle/kaggle_backend.py
   ```

---

## ⚙️ Kaggle Session Settings Checklist

Ensure the following toggles are set in the right-hand **Notebook Settings** panel before running:

| Setting | Required Value | Rationale |
| :--- | :--- | :--- |
| **Accelerator** | **GPU T4 x2** (Dual Tesla T4) | Distributes DiT to GPU 0 and Text Encoder + VAE to GPU 1 |
| **Internet** | **Internet On** | Required to pull Cloudflare ingress, HF weights, and Civitai LoRAs |
| **Persistence** | **Files only** | Keeps cache between fast reboots |
| **Environment** | **Always use latest environment** | Ensures up-to-date PyTorch 2.x and CUDA 12.x drivers |

---

## 🚀 What Happens When You Run Cell 3?

1. **Dual-GPU Balancing:**  
   Loads 4-bit NF4 weights cleanly split between GPU 0 (Transformer ~7.2 GB) and GPU 1 (Text Encoder + VAE ~4.2 GB). Both GPUs maintain **> 7 GB of free headroom**, preventing CUDA OOMs.
2. **0.8ms Patch Embed Acceleration:**  
   Replaces cuDNN's slow 30-second `nn.Conv3d` fallback with a direct matrix multiplication.
3. **Distilled 6-Step / 9-Step Viggle Turbo Pipeline:**  
   Runs with custom `raw_nodes` Euler sigma scheduling and strict `true_cfg_scale = 1.0` (zero-CFG), avoiding color saturation and blur.
4. **Zero-Touch Auto-Discovery:**  
   Generates a Cloudflare Zero-Trust tunnel URL and auto-posts it to your Google Drive Vault (`AI_Storage/configs/tunnel_url.txt`). Your Vercel Web Studio detects it within seconds and auto-connects!
5. **Inactivity Watchdog:**  
   Monitors GPU activity and automatically shuts down after 20 minutes of idle time to safeguard your weekly Kaggle quota.
