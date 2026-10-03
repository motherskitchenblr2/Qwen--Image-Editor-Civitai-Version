#!/usr/bin/env python3
"""
Kaggle GPU Quota Guard & Session Terminator
Provides comprehensive tools to monitor, stop, and emergency-kill Kaggle GPU sessions.
"""

import os
import sys
import json
import time
import shutil
import tempfile
import subprocess
import urllib.request
from typing import Dict, Any, List

USERNAME = "developerchief"
DEFAULT_KERNEL = "qwen-image-editor-civitai-version"

def get_quota() -> Dict[str, Any]:
    """Fetch accelerator quota statistics from Kaggle SDK."""
    try:
        from kagglesdk import KaggleClient
        client = KaggleClient()
        stats = client.kernels.kernels_api_client.get_accelerator_quota_statistics()
        data = stats.to_dict() if hasattr(stats, "to_dict") else {}
        return data
    except Exception as e:
        return {"error": str(e)}

def print_quota_summary():
    """Display user GPU quota and time reserved."""
    q = get_quota()
    print("\n" + "=" * 55)
    print("📊 KAGGLE ACCELERATOR QUOTA STATUS")
    print("=" * 55)
    if "error" in q:
        print(f"⚠️ Could not fetch quota: {q['error']}")
        return

    gpu = q.get("gpuQuota", {})
    tpu = q.get("tpuQuota", {})
    refresh = q.get("quotaRefreshTime", "N/A")

    time_used = gpu.get("timeUsed", "0s")
    time_reserved = gpu.get("timeReserved", "0s")
    total_allowed = gpu.get("totalTimeAllowed", "21600s")

    # Parse seconds
    try:
        used_sec = float(time_used.replace("s", "").split(".")[0])
        total_sec = float(total_allowed.replace("s", "").split(".")[0])
        used_hrs = round(used_sec / 3600, 2)
        total_hrs = round(total_sec / 3600, 1)
        remaining_hrs = max(0.0, round(total_hrs - used_hrs, 2))
    except Exception:
        used_hrs = time_used
        total_hrs = total_allowed
        remaining_hrs = "N/A"

    print(f"• GPU Weekly Limit    : {total_hrs} hours")
    print(f"• GPU Time Used       : {used_hrs} hours")
    print(f"• GPU Time Remaining  : {remaining_hrs} hours")
    print(f"• Currently Reserved  : {time_reserved} (0s = No GPU active)")
    print(f"• Quota Resets At     : {refresh}")
    if time_reserved != "0s":
        print("🚨 WARNING: A GPU session is currently actively RESERVED!")
    else:
        print("✅ Safe: 0 GPU time actively reserved right now.")
    print("=" * 55 + "\n")

def check_active_kernels() -> List[Dict[str, str]]:
    """Check status of all user kernels."""
    active = []
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        for slug in [f"{USERNAME}/{DEFAULT_KERNEL}", f"{USERNAME}/comfyui"]:
            try:
                res = api.kernels_status(slug)
                status = res.get("status", "UNKNOWN") if isinstance(res, dict) else str(res)
                print(f"Kernel [{slug}]: {status}")
                if "RUNNING" in status or "QUEUED" in status:
                    active.append({"slug": slug, "status": status})
            except Exception as e:
                print(f"Kernel [{slug}]: check failed ({e})")
    except Exception as e:
        print(f"Error checking kernels: {e}")
    return active

