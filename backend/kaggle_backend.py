"""
Kaggle GPU Backend Microservice for Qwen Image Editor Studio
Architecture:
- High-Performance QwenImageEditPlusPipeline (4-bit NF4 quantized for Tesla T4 16GB VRAM)
- FastAPI Async Microservice with real-time health telemetry
- Resilient Auto-Reconnecting Cloudflare Zero-Trust Tunnel (cloudflared)
- 5 TB Google Drive Persistence via rclone (models, loras, outputs, configs)
- Dynamic Civitai / Civitai.red LoRA Downloader & Multi-LoRA Fuser
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"
os.environ["CUDA_MODULE_LOADING"] = "LAZY"

import sys
import types

# Polyfill torchao.quantization.FqnToConfig if missing (satisfies diffusers top-level imports)
try:
    import torchao
    import torchao.quantization
    if not hasattr(torchao.quantization, "FqnToConfig"):
        class FqnToConfig:
            def __init__(self, *args, **kwargs): pass
        torchao.quantization.FqnToConfig = FqnToConfig
except Exception:
    try:
        tao = types.ModuleType("torchao")
        tao_q = types.ModuleType("torchao.quantization")
        class FqnToConfig:
            def __init__(self, *args, **kwargs): pass
        tao_q.FqnToConfig = FqnToConfig
        tao.quantization = tao_q
        sys.modules["torchao"] = tao
        sys.modules["torchao.quantization"] = tao_q
    except Exception:
        pass

import gc
import re
import io
import time
import json
import base64
import shutil
import uuid
import pathlib
import logging
import threading
import subprocess
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kaggle_backend")

# In-memory async jobs registry for non-blocking inference
JOBS: Dict[str, Dict[str, Any]] = {}

# Paths and storage constants
WORKING_DIR = pathlib.Path("/kaggle/working" if os.path.exists("/kaggle") else "./kaggle_work")
WORKING_DIR.mkdir(parents=True, exist_ok=True)

MODELS_DIR = WORKING_DIR / "models"
LORAS_DIR = WORKING_DIR / "loras"
OUTPUTS_DIR = WORKING_DIR / "outputs"
CONFIGS_DIR = WORKING_DIR / "configs"

for d in [MODELS_DIR, LORAS_DIR, OUTPUTS_DIR, CONFIGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

BASE_MODEL_ID = os.environ.get("BASE_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
VIGGLE_TURBO_REPO = os.environ.get("VIGGLE_TURBO_REPO", "Viggle/Qwen-Image-2.1-viggle-turbo")
VIGGLE_LORA_FILE = os.environ.get("VIGGLE_LORA_FILE", "Qwen-Image-2.1-viggle-turbo-v0.3-6step-lora-r256.safetensors")
RAPID_TRANSFORMER_ID = os.environ.get("RAPID_TRANSFORMER_ID", "prithivMLmods/Qwen-Image-Edit-Rapid-AIO-V4")
MODEL_ID = BASE_MODEL_ID
CIVITAI_API_KEY = os.environ.get("CIVITAI_API_KEY", "")

def raw_nodes(steps: int):
    """Raw pre-shift sigma nodes for distilled Qwen Turbo pipelines."""
    if steps < 4:
        return None
    if steps == 4:
        return [1.0, 0.75, 0.5, 0.25]
    if steps == 9:
        return raw_nodes(7) + [1 / 6, 1 / 12]
    return [1.0 - 0.125 * i / (steps - 4) for i in range(steps - 4)] + [0.875, 0.75, 0.5, 0.25]

# ─── 0. INACTIVITY WATCHDOG & AUTO-SHUTDOWN GUARD ───────────────────────────
IDLE_TIMEOUT_SECONDS = int(os.environ.get("IDLE_TIMEOUT_SECONDS", 20 * 60)) # Default 20 minutes (prevents premature termination) -> auto-stop GPU
AUTO_SHUTDOWN_ENABLED = True
last_activity_time = time.time()

def touch_activity():
    """Update last activity timestamp to prevent premature shutdown during use."""
    global last_activity_time
    last_activity_time = time.time()

def idle_watchdog():
    """Continuously monitors for idle state. If idle for IDLE_TIMEOUT_SECONDS, kills process to deallocate GPUs."""
    global IDLE_TIMEOUT_SECONDS, AUTO_SHUTDOWN_ENABLED, last_activity_time
    logger.info(f"🛡️ Quota Protection Watchdog active: auto-stops after {IDLE_TIMEOUT_SECONDS // 60} min idle.")
    while True:
        time.sleep(15)
        if not AUTO_SHUTDOWN_ENABLED:
            continue
        idle_duration = time.time() - last_activity_time
        if idle_duration > IDLE_TIMEOUT_SECONDS:
            logger.warning(f"🛑 [WATCHDOG] Inactive for {round(idle_duration / 60, 1)} minutes! Auto-terminating Kaggle GPU session to preserve quota.")
            try:
                stop_log = CONFIGS_DIR / "auto_shutdown.log"
                stop_log.write_text(f"Auto-shutdown at {time.ctime()} after {round(idle_duration / 60, 1)} min idle.")
                gdrive_sync_up(stop_log, "configs")
            except Exception:
                pass
            os._exit(0)

# ─── 1. STORAGE VAULT ENGINE (HUGGING FACE HUB & GOOGLE DRIVE HYBRID) ─────────

# A. Hugging Face Hub Cloud Storage (Static Token, Zero OAuth Expiration)
try:
    from huggingface_hub import HfApi, hf_hub_download
except ImportError:
    HfApi = None
    hf_hub_download = None

HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_STORAGE_REPO = os.environ.get("HF_STORAGE_REPO", "")
HF_REPO_TYPE = os.environ.get("HF_REPO_TYPE", "dataset")

try:
    from kaggle_secrets import UserSecretsClient
    _user_sec = UserSecretsClient()
    if not HF_TOKEN:
        HF_TOKEN = _user_sec.get_secret("HF_TOKEN") or ""
    if not HF_STORAGE_REPO:
        HF_STORAGE_REPO = _user_sec.get_secret("HF_STORAGE_REPO") or ""
    if not os.environ.get("HF_REPO_TYPE"):
        HF_REPO_TYPE = _user_sec.get_secret("HF_REPO_TYPE") or "dataset"
except Exception:
    pass

HF_ENABLED: bool = bool(HF_TOKEN and HF_STORAGE_REPO and HfApi)
hf_api = HfApi(token=HF_TOKEN) if HF_ENABLED else None
if HF_ENABLED:
    logger.info(f"🤗 [HF Storage Vault] Connected to Hugging Face repo: {HF_STORAGE_REPO} (type={HF_REPO_TYPE})")

# B. Google Drive Cloud Storage (rclone OAuth fallback)
GDRIVE_REMOTE = "gdrive"
GDRIVE_ROOT = "AI_Storage"

GDRIVE_CLIENT_ID_FALLBACK = os.environ.get("GDRIVE_CLIENT_ID", "")
GDRIVE_CLIENT_SECRET_FALLBACK = os.environ.get("GDRIVE_CLIENT_SECRET", "")
GDRIVE_TOKEN_FALLBACK = os.environ.get("GDRIVE_TOKEN_JSON", "")

RCLONE_CONF_FILE: Optional[pathlib.Path] = None
GDRIVE_ENABLED: bool = False


def ensure_rclone_installed() -> bool:
    """Ensure rclone binary is installed and executable in PATH. Auto-installs if missing."""
    bin_path = shutil.which("rclone")
    if bin_path is not None:
        return True

    logger.warning("⚠️ [rclone] Binary missing from environment. Auto-installing rclone now...")
    try:
        res = subprocess.run(
            ["curl", "-fsSL", "https://rclone.org/install.sh"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if res.returncode == 0:
            subprocess.run(
                ["bash"],
                input=res.stdout,
                capture_output=True,
                text=True,
                timeout=60
            )
            bin_path = shutil.which("rclone")
            if bin_path is not None:
                logger.info(f"✅ [rclone] Installed successfully via official script: {bin_path}")
                return True
    except Exception as ie:
        logger.warning(f"rclone install script error: {ie}")

    try:
        logger.info("Attempting rclone installation via apt-get fallback...")
        subprocess.run(["apt-get", "update", "-qq"], check=False, timeout=60)
        subprocess.run(["apt-get", "install", "-y", "-qq", "rclone"], check=False, timeout=60)
        bin_path = shutil.which("rclone")
        if bin_path is not None:
            logger.info(f"✅ [rclone] Installed successfully via apt-get: {bin_path}")
            return True
    except Exception as ae:
        logger.warning(f"rclone apt-get error: {ae}")

    logger.error("❌ [rclone] Could not be installed! Google Drive sync operations may fail.")
    return False


def setup_rclone(client_id: Optional[str] = None, client_secret: Optional[str] = None, token_json: Optional[str] = None) -> bool:
    """Write rclone config securely for Google Drive access and ensure rclone binary is ready."""
    global RCLONE_CONF_FILE, GDRIVE_ENABLED

    # 1. Discover if an existing valid configuration is already present on disk
    for candidate in [
        pathlib.Path.home() / ".config" / "rclone" / "rclone.conf",
        pathlib.Path("/root/.config/rclone/rclone.conf"),
        WORKING_DIR / "rclone.conf"
    ]:
        try:
            if candidate.exists():
                text = candidate.read_text()
                if "token =" in text and len(text.split("token =")[1].strip()) > 20:
                    ensure_rclone_installed()
                    RCLONE_CONF_FILE = candidate
                    os.environ["RCLONE_CONFIG"] = str(candidate)
                    GDRIVE_ENABLED = True
                    logger.info(f"✅ Existing valid rclone configuration active at {candidate}")
                    return True
        except Exception:
            pass

    cid = (client_id or GDRIVE_CLIENT_ID_FALLBACK or "").strip()
    csec = (client_secret or GDRIVE_CLIENT_SECRET_FALLBACK or "").strip()
    tok = (token_json or GDRIVE_TOKEN_FALLBACK or "").strip()

    if not tok:
        logger.info("ℹ️ [Google Drive Vault] No OAuth token provided. Local persistent storage (/kaggle/working/) active.")
        GDRIVE_ENABLED = False
        return False

    ensure_rclone_installed()

    conf_dir = pathlib.Path.home() / ".config" / "rclone"
    conf_dir.mkdir(parents=True, exist_ok=True)
    conf_file = conf_dir / "rclone.conf"
    
    config_content = f"""[{GDRIVE_REMOTE}]
