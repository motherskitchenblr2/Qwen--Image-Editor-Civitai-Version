#!/usr/bin/env python3
"""
Kaggle Dual Tesla T4 Launcher & Live Tunnel Waiter
Triggers the Kaggle GPU kernel and waits for the Cloudflare Tunnel URL to be posted to Google Drive Vault.
"""

import os
import sys
import json
import time
import urllib.request
import subprocess
from pathlib import Path

USERNAME = "developerchief"
KERNEL_SLUG = "qwen-image-editor-civitai-version"
GDRIVE_FILE_ID = "1CsejFXhS81WTExe1EdQIuT0Glo0KDE4h"
GDRIVE_DIRECT_URL = f"https://drive.google.com/uc?export=download&id={GDRIVE_FILE_ID}"
VERCEL_STATUS_URL = "https://qwen-image-editor-studio.vercel.app/api/tunnel"

def start_kernel():
    print("=" * 60)
    print("🚀 BOOTING KAGGLE DUAL TESLA T4 WORKSTATION")
    print("=" * 60)
    
    # Check if local notebook exists
    backend_dir = Path("/data/data/com.termux/files/home/image-editor-project/backend")
    notebook_path = backend_dir / "qwen_image_editor_backend.ipynb"
    
    if not notebook_path.exists():
        print(f"❌ Notebook not found at {notebook_path}")
        sys.exit(1)
        
    print(f"📦 Packaging and pushing kernel {USERNAME}/{KERNEL_SLUG}...")
    res = subprocess.run(["kaggle", "kernels", "push", "-p", str(backend_dir), "-t", "60"], capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print(res.stderr)
        
    if res.returncode != 0:
        print("❌ Push failed. Attempting via Vercel start endpoint...")
        try:
            req = urllib.request.Request("https://qwen-image-editor-studio.vercel.app/api/backend/start", method="POST")
            with urllib.request.urlopen(req, timeout=15) as resp:
                print(f"Vercel trigger response: {resp.status}")
        except Exception as e:
            print(f"Vercel trigger error: {e}")

    print("\n⏳ Kaggle container is allocating Dual Tesla T4s (~90 seconds)...")
    print("🔍 Watching for live Cloudflare Tunnel URL in Google Drive Vault...")
    
    start_time = time.time()
    last_url = None
    
    for attempt in range(1, 45):
        time.sleep(4)
        elapsed = int(time.time() - start_time)
        try:
            req = urllib.request.Request(
                GDRIVE_DIRECT_URL,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                body = r.read().decode("utf-8").strip()
                if body.startswith("https://") and "trycloudflare.com" in body:
                    url = body.split("\n")[0].strip()
                    # Verify health
                    try:
                        health_req = urllib.request.Request(f"{url}/api/health", headers={"User-Agent": "HealthCheck/1.0"})
                        with urllib.request.urlopen(health_req, timeout=5) as hr:
                            if hr.status == 200:
                                h_data = json.loads(hr.read().decode("utf-8"))
                                print("\n" + "=" * 60)
                                print("✅ DUAL TESLA T4 GPU BACKEND IS ONLINE & READY!")
                                print("=" * 60)
                                print(f"🔗 Cloudflare Tunnel: {url}")
                                print(f"🌐 Web Studio:        https://qwen-image-editor-studio.vercel.app")
                                print(f"⚡ VRAM Available:    {h_data.get('vram', {})}")
                                print("=" * 60)
                                print("✨ The Web Studio has auto-connected to this GPU! You can start editing images now.")
                                return
                    except Exception:
                        pass
        except Exception:
            pass
            
        print(f"\r⏳ Elapsed: {elapsed}s | Waiting for GPU boot and model warming...", end="", flush=True)

    print("\n⚠️ Boot is taking longer than expected. Check 'kaggle kernels status developerchief/qwen-image-editor-civitai-version'")

if __name__ == "__main__":
    start_kernel()