def stop_via_tunnel() -> bool:
    """Attempt clean shutdown via live Cloudflare tunnel."""
    print("📡 Fetching active tunnel URL from Google Drive...")
    try:
        proc = subprocess.run(
            ["rclone", "cat", "gdrive:AI_Storage/configs/tunnel_url.txt"],
            capture_output=True, text=True, timeout=8
        )
        url = proc.stdout.strip()
    except Exception:
        url = ""

    if not url or "http" not in url:
        print("ℹ️ No active tunnel URL discovered.")
        return False

    print(f"🚀 Found active Cloudflare tunnel: {url}")
    print("🛑 Sending /api/shutdown signal...")
    try:
        req = urllib.request.Request(f"{url}/api/shutdown", method="POST")
        with urllib.request.urlopen(req, timeout=6) as response:
            res_data = response.read().decode("utf-8")
            if "shutting_down" in res_data:
                print("✅ Remote backend confirmed shutdown! GPU instance deallocating.")
                return True
    except Exception as e:
        print(f"Tunnel shutdown note: {e}")
    return False

def emergency_supersede_kill(kernel_slug: str = DEFAULT_KERNEL):
    """
    Kaggle has no direct cancel CLI command, but Kaggle automatically kills any
    running kernel when a new version is pushed.
    We push a 0-GPU, 1-line exit notebook that halts the GPU run instantly!
    """
    print(f"🚨 Performing EMERGENCY SUPERSEDE KILL on {USERNAME}/{kernel_slug}...")
    temp_dir = tempfile.mkdtemp(prefix="kaggle_kill_")
    try:
        nb_path = os.path.join(temp_dir, "emergency_stop.ipynb")
        meta_path = os.path.join(temp_dir, "kernel-metadata.json")

        nb_content = {
            "cells": [
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# EMERGENCY QUOTA KILL STUB\n",
                        "import os\n",
                        "print('✅ GPU Run cleanly superseded and stopped.')\n",
                        "os._exit(0)\n"
                    ]
                }
            ],
            "metadata": {
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                "language_info": {"name": "python", "version": "3.12"},
                "kaggle": {"accelerator": "none", "isGpuEnabled": False, "isInternetEnabled": False}
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        with open(nb_path, "w") as f:
            json.dump(nb_content, f)

        meta_content = {
            "id": f"{USERNAME}/{kernel_slug}",
            "title": "Qwen -Image-Editor-Civitai-Version",
            "code_file": "emergency_stop.ipynb",
            "language": "python",
            "kernel_type": "notebook",
            "is_private": False,
            "enable_gpu": False,
            "enable_internet": False,
            "dataset_sources": [],
            "competition_sources": [],
            "kernel_sources": [],
            "model_sources": []
        }
        with open(meta_path, "w") as f:
            json.dump(meta_content, f)

        print("⚡ Pushing 0-GPU immediate exit stub to Kaggle...")
        res = subprocess.run(["kaggle", "kernels", "push", "-p", temp_dir, "-t", "60"], capture_output=True, text=True)
        print(res.stdout)
        if res.returncode == 0:
            print("✅ Emergency push accepted! Runaway GPU session superseded and killed.")
            return True
        else:
            print(f"⚠️ Emergency push response: {res.stderr}")
            return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def stop_all_gpu_sessions():
    """Multi-tiered stop sequence ensuring zero running GPU sessions."""
    print("🛑 Initiating GPU Stop Sequence...")

    # Tier 1: Try clean shutdown via active Cloudflare tunnel
    tunnel_stopped = stop_via_tunnel()

    print("\n⏳ Checking kernel execution state...")
    time.sleep(3)
    active = check_active_kernels()

    # Tier 2: If any kernel is still RUNNING or QUEUED, use Emergency Supersede Kill
    for item in active:
        slug = item["slug"].split("/")[-1]
        print(f"\n⚠️ Kernel {item['slug']} is {item['status']}. Triggering emergency halt...")
        emergency_supersede_kill(slug)

    # Re-verify
    print("\n🔍 Final verification...")
    time.sleep(3)
    check_active_kernels()
    print_quota_summary()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["--check", "-c", "status"]:
        check_active_kernels()
        print_quota_summary()
    elif len(sys.argv) > 1 and sys.argv[1] in ["--force", "-f", "force"]:
        emergency_supersede_kill()
        print_quota_summary()
    else:
        stop_all_gpu_sessions()