type = drive
scope = drive
client_id = {cid}
client_secret = {csec}
token = {tok}
"""
    with open(conf_file, "w") as f:
        f.write(config_content)
    os.chmod(conf_file, 0o600)

    # Mirror into WORKING_DIR and /root/.config/rclone for universal access
    for alt_dir in [WORKING_DIR, pathlib.Path("/root/.config/rclone")]:
        try:
            alt_dir.mkdir(parents=True, exist_ok=True)
            alt_file = alt_dir / "rclone.conf"
            alt_file.write_text(config_content)
            os.chmod(alt_file, 0o600)
        except Exception:
            pass

    os.environ["RCLONE_CONFIG"] = str(conf_file)
    RCLONE_CONF_FILE = conf_file
    GDRIVE_ENABLED = True
    logger.info(f"✅ rclone configuration active for Google Drive ({conf_file}).")
    return True


def _get_rclone_cmd(base_args: List[str]) -> List[str]:
    cmd = ["rclone"]
    if RCLONE_CONF_FILE and RCLONE_CONF_FILE.exists():
        cmd.extend(["--config", str(RCLONE_CONF_FILE)])
    cmd.extend(base_args)
    return cmd


# C. Native Hugging Face Hub Storage Routines
def hf_sync_up(local_file: pathlib.Path, subfolder: str):
    """Uploads file to Hugging Face Hub repo."""
    if not hf_api or not HF_STORAGE_REPO or not local_file.exists():
        return
    try:
        path_in_repo = f"{subfolder}/{local_file.name}"
        hf_api.upload_file(
            path_or_fileobj=str(local_file),
            path_in_repo=path_in_repo,
            repo_id=HF_STORAGE_REPO,
            repo_type=HF_REPO_TYPE,
            commit_message=f"Upload {local_file.name}"
        )
        logger.info(f"✅ [HF Vault] Uploaded {local_file.name} to {path_in_repo}")
    except Exception as e:
        logger.warning(f"HF upload failed for {local_file.name}: {e}")


def hf_upload_and_clean(local_file: pathlib.Path, subfolder: str, keep_local: bool = False):
    """Uploads file to HF Hub and purges local copy to conserve Kaggle disk space."""
    if not local_file.exists():
        return
    hf_sync_up(local_file, subfolder)
    if not keep_local:
        try:
            local_file.unlink()
            logger.info(f"🧹 [HF AutoClean] Purged local copy {local_file.name}")
        except Exception as e:
            logger.warning(f"Failed to remove local copy: {e}")


def hf_fetch_on_demand(filename: str, subfolder: str, local_dest: pathlib.Path) -> pathlib.Path:
    """Pulls requested LoRA or config from HF Hub if not present locally."""
    target = local_dest / filename
    if target.exists() and target.stat().st_size > 1000:
        return target
    if not HF_ENABLED or not hf_hub_download:
        return target
    try:
        logger.info(f"📥 [HF Vault] Downloading {filename}...")
        downloaded = hf_hub_download(
            repo_id=HF_STORAGE_REPO,
            filename=f"{subfolder}/{filename}",
            repo_type=HF_REPO_TYPE,
            local_dir=str(local_dest),
            token=HF_TOKEN
        )
        return pathlib.Path(downloaded)
    except Exception as e:
        logger.warning(f"HF fetch on-demand note for {filename}: {e}")
        return target


# D. Unified Storage Routines (Hugging Face primary, Google Drive fallback)
def gdrive_sync_down(subfolder: str, local_dest: pathlib.Path):
    """Sync assets to local Kaggle working directory from active cloud vault."""
    if HF_ENABLED and hf_api:
        try:
            files = hf_api.list_repo_files(repo_id=HF_STORAGE_REPO, repo_type=HF_REPO_TYPE)
            for f in files:
                if f.startswith(f"{subfolder}/"):
                    hf_hub_download(
                        repo_id=HF_STORAGE_REPO,
                        filename=f,
                        repo_type=HF_REPO_TYPE,
                        local_dir=str(local_dest),
                        token=HF_TOKEN
                    )
            return
        except Exception as e:
            logger.warning(f"HF sync_down failed: {e}")
    if GDRIVE_ENABLED:
        try:
            ensure_rclone_installed()
            cmd = _get_rclone_cmd(["copy", f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}", str(local_dest)])
            subprocess.run(cmd, check=False)
        except Exception as e:
            logger.warning(f"gdrive_sync_down failed: {e}")


def gdrive_sync_metadata(subfolder: str, local_dest: pathlib.Path):
    """Sync only lightweight metadata (.meta.json) from active cloud vault."""
    if HF_ENABLED and hf_api:
        try:
            files = hf_api.list_repo_files(repo_id=HF_STORAGE_REPO, repo_type=HF_REPO_TYPE)
            for f in files:
                if f.startswith(f"{subfolder}/") and f.endswith(".meta.json"):
                    hf_hub_download(
                        repo_id=HF_STORAGE_REPO,
                        filename=f,
                        repo_type=HF_REPO_TYPE,
                        local_dir=str(local_dest),
                        token=HF_TOKEN
                    )
            return
        except Exception as e:
            logger.warning(f"HF sync_metadata failed: {e}")
    if GDRIVE_ENABLED:
        try:
            ensure_rclone_installed()
            cmd = _get_rclone_cmd(["copy", f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}", str(local_dest), "--include", "*.meta.json"])
            subprocess.run(cmd, check=False)
        except Exception as e:
            logger.warning(f"gdrive_sync_metadata failed: {e}")


def gdrive_sync_up(local_src: pathlib.Path, subfolder: str):
    """Sync file up to active cloud vault (HF Hub if configured, else Google Drive)."""
    if not local_src.exists():
        return
    if HF_ENABLED:
        hf_sync_up(local_src, subfolder)
        return
    if GDRIVE_ENABLED:
        try:
            ensure_rclone_installed()
            cmd = _get_rclone_cmd(["copy", str(local_src), f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}"])
            subprocess.run(cmd, check=False)
        except Exception as e:
            logger.warning(f"gdrive_sync_up failed: {e}")


def gdrive_upload_and_clean(local_src: pathlib.Path, subfolder: str, keep_local: bool = False):
    """Upload to active cloud vault and immediately purge local copy to keep disk clear."""
    if not local_src.exists():
        return
    if HF_ENABLED:
        hf_upload_and_clean(local_src, subfolder, keep_local)
        return
    if GDRIVE_ENABLED:
        try:
            ensure_rclone_installed()
            filename = local_src.name
            logger.info(f"📤 [Storage Vault] Uploading {filename} to Google Drive {subfolder}...")
            cmd = _get_rclone_cmd(["copy", str(local_src), f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}"])
            res = subprocess.run(cmd, check=False)
            if res.returncode == 0:
                check_cmd = _get_rclone_cmd(["lsf", f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}/{filename}"])
                check_res = subprocess.run(check_cmd, capture_output=True, text=True)
                if filename in check_res.stdout:
                    logger.info(f"✅ [Storage Vault] Verified in Google Drive: {filename}")
                    if not keep_local:
                        try:
                            local_src.unlink()
                            logger.info(f"🧹 [AutoClean] Purged {filename} from local storage.")
                        except Exception as ce:
                            logger.warning(f"Could not remove local copy: {ce}")
        except Exception as e:
            logger.warning(f"gdrive_upload_and_clean failed: {e}")


def gdrive_fetch_on_demand(filename: str, subfolder: str, local_dest: pathlib.Path) -> pathlib.Path:
    """Fetch a specific asset on-demand from active cloud vault if not present locally."""
    target = local_dest / filename
    if target.exists() and target.stat().st_size > 1000:
        return target
    if HF_ENABLED:
        return hf_fetch_on_demand(filename, subfolder, local_dest)
    if GDRIVE_ENABLED:
        try:
            ensure_rclone_installed()
            logger.info(f"📥 [On-Demand] Fetching {filename} from Google Drive {subfolder}...")
            cmd = _get_rclone_cmd(["copy", f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/{subfolder}/{filename}", str(local_dest)])
            subprocess.run(cmd, check=False)
        except Exception as e:
            logger.warning(f"gdrive_fetch_on_demand failed: {e}")
    return target



def download_file_authenticated(url: str, dest: pathlib.Path, max_retries: int = 5):
    """Download model or LoRA with automatic resume across connection drops."""
    auth_url = url
    if ("civitai.com" in url or "civitai.red" in url) and "token=" not in url:
        sep = "&" if "?" in url else "?"
        auth_url = f"{url}{sep}token={CIVITAI_API_KEY}"

    if shutil.which("aria2c"):
        cmd = f'aria2c -c -x 8 -s 8 -k 1M --file-allocation=none --dir="{dest.parent}" --out="{dest.name}" "{auth_url}"'
        res = os.system(cmd)
        if res == 0 and dest.exists() and dest.stat().st_size > 50000:
            logger.info(f"✅ Successfully downloaded {dest.name} ({round(dest.stat().st_size / (1024 * 1024), 2)} MB)")
            return

    for attempt in range(1, max_retries + 1):
        cmd = f'curl -fL -C - --retry 3 --progress-bar -o "{dest}" --user-agent "Mozilla/5.0" "{auth_url}"'
        res = os.system(cmd)
        if res == 0 and dest.exists() and dest.stat().st_size > 50000:
            logger.info(f"✅ Successfully downloaded {dest.name} ({round(dest.stat().st_size / (1024 * 1024), 2)} MB)")
            return
        time.sleep(2)

    if not dest.exists() or dest.stat().st_size < 50000:
        raise RuntimeError(f"Download failed for {dest.name}")


# ─── 2. DIFFUSERS / QWEN PIPELINE ORCHESTRATION ─────────────────────────────

class ModelOrchestrator:
    def __init__(self):
        self.pipe = None
        self.active_loras: Dict[str, float] = {}
        self.is_ready = False
        self.status_message = "Initializing..."
        self.lock = threading.Lock()

    def load_pipeline(self):
        """Assembles the Qwen image edit pipeline with dual GPU or single GPU optimizations."""
        import torch

        try:
            # Safe dynamic imports
            PipelineClass = None
            try:
                from diffusers import QwenImageEditPlusPipeline
                PipelineClass = QwenImageEditPlusPipeline
                logger.info("Using diffusers.QwenImageEditPlusPipeline")
            except ImportError:
                try:
                    from diffusers import QwenImageEditPipeline
                    PipelineClass = QwenImageEditPipeline
                    logger.info("Using diffusers.QwenImageEditPipeline")
                except ImportError:
                    try:
                        from diffusers import DiffusionPipeline
                        PipelineClass = DiffusionPipeline
                        logger.info("Using diffusers.DiffusionPipeline fallback")
                    except ImportError as pe:
                        raise ImportError(f"Cannot import Diffusers pipeline: {pe}")

            try:
                from diffusers import AutoencoderKLQwenImage, QwenImageTransformer2DModel
            except ImportError:
                AutoencoderKLQwenImage = None
                QwenImageTransformer2DModel = None

            try:
                from transformers import Qwen2_5_VLForConditionalGeneration
            except ImportError:
                Qwen2_5_VLForConditionalGeneration = None

            num_gpus = torch.cuda.device_count() if torch.cuda.is_available() else 0
            device_names = [torch.cuda.get_device_name(i) for i in range(num_gpus)] if num_gpus > 0 else []
            self.status_message = f"Detected {num_gpus} GPU(s): {device_names}. Initializing pipeline..."
            logger.info(self.status_message)

            # Fast restore lightweight LoRA metadata from Google Drive (Zero safetensors on local disk)
            if GDRIVE_ENABLED:
                gdrive_sync_metadata("loras", LORAS_DIR)

            try:
                torch.cuda.empty_cache()
                gc.collect()
            except Exception:
                pass

            loaded = False
            last_error = None
            preferred_dtype = torch.bfloat16 if (torch.cuda.is_available() and torch.cuda.is_bf16_supported()) else torch.float16

            # Strategy 1: 4-Bit NF4 Quantization with BitsAndBytes (Optimized for Tesla T4 16GB)
            # Drastically cuts 20.4B DiT (~41GB) down to ~10.2GB and 7B Text Encoder down to ~3.5GB.
            # Leaves 5GB+ free VRAM headroom on Tesla T4 to avoid CUDA Out of Memory during inference.
            if num_gpus > 0:
                try:
                    from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig
                    from transformers import BitsAndBytesConfig as TransformersBitsAndBytesConfig
                    from diffusers import PipelineQuantizationConfig

                    logger.info(f"Attempting Strategy 1: 4-Bit NF4 Pipeline Quantization across {num_gpus} GPU(s)...")
                    transformer_bnb = DiffusersBitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=preferred_dtype,
                        bnb_4bit_use_double_quant=True,
                        llm_int8_skip_modules=[
                            "time_text_embed",
                            "img_in",
                            "norm_out",
                            "proj_out",
                            "img_mod",
                            "txt_mod",
                        ],
                    )
                    text_encoder_bnb = TransformersBitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=preferred_dtype,
                    )
                    quant_config = PipelineQuantizationConfig(
                        quant_mapping={
                            "transformer": transformer_bnb,
                            "text_encoder": text_encoder_bnb,
                        }
                    )

                    self.pipe = PipelineClass.from_pretrained(
                        MODEL_ID,
                        quantization_config=quant_config,
                        torch_dtype=preferred_dtype,
                        low_cpu_mem_usage=True
                    )

                    # Dynamic multi-GPU balancing:
                    if num_gpus >= 2:
                        try:
                            if hasattr(self.pipe, "transformer") and self.pipe.transformer is not None:
                                self.pipe.transformer.to("cuda:0")
                            if hasattr(self.pipe, "text_encoder") and self.pipe.text_encoder is not None:
                                self.pipe.text_encoder.to("cuda:1")
                            if hasattr(self.pipe, "vae") and self.pipe.vae is not None:
                                self.pipe.vae.to("cuda:1")
                            logger.info("✅ Strategy 1: Sharded across Dual GPUs (DiT on GPU 0, Text Encoder + VAE on GPU 1).")
                        except Exception as dist_e:
                            logger.warning(f"Dual-GPU direct component placement note: {dist_e}")
                            self.pipe.enable_model_cpu_offload(gpu_id=0)
                    else:
                        self.pipe.enable_model_cpu_offload(gpu_id=0)
                    self.pipe.set_progress_bar_config(disable=None)
                    logger.info("✅ Strategy 1 success: 4-bit NF4 quantized pipeline loaded.")
                    loaded = True
                except Exception as e1:
                    logger.warning(f"Strategy 1 (4-bit NF4) failed: {e1}")
                    last_error = e1
                    try:
                        del self.pipe
                    except Exception:
                        pass
                    self.pipe = None
                    torch.cuda.empty_cache()
                    gc.collect()

            # Strategy 2: Component-Level Transformer Multi-GPU Distribution
            if not loaded and num_gpus >= 2:
                try:
                    logger.info(f"Attempting Strategy 2: Dual-GPU Component Sharding across {num_gpus} GPUs...")
                    max_memory = {0: "10.0GiB", 1: "13.5GiB", "cpu": "16GiB"}
                    transformer = None
                    if QwenImageTransformer2DModel is not None:
                        try:
                            transformer = QwenImageTransformer2DModel.from_pretrained(
                                MODEL_ID,
                                subfolder="transformer",
                                torch_dtype=preferred_dtype,
                                device_map="auto",
                                max_memory=max_memory,
                                low_cpu_mem_usage=True
                            )
                        except Exception as te:
                            logger.warning(f"Standalone transformer load note: {te}")
                            transformer = None

                    pipe_kwargs = {
                        "torch_dtype": preferred_dtype,
                        "low_cpu_mem_usage": True,
                    }
                    if transformer is not None:
                        pipe_kwargs["transformer"] = transformer

                    self.pipe = PipelineClass.from_pretrained(MODEL_ID, **pipe_kwargs)
                    if transformer is None:
                        self.pipe.enable_model_cpu_offload(gpu_id=0)
                    self.pipe.set_progress_bar_config(disable=None)
                    logger.info("✅ Strategy 2 success: Pipeline loaded with sharded multi-GPU transformer.")
                    loaded = True
                except Exception as e2:
                    logger.warning(f"Strategy 2 failed: {e2}")
                    last_error = e2
                    try:
                        del self.pipe
                    except Exception:
                        pass
                    self.pipe = None
                    torch.cuda.empty_cache()
                    gc.collect()

            # Strategy 3: Sequential CPU Offloading (Extreme Low VRAM Guard: Streams layers sequentially)
            if not loaded and num_gpus > 0:
                logger.info("Attempting Strategy 3: Sequential CPU offloading fallback...")
                try:
                    self.pipe = PipelineClass.from_pretrained(
                        MODEL_ID,
                        torch_dtype=preferred_dtype,
                        low_cpu_mem_usage=True
                    )
                    self.pipe.enable_sequential_cpu_offload()
                    self.pipe.set_progress_bar_config(disable=None)
                    logger.info("✅ Strategy 3 success: Pipeline loaded with enable_sequential_cpu_offload().")
                    loaded = True
                except Exception as e3:
                    logger.warning(f"Strategy 3 failed: {e3}")
                    last_error = e3
                    try:
                        del self.pipe
                    except Exception:
                        pass
                    self.pipe = None
                    torch.cuda.empty_cache()
                    gc.collect()

            # Strategy 4: Standard Direct CUDA / CPU Pipeline
            if not loaded:
                logger.info("Attempting Strategy 4: Standard direct pipeline load...")
                try:
                    self.pipe = PipelineClass.from_pretrained(
                        MODEL_ID,
                        torch_dtype=preferred_dtype if num_gpus > 0 else torch.float32,
                        low_cpu_mem_usage=True
                    )
                    if num_gpus > 0:
                        self.pipe.enable_model_cpu_offload(gpu_id=0)
                    self.pipe.set_progress_bar_config(disable=None)
                    logger.info("✅ Standard pipeline loaded successfully.")
                    loaded = True
                except Exception as e4:
                    logger.error(f"Strategy 4 failed: {e4}")
                    last_error = e4

            if loaded and self.pipe is not None:
                # 1. ⚡ Visual Patch Embed Acceleration (30s Conv3d -> 0.8ms matmul)
                try:
                    visual_model = None
                    if hasattr(self.pipe, "text_encoder"):
                        te = self.pipe.text_encoder
                        if hasattr(te, "model") and hasattr(te.model, "visual"):
                            visual_model = te.model.visual
                        elif hasattr(te, "visual"):
                            visual_model = te.visual

                    if visual_model and hasattr(visual_model, "patch_embed"):
                        pe = visual_model.patch_embed
                        if hasattr(pe, "proj"):
                            def _patch_embed_forward(hidden_states):
                                proj = pe.proj
                                weight = proj.weight.reshape(proj.weight.shape[0], -1)
                                return hidden_states.to(weight.dtype).flatten(1) @ weight.T + proj.bias
                            pe.forward = _patch_embed_forward
                            logger.info("⚡ [Acceleration] Replaced 30s cuDNN Conv3d with 0.8ms matmul in visual patch_embed!")
                except Exception as pe_e:
                    logger.warning(f"patch_embed acceleration note: {pe_e}")

                # 2. ⚡ FlowMatchEulerDiscreteScheduler Rebuild with shift_terminal=None
                try:
                    from diffusers import FlowMatchEulerDiscreteScheduler
                    if hasattr(self.pipe, "scheduler") and hasattr(self.pipe.scheduler, "config"):
                        self.pipe.scheduler = FlowMatchEulerDiscreteScheduler.from_config(
                            self.pipe.scheduler.config, shift_terminal=None
                        )
                        logger.info("⚡ [Scheduler] Rebuilt FlowMatchEulerDiscreteScheduler with shift_terminal=None.")
                except Exception as sc_e:
                    logger.warning(f"Scheduler rebuild note: {sc_e}")

                # 3. ⚡ Try loading Viggle Turbo LoRA weights into pipeline
                try:
                    logger.info(f"⚡ [Turbo Engine] Attempting Viggle Turbo distillation adapter ({VIGGLE_TURBO_REPO})...")
                    self.pipe.load_lora_weights(
                        VIGGLE_TURBO_REPO,
                        weight_name=VIGGLE_LORA_FILE,
                        adapter_name="viggle_turbo",
                    )
                    self.pipe.set_adapters("viggle_turbo")
                    logger.info("✅ [Turbo Engine] Viggle Turbo v0.3 distillation adapter active.")
                except Exception as vt_e:
                    logger.warning(f"Viggle Turbo auto-load note: {vt_e}")

                # 4. Memory optimizations: slicing enabled, strictly NO VAE tiling for image edits!
                try:
                    if hasattr(self.pipe, "vae") and self.pipe.vae is not None:
                        self.pipe.vae.enable_slicing()
                except Exception:
                    pass
                try:
                    if hasattr(self.pipe, "enable_attention_slicing"):
                        self.pipe.enable_attention_slicing(1)
                except Exception:
                    pass

                torch.cuda.empty_cache()
                gc.collect()
                self.is_ready = True
                self.status_message = f"Model ready on {num_gpus} GPU(s) ({', '.join(device_names)})."
                logger.info(f"✅ {self.status_message}")
            else:
                self.is_ready = False
                self.status_message = f"Pipeline initialization error: {last_error}"
                logger.error(self.status_message, exc_info=True)
                try:
                    err_file = CONFIGS_DIR / "last_error.log"
                    err_file.write_text(f"Load error at {time.ctime()}:\n{self.status_message}")
                    if GDRIVE_ENABLED:
                        threading.Thread(target=gdrive_sync_up, args=(err_file, "configs")).start()
                except Exception:
                    pass

        except Exception as top_err:
            self.status_message = f"Critical load error: {top_err}"
            logger.error(self.status_message, exc_info=True)
            self.is_ready = False

    def apply_loras(self, requested_loras: List[Dict[str, Any]]):
        """Dynamically load and scale LoRAs into the model pipeline."""
        if not self.pipe:
            return

        try:
            self.pipe.unfuse_lora()
            self.pipe.unload_lora_weights()
        except Exception:
            pass

        self.active_loras = {}

        for item in requested_loras:
            name = item.get("name")
            scale = float(item.get("scale", 0.8))
            filename = f"{name}.safetensors" if not name.endswith(".safetensors") else name
            lora_file = LORAS_DIR / filename

            # On-demand pull from Hugging Face / Google Drive Vault if not in local cache
            if not lora_file.exists():
                hf_fetch_on_demand(filename, "loras", LORAS_DIR)
            if not lora_file.exists():
                gdrive_fetch_on_demand(filename, "loras", LORAS_DIR)

            if lora_file.exists() and lora_file.stat().st_size > 1000:
                logger.info(f"Applying LoRA: {lora_file.name} with scale {scale}")
                try:
                    self.pipe.load_lora_weights(str(lora_file))
                    self.pipe.fuse_lora(lora_scale=scale)
                    self.active_loras[lora_file.stem] = scale
                    logger.info(f"✅ LoRA {lora_file.stem} weights fused into GPU VRAM (scale: {scale}).")
                except Exception as e:
                    logger.warning(f"LoRA loading note: {e}")

    def generate(
        self,
        input_image: Optional[Image.Image] = None,
        prompt: str = "",
        negative_prompt: str = "blurry, distorted, low quality, deformed, pixelated, saturated, oversaturated",
        true_cfg_scale: float = 4.0,
        guidance_scale: float = 1.0,
        num_inference_steps: int = 4,
        seed: Optional[int] = None,
        height: Optional[int] = None,
        width: Optional[int] = None,
        task_id: Optional[str] = None,
        loras: Optional[List[Dict[str, Any]]] = None
    ) -> Image.Image:
        """Execute image edit or text-to-image inference."""
        import torch

        with self.lock:
            if not self.is_ready or not self.pipe:
                raise RuntimeError("Model pipeline not loaded yet.")

            if loras:
                self.apply_loras(loras)

            gen = torch.manual_seed(seed) if seed is not None else None

            # Calculate safe inference dimensions for Tesla T4 (prevents quadratic attention OOM)
            orig_w = int(width) if width else (input_image.size[0] if input_image else 512)
            orig_h = int(height) if height else (input_image.size[1] if input_image else 512)
            max_dim = int(os.environ.get("MAX_INFERENCE_DIM", 768))
            scale = min(max_dim / max(orig_w, orig_h), 1.0)
            target_w = max(256, (int(orig_w * scale) // 16) * 16)
            target_h = max(256, (int(orig_h * scale) // 16) * 16)

            # Pure Text-to-Image synthesis via empty white latent canvas conditioning
            is_text2img = input_image is None
            if is_text2img:
                logger.info(f"⚡ [Text-to-Image] Initializing empty white latent canvas conditioning ({target_w}x{target_h}).")
                input_image = Image.new("RGB", (target_w, target_h), (255, 255, 255))

            logger.info(f"Executing inference: mode={'t2i' if is_text2img else 'i2i'}, prompt='{prompt[:60]}...', steps={num_inference_steps}, target_res={target_w}x{target_h}")
            torch.cuda.empty_cache()
            gc.collect()

            if task_id and task_id in JOBS:
                JOBS[task_id]["stage"] = "Synthesizing text-to-image on Tesla T4..." if is_text2img else "Encoding prompt & input image on Tesla T4..."
                JOBS[task_id]["progress"] = 8.0

            def step_cb(pipe_obj, step_idx, timestep, callback_kwargs):
                try:
                    if task_id and task_id in JOBS:
                        curr_step = step_idx + 1
                        prog = round(12.0 + (curr_step / max(num_inference_steps, 1)) * 78.0, 1)
                        JOBS[task_id]["stage"] = f"⚡ Denoising Step {curr_step}/{num_inference_steps}"
                        JOBS[task_id]["step"] = curr_step
                        JOBS[task_id]["progress"] = prog
                        logger.info(f"[{task_id}] Step {curr_step}/{num_inference_steps} ({prog}%)")
                except Exception as cb_e:
                    logger.warning(f"step_cb warning: {cb_e}")
                return callback_kwargs

            try:
                with torch.inference_mode():
                    call_kwargs = {
                        "prompt": prompt,
                        "guidance_scale": guidance_scale,
                        "num_inference_steps": num_inference_steps,
                        "generator": gen,
                        "height": target_h,
                        "width": target_w,
                    }
                    if hasattr(self.pipe, "__call__"):
                        import inspect
                        pipe_params = inspect.signature(self.pipe.__call__).parameters
                        if "image" in pipe_params and input_image is not None:
                            call_kwargs["image"] = input_image
                    else:
                        call_kwargs["image"] = input_image

                    # Viggle Turbo exact 6-step or 9-step sigma schedule
                    sigmas = raw_nodes(num_inference_steps)
                    if sigmas is not None:
                        call_kwargs["sigmas"] = sigmas
                        # Distilled model must run with true_cfg_scale=1.0 (zero-CFG)
                        call_kwargs["true_cfg_scale"] = 1.0
                    else:
                        call_kwargs["negative_prompt"] = negative_prompt
                        call_kwargs["true_cfg_scale"] = true_cfg_scale

                    if task_id:
                        call_kwargs["callback_on_step_end"] = step_cb
                        call_kwargs["callback_on_step_end_tensor_inputs"] = ["latents"]

                    torch.cuda.empty_cache()
                    gc.collect()
                    result = self.pipe(**call_kwargs)

                if task_id and task_id in JOBS:
                    JOBS[task_id]["stage"] = "Decoding high-res output with VAE..."
                    JOBS[task_id]["progress"] = 94.0

                output_img = result.images[0]
                if output_img.size != (orig_w, orig_h):
                    output_img = output_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)

                # Save and upload to Google Drive Vault, then auto-clean local copy
                filename = f"edit_{int(time.time())}.png"
                local_save = OUTPUTS_DIR / filename
                output_img.save(str(local_save))
                threading.Thread(target=gdrive_upload_and_clean, args=(local_save, "outputs", False)).start()

                return output_img
            finally:
                torch.cuda.empty_cache()
                gc.collect()


orchestrator = ModelOrchestrator()


# ─── 3. FASTAPI SERVICE SPECIFICATION ────────────────────────────────────────

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Qwen Image Editor Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoRADownloadRequest(BaseModel):
    url: str
    name: Optional[str] = None
    trigger_words: Optional[str] = None


class LoRAItem(BaseModel):
    name: str
    scale: float = 0.8


class LoRALoadRequest(BaseModel):
    loras: List[LoRAItem]



class EditRequest(BaseModel):
    image_base64: Optional[str] = None
    prompt: str
    negative_prompt: str = ""
    true_cfg_scale: float = 1.0
    guidance_scale: float = 1.0
    num_inference_steps: int = 6
    seed: Optional[int] = None
    height: Optional[int] = None
    width: Optional[int] = None
    loras: Optional[List[LoRAItem]] = []
    async_mode: bool = True


@app.get("/api/health")
def health():
    """Return system readiness, VRAM statistics across all GPUs, and GPU device details."""
    import torch
    devices = []
    total_alloc = 0.0
    total_res = 0.0
    total_cap = 0.0
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            alloc = round(torch.cuda.memory_allocated(i) / (1024 * 1024), 2)
            res = round(torch.cuda.memory_reserved(i) / (1024 * 1024), 2)
            cap = round(props.total_memory / (1024 * 1024), 2)
            total_alloc += alloc
            total_res += res
            total_cap += cap
            devices.append({
                "index": i,
                "name": props.name,
                "allocated_mb": alloc,
                "reserved_mb": res,
                "total_mb": cap,
                "free_mb": round(cap - alloc, 2)
            })

    device_label = f"{len(devices)}x {devices[0]['name']}" if devices else "None"

    return {
        "status": "healthy" if orchestrator.is_ready else "loading",
        "model_ready": orchestrator.is_ready,
        "message": orchestrator.status_message,
        "model_id": MODEL_ID,
        "active_loras": orchestrator.active_loras,
        "device_count": len(devices),
        "devices": devices,
        "vram": {
            "device": device_label,
            "allocated_mb": round(total_alloc, 2),
            "reserved_mb": round(total_res, 2),
            "total_mb": round(total_cap, 2),
            "devices": devices
        }
    }


@app.post("/api/shutdown")
def shutdown_server():
    """Remotely stop the Kaggle GPU session immediately to preserve quota."""
    logger.warning("🚨 Remote shutdown requested! Exiting process to stop Kaggle GPU session...")
    def kill():
        time.sleep(1)
        os._exit(0)
    threading.Thread(target=kill).start()
    return {
        "status": "shutting_down",
        "message": "Kaggle GPU session terminating immediately. GPU will deallocate in seconds."
    }


class IdleTimeoutConfig(BaseModel):
    enabled: bool = True
    timeout_minutes: int = 5


@app.get("/api/settings/idle-timeout")
def get_idle_timeout():
    """Get current idle timeout watchdog configuration and remaining idle seconds."""
    global IDLE_TIMEOUT_SECONDS, AUTO_SHUTDOWN_ENABLED, last_activity_time
    idle_secs = time.time() - last_activity_time
    remaining_secs = max(0, IDLE_TIMEOUT_SECONDS - idle_secs) if AUTO_SHUTDOWN_ENABLED else None
    return {
        "enabled": AUTO_SHUTDOWN_ENABLED,
        "timeout_minutes": IDLE_TIMEOUT_SECONDS // 60,
        "timeout_seconds": IDLE_TIMEOUT_SECONDS,
        "current_idle_seconds": round(idle_secs, 1),
        "remaining_seconds": round(remaining_secs, 1) if remaining_secs is not None else None,
    }


@app.post("/api/settings/idle-timeout")
def set_idle_timeout(cfg: IdleTimeoutConfig):
    """Dynamically set idle timeout watchdog configuration (5, 10, 15, 30 min)."""
    global IDLE_TIMEOUT_SECONDS, AUTO_SHUTDOWN_ENABLED, last_activity_time
    touch_activity()
    AUTO_SHUTDOWN_ENABLED = cfg.enabled
    timeout_m = int(cfg.timeout_minutes)
    if timeout_m not in [5, 10, 15, 30]:
        timeout_m = max(1, timeout_m)
    IDLE_TIMEOUT_SECONDS = timeout_m * 60
    logger.info(f"⚙️ [Watchdog Config] Auto-shutdown updated: enabled={AUTO_SHUTDOWN_ENABLED}, timeout={timeout_m} min")

    try:
        conf_file = CONFIGS_DIR / "idle_config.json"
        with open(conf_file, "w") as f:
            json.dump({"enabled": AUTO_SHUTDOWN_ENABLED, "timeout_minutes": timeout_m}, f)
        threading.Thread(target=gdrive_sync_up, args=(conf_file, "configs")).start()
    except Exception as e:
        logger.warning(f"Could not persist idle config: {e}")

    return {
        "status": "success",
        "enabled": AUTO_SHUTDOWN_ENABLED,
        "timeout_minutes": timeout_m,
        "message": f"Auto-shutdown successfully scheduled for {timeout_m} minutes of inactivity."
    }


class StorageConfigRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    token_json: Optional[str] = None
    rclone_conf: Optional[str] = None


@app.post("/api/storage/config")
def update_storage_config(req: StorageConfigRequest):
    """Dynamically configure Google Drive Vault via rclone."""
    touch_activity()
    if req.rclone_conf:
        conf_dir = pathlib.Path.home() / ".config" / "rclone"
        conf_dir.mkdir(parents=True, exist_ok=True)
        conf_file = conf_dir / "rclone.conf"
        conf_file.write_text(req.rclone_conf)
        os.chmod(conf_file, 0o600)
        global RCLONE_CONF_FILE, GDRIVE_ENABLED
        RCLONE_CONF_FILE = conf_file
        GDRIVE_ENABLED = True
        return {"status": "configured", "gdrive_enabled": True}
    if req.token_json:
        ok = setup_rclone(req.client_id, req.client_secret, req.token_json)
        return {"status": "configured" if ok else "failed", "gdrive_enabled": ok}
    return {"status": "ignored", "gdrive_enabled": GDRIVE_ENABLED}


@app.post("/api/reload")
def reload_pipeline_endpoint(background_tasks: BackgroundTasks):
    """Trigger background reload of the model pipeline."""
    touch_activity()
    background_tasks.add_task(orchestrator.load_pipeline)
    return {
        "status": "reloading_started",
        "message": "Model pipeline re-initialization triggered in background."
    }


@app.get("/api/loras")
def list_loras():
    """List all available LoRA files in Google Drive Vault and local storage."""
    loras = {}

    # 1. Read from metadata records (stored in Google Drive Vault)
    for mf in sorted(LORAS_DIR.glob("*.meta.json")):
        stem = mf.stem.replace(".meta", "")
        try:
            with open(mf, "r") as f:
                meta = json.load(f)
                filename = meta.get("filename", f"{stem}.safetensors")
                loras[filename] = {
                    "name": meta.get("name", stem),
                    "filename": filename,
                    "size_mb": meta.get("size_mb", 0.0),
                    "is_active": stem in orchestrator.active_loras,
                    "scale": orchestrator.active_loras.get(stem, 0.8),
                    "trigger_words": meta.get("trigger_words", ""),
                    "storage": "Hugging Face Vault" if HF_ENABLED else "Google Drive Vault (AutoCleaned)",
                }
        except Exception:
            pass

    # 2. Merge any currently cached safetensors
    for f in sorted(LORAS_DIR.glob("*.safetensors")):
        if f.name not in loras:
            size_mb = round(f.stat().st_size / (1024 * 1024), 2)
            loras[f.name] = {
                "name": f.stem,
                "filename": f.name,
                "size_mb": size_mb,
                "is_active": f.stem in orchestrator.active_loras,
                "scale": orchestrator.active_loras.get(f.stem, 0.8),
                "trigger_words": "",
                "storage": "Local Cache",
            }
        else:
            loras[f.name]["is_active"] = f.stem in orchestrator.active_loras

    # 3. If local cache empty, discover remote models in Google Drive Vault
    if not loras:
        try:
            ensure_rclone_installed()
            cmd = _get_rclone_cmd(["lsjson", f"{GDRIVE_REMOTE}:{GDRIVE_ROOT}/loras", "--include", "*.safetensors"])
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            if res.returncode == 0 and res.stdout:
                items = json.loads(res.stdout)
                for it in items:
                    fname = it.get("Name", "")
                    if fname.endswith(".safetensors"):
                        stem = fname.replace(".safetensors", "")
                        size_mb = round(it.get("Size", 0) / (1024 * 1024), 2)
                        loras[fname] = {
                            "name": stem,
                            "filename": fname,
                            "size_mb": size_mb,
                            "is_active": stem in orchestrator.active_loras,
                            "scale": orchestrator.active_loras.get(stem, 0.8),
                            "trigger_words": "",
                            "storage": "Google Drive Vault",
                        }
        except Exception as e:
            logger.warning(f"Could not scan Google Drive for loras: {e}")

    return {"loras": list(loras.values())}


@app.post("/api/loras/load")
def load_loras_endpoint(req: LoRALoadRequest):
    """Dynamically load and fuse requested LoRAs into the GPU pipeline."""
    if not orchestrator.pipe or not orchestrator.is_ready:
        msg = f"GPU Pipeline is still warming up: {orchestrator.status_message}" if not orchestrator.is_ready else "GPU Pipeline is not ready yet."
        raise HTTPException(status_code=503, detail=msg)
    try:
        lora_dicts = [l.dict() for l in req.loras]
        orchestrator.apply_loras(lora_dicts)
        if len(req.loras) > 0 and len(orchestrator.active_loras) == 0:
            missing_names = [l.name for l in req.loras]
            raise HTTPException(
                status_code=400,
                detail=f"None of the requested LoRAs ({', '.join(missing_names)}) are downloaded in GPU storage yet. Please download them first via Civitai Hub or Vault."
            )
        return {
            "status": "success",
            "active_loras": orchestrator.active_loras,
            "message": f"Successfully loaded & fused {len(orchestrator.active_loras)} LoRA(s) into GPU DiT layers."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LoRA loading failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/loras/unload")
def unload_loras_endpoint():
    """Unload and unfuse all active LoRAs from the GPU pipeline."""
    touch_activity()
    if not orchestrator.pipe:
        return {"status": "success", "active_loras": {}}
    try:
        orchestrator.pipe.unfuse_lora()
        orchestrator.pipe.unload_lora_weights()
        orchestrator.active_loras = {}
        return {
            "status": "success",
            "active_loras": {},
            "message": "All LoRAs unloaded and unfused from GPU."
        }
    except Exception as e:
        logger.error(f"LoRA unloading failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/loras/download")
def download_lora(req: LoRADownloadRequest, background_tasks: BackgroundTasks):
    """Download a LoRA from Civitai / Civitai.red, sync to Google Drive, and auto-clean local copy."""
    touch_activity()
    name = req.name or f"lora_{int(time.time())}"
    if not name.endswith(".safetensors"):
        target_path = LORAS_DIR / f"{name}.safetensors"
    else:
        target_path = LORAS_DIR / name

    logger.info(f"Downloading LoRA from {req.url} -> {target_path}...")
    try:
        download_file_authenticated(req.url, target_path)
    except Exception as e:
        logger.error(f"Failed to download LoRA: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download LoRA: {e}")

    size_mb = round(target_path.stat().st_size / (1024 * 1024), 2)

    # Write persistent metadata record
    meta_file = LORAS_DIR / f"{target_path.stem}.meta.json"
    meta_data = {
        "name": req.name or target_path.stem,
        "filename": target_path.name,
        "trigger_words": req.trigger_words or "",
        "size_mb": size_mb,
        "download_url": req.url,
        "created_at": time.time(),
    }
    try:
        with open(meta_file, "w") as mf:
            json.dump(meta_data, mf)
        background_tasks.add_task(gdrive_sync_up, meta_file, "loras")
    except Exception as me:
        logger.warning(f"Could not write LoRA metadata: {me}")

    # Upload heavy safetensors to 5 TB Google Drive Vault AND auto-clean local file once verified!
    background_tasks.add_task(gdrive_upload_and_clean, target_path, "loras", False)

    return {
        "status": "success",
        "name": target_path.stem,
        "filename": target_path.name,
        "size_mb": size_mb,
        "trigger_words": req.trigger_words or "",
        "storage": "Google Drive Vault (AutoCleaned locally)"
    }


@app.post("/api/loras/upload")
async def upload_local_lora(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    trigger_words: Optional[str] = Form(""),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Upload a local .safetensors LoRA, register metadata, and sync to Google Drive Vault."""
    touch_activity()
    filename = file.filename or f"local_lora_{int(time.time())}.safetensors"
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    if not safe_filename.endswith(".safetensors"):
        safe_filename = f"{safe_filename}.safetensors"

    stem = safe_filename.replace(".safetensors", "")
    display_name = name or stem
    target_path = LORAS_DIR / safe_filename

    logger.info(f"Uploading local LoRA: {safe_filename} -> {target_path}...")
    try:
        with open(target_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
    except Exception as e:
        logger.error(f"Failed to save uploaded LoRA file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    size_mb = round(target_path.stat().st_size / (1024 * 1024), 2)
    meta_file = LORAS_DIR / f"{stem}.meta.json"
    meta_data = {
        "name": display_name,
        "filename": safe_filename,
        "trigger_words": trigger_words or "",
        "size_mb": size_mb,
        "source": "Local Upload",
        "created_at": time.time(),
    }
    try:
        with open(meta_file, "w") as mf:
            json.dump(meta_data, mf)
        if GDRIVE_ENABLED:
            background_tasks.add_task(gdrive_sync_up, meta_file, "loras")
            background_tasks.add_task(gdrive_sync_up, target_path, "loras")
    except Exception as me:
        logger.warning(f"Could not write LoRA metadata: {me}")

    return {
        "status": "success",
        "name": display_name,
        "filename": safe_filename,
        "size_mb": size_mb,
        "trigger_words": trigger_words or "",
        "storage": "Google Drive Vault & Local Cache" if GDRIVE_ENABLED else "Local Cache",
        "message": f"LoRA '{display_name}' ({size_mb} MB) uploaded successfully and ready for GPU fusing!"
    }


@app.post("/api/edit")
def edit_image(req: EditRequest):
    """Perform image editing with Qwen and active LoRAs (supports both async background task and sync)."""
    touch_activity()
    if not orchestrator.is_ready:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing. Please wait.")

    input_image = None
    if req.image_base64 and req.image_base64.strip():
        try:
            clean_b64 = req.image_base64
            if "base64," in clean_b64:
                clean_b64 = clean_b64.split("base64,")[1]
            img_bytes = base64.b64decode(clean_b64)
            input_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    lora_dicts = [l.dict() for l in req.loras] if req.loras else []

    if req.async_mode:
        task_id = str(uuid.uuid4())[:8]
        # Clean up old jobs (>30 mins) to prevent memory leak
        now = time.time()
        expired_tasks = [k for k, v in JOBS.items() if now - v.get("created_at", now) > 1800]
        for exp in expired_tasks:
            JOBS.pop(exp, None)

        JOBS[task_id] = {
            "task_id": task_id,
            "status": "queued",
            "stage": "Initializing Tesla T4 GPU Pipeline...",
            "progress": 5.0,
            "step": 0,
            "total_steps": req.num_inference_steps,
            "image_base64": None,
            "error": None,
            "prompt": req.prompt,
            "seed": req.seed,
            "created_at": now,
        }

        def async_worker():
            JOBS[task_id]["status"] = "processing"
            JOBS[task_id]["stage"] = "Encoding prompt & input image on Tesla T4..." if input_image else "Synthesizing text-to-image on Tesla T4..."
            JOBS[task_id]["progress"] = 8.0
            try:
                output_image = orchestrator.generate(
                    input_image=input_image,
                    prompt=req.prompt,
                    negative_prompt=req.negative_prompt,
                    true_cfg_scale=req.true_cfg_scale,
                    guidance_scale=req.guidance_scale,
                    num_inference_steps=req.num_inference_steps,
                    seed=req.seed,
                    height=req.height,
                    width=req.width,
                    task_id=task_id,
                    loras=lora_dicts
                )
                buffered = io.BytesIO()
                output_image.save(buffered, format="PNG")
                out_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                JOBS[task_id]["image_base64"] = f"data:image/png;base64,{out_b64}"
                JOBS[task_id]["status"] = "completed"
                JOBS[task_id]["stage"] = "Completed"
                JOBS[task_id]["progress"] = 100.0
                touch_activity()
            except Exception as exc:
                err_str = str(exc)
                logger.error(f"[{task_id}] Async generation error: {exc}", exc_info=True)
                try:
                    import torch
                    torch.cuda.empty_cache()
                    import gc
                    gc.collect()
                except Exception:
                    pass
                JOBS[task_id]["status"] = "failed"
                if "out of memory" in err_str.lower() or "cudaerrormemoryallocation" in err_str.lower():
                    JOBS[task_id]["error"] = "CUDA Out of Memory on Tesla T4. GPU cache auto-cleared. Please retry with 4 steps at 448px, or switch to Cloud AI."
                else:
                    JOBS[task_id]["error"] = err_str

        threading.Thread(target=async_worker, daemon=True).start()
        return {
            "status": "queued",
            "task_id": task_id,
            "message": "Inference task queued in background."
        }

    # Synchronous execution path
    try:
        output_image = orchestrator.generate(
            input_image=input_image,
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            true_cfg_scale=req.true_cfg_scale,
            guidance_scale=req.guidance_scale,
            num_inference_steps=req.num_inference_steps,
            seed=req.seed,
            height=req.height,
            width=req.width,
            loras=lora_dicts
        )

        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        out_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {
            "status": "success",
            "image_base64": f"data:image/png;base64,{out_b64}",
            "prompt": req.prompt,
            "seed": req.seed
        }
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")


@app.get("/api/edit/status/{task_id}")
def get_task_status(task_id: str):
    """Poll progress and retrieve output for an async image editing task."""
    touch_activity()
    if task_id not in JOBS:
        raise HTTPException(status_code=404, detail="Task not found")
    job = JOBS[task_id]
    return {
        "task_id": task_id,
        "status": job["status"],
        "stage": job.get("stage", "Processing"),
        "progress": job.get("progress", 0.0),
        "step": job.get("step", 0),
        "total_steps": job.get("total_steps", 20),
        "image_base64": job.get("image_base64"),
        "error": job.get("error")
    }


# ─── 4. SELF-HEALING CLOUDFLARE TUNNEL SUPERVISOR ────────────────────────────

def tunnel_supervisor(port: int = 8000):
    """Continuously ensures cloudflared is alive, connected to listening FastAPI, and synced."""
    cloudflared_bin = pathlib.Path("/kaggle/working/cloudflared" if os.path.exists("/kaggle") else "./cloudflared")
    if not cloudflared_bin.exists():
        logger.info("Installing cloudflared binary...")
        dl_cmd = f"curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o {cloudflared_bin} && chmod +x {cloudflared_bin}"
        subprocess.run(dl_cmd, shell=True, check=True)

    logger.info("Tunnel supervisor started. Waiting for FastAPI port 8000...")
    while True:
        # Check if local server is listening
        is_listening = False
        try:
            import urllib.request
            res = urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=2)
            if res.status == 200:
                is_listening = True
        except Exception:
            is_listening = False

        if not is_listening:
            time.sleep(2)
            continue

        # Port is listening! Launch cloudflared
        logger.info(f"Local FastAPI active. Connecting Cloudflare Tunnel on port {port}...")
        proc = subprocess.Popen(
            [str(cloudflared_bin), "tunnel", "--url", f"http://127.0.0.1:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        tunnel_url = None
        start_t = time.time()
        while time.time() - start_t < 35:
            line = proc.stdout.readline()
            if not line:
                break
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match:
                tunnel_url = match.group(0)
                break

        if tunnel_url:
            logger.info("=" * 60)
            logger.info(f"🚀 PUBLIC INGRESS LIVE: {tunnel_url}")
            logger.info(f"Swagger API Docs: {tunnel_url}/docs")
            logger.info("=" * 60)

            # Persist to Google Drive configs folder
            t_file = CONFIGS_DIR / "tunnel_url.txt"
            t_file.write_text(tunnel_url.strip())
            threading.Thread(target=gdrive_sync_up, args=(t_file, "configs")).start()

            # Auto-register with Vercel frontend registry
            try:
                import urllib.request, json
                reg_payload = json.dumps({"url": tunnel_url.strip()}).encode("utf-8")
                reg_req = urllib.request.Request(
                    "https://qwen-image-editor-studio.vercel.app/api/tunnel",
                    data=reg_payload,
                    headers={"Content-Type": "application/json", "User-Agent": "Kaggle-Tunnel-Supervisor"}
                )
                threading.Thread(target=urllib.request.urlopen, args=(reg_req,)).start()
                logger.info("📡 Auto-registered Cloudflare ingress with Vercel frontend!")
            except Exception as e:
                logger.warning(f"Vercel auto-registration note: {e}")

        # Wait on process; if it drops, supervisor loop restarts it cleanly
        proc.wait()
        logger.warning("Cloudflare Tunnel disconnected. Reconnecting in 3 seconds...")
        time.sleep(3)


# ─── 5. MAIN LAUNCH SEQUENCE ────────────────────────────────────────────────

def main():
    import uvicorn

    # Setup Google Drive storage via rclone
    try:
        from kaggle_secrets import UserSecretsClient
        user_secrets = UserSecretsClient()
        cid = user_secrets.get_secret("GDRIVE_CLIENT_ID")
        csec = user_secrets.get_secret("GDRIVE_CLIENT_SECRET")
        token = user_secrets.get_secret("GDRIVE_TOKEN_JSON")
        setup_rclone(cid, csec, token)
    except Exception as e:
        logger.info(f"Using autonomous rclone setup: {e}")
        setup_rclone()

    # 0. Load persistent idle watchdog schedule if available
    try:
        global AUTO_SHUTDOWN_ENABLED, IDLE_TIMEOUT_SECONDS
        conf_file = CONFIGS_DIR / "idle_config.json"
        if conf_file.exists():
            with open(conf_file, "r") as f:
                cdata = json.load(f)
                AUTO_SHUTDOWN_ENABLED = cdata.get("enabled", True)
                IDLE_TIMEOUT_SECONDS = int(cdata.get("timeout_minutes", 5)) * 60
                logger.info(f"Loaded persistent idle schedule: enabled={AUTO_SHUTDOWN_ENABLED}, timeout={IDLE_TIMEOUT_SECONDS // 60}m")
    except Exception as ie:
        logger.info(f"Idle config note: {ie}")

    # Start Inactivity & Quota Protection Watchdog in background
    threading.Thread(target=idle_watchdog, daemon=True).start()

    # 1. Start Tunnel Supervisor in background daemon thread
    threading.Thread(target=tunnel_supervisor, args=(8000,), daemon=True).start()

    # 2. Start Model Pipeline loading in background daemon thread
    threading.Thread(target=orchestrator.load_pipeline, daemon=True).start()

    # 3. Start FastAPI server immediately (Port 8000 is open right away!)
    logger.info("Starting FastAPI server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
