#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy.py — Push code từ thư mục gốc dự án lên GitHub Repo
============================================================
Đặt file này ở thư mục gốc dự án (vd: ubuntu-d4m/deploy.py), rồi chạy:

    python deploy.py                 # đẩy code lên repo
    python deploy.py --dry-run       # chỉ liệt kê file sẽ đẩy, không upload
    python deploy.py -m "message"    # đẩy với commit message tùy chọn
    python deploy.py --branch dev    # đẩy lên nhánh dev
    python deploy.py -y              # bỏ qua mọi xác nhận

Cấu hình nằm trong file .env đặt cạnh script (thư mục gốc dự án):

    GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
    GITHUB_REPO=d4m-dev/ubuntu-d4m          # owner/repo
    GITHUB_BRANCH=main                      # (tuỳ chọn, mặc định main)
    UPLOAD_CONCURRENCY=4                    # (tuỳ chọn, mặc định 4)
    MAX_FILE_MB=0                           # bỏ qua file > X MB (0 = không giới hạn)

Dùng GitHub Contents API + Git Data API (tạo blob song song, 1 commit duy nhất),
kèm retry tự động và fallback nếu gặp lỗi "tree quá lớn" (HTTP 504).
"""

import os
import re
import sys
import json
import base64
import random
import shutil
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
except ImportError:
    sys.exit("Thiếu thư viện 'requests'. Chạy:  pip install requests")

# ---------------------------------------------------------------------------
# Cấu hình & đọc .env
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, ".env")

DEFAULT_EXCLUDES = {
    ".git", "node_modules", "venv", ".venv", "env", "dist", "build",
    "__pycache__", ".next", ".nuxt", ".cache", ".idea", ".vscode",
    ".pytest_cache", ".mypy_cache", ".tox", ".sass-cache", "coverage",
    ".DS_Store", "Thumbs.db", ".gitattributes",
    "*.pyc", "*.pyo", ".ipynb_checkpoints", "out", "target", ".turbo",
}

GH_API = "https://api.github.com"
_TRANSIENT_HTTP = {401, 403, 429, 500, 502, 503, 504}


def load_env():
    """Đọc cặp KEY=VALUE từ file .env (tự parse, không cần thư viện)."""
    if not os.path.isfile(ENV_FILE):
        sys.exit(f"Không tìm thấy {ENV_FILE}. Hãy tạo file .env gồm GITHUB_TOKEN và GITHUB_REPO.")
    env = {}
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def is_binary(data: bytes) -> bool:
    return b"\x00" in data


def sleep_backoff(attempt):
    time.sleep(min(0.5 * (2 ** attempt), 8) + random.uniform(0, 0.4))


def request_gh(token, method, url, **kwargs):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "deploy.py",
    }
    headers.update(kwargs.pop("headers", {}))
    return requests.request(method, url, headers=headers, timeout=45, **kwargs)


def collect_files(folder, extra_excludes, max_bytes):
    """Duyệt thư mục, trả về (abs_path, rel_path) đã lọc."""
    excl = set(DEFAULT_EXCLUDES) | set(extra_excludes)
    files = []
    for root, dirs, fnames in os.walk(folder):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in excl]
        for fn in sorted(fnames):
            rel = os.path.relpath(os.path.join(root, fn), folder).replace(os.sep, "/")
            if any(p in excl for p in rel.split("/")):
                continue
            abs_path = os.path.join(root, fn)
            if max_bytes:
                try:
                    if os.path.getsize(abs_path) > max_bytes:
                        continue
                except OSError:
                    continue
            files.append((abs_path, rel))
    return files


# ---------------------------------------------------------------------------
# UPLOAD — Git Data API (nhanh, 1 commit) + fallback Contents API
# ---------------------------------------------------------------------------
def create_blob(token, owner, name, path, raw, max_attempts=4):
    payload = ({"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"}
               if is_binary(raw) else
               {"content": raw.decode("utf-8", errors="replace"), "encoding": "utf-8"})
    url = f"{GH_API}/repos/{owner}/{name}/git/blobs"
    last_err = None
    for attempt in range(max_attempts):
        try:
            r = request_gh(token, "POST", url, json=payload)
            if r.status_code in (200, 201):
                return r.json().get("sha")
            if r.status_code in _TRANSIENT_HTTP:
                last_err = RuntimeError(f"{path}: HTTP {r.status_code}")
                sleep_backoff(attempt)
                continue
            raise RuntimeError(f"{path}: HTTP {r.status_code} {r.text[:150]}")
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout,
                requests.exceptions.SSLError) as e:
            last_err = e
            sleep_backoff(attempt)
    raise last_err if last_err else RuntimeError(f"{path}: thất bại sau {max_attempts} lần")


def upload_via_contents(token, owner, name, files, branch, message):
    """Dự phòng: upload từng file qua Contents API (không lỗi tree 504)."""
    print(f"→ Dự phòng Contents API ({len(files)} file)...")
    uploaded, failed, fail_msgs = 0, 0, []
    for abs_path, rel in files:
        try:
            with open(abs_path, "rb") as f:
                raw = f.read()
            payload = {"message": message, "branch": branch}
            if is_binary(raw):
                payload.update(content=base64.b64encode(raw).decode("ascii"), encoding="base64")
            else:
                payload["content"] = raw.decode("utf-8", errors="replace")
            r = request_gh(token, "PUT", f"{GH_API}/repos/{owner}/{name}/contents/{rel}",
                           json=payload)
            if r.status_code not in (200, 201):
                gr = request_gh(token, "GET",
                                f"{GH_API}/repos/{owner}/{name}/contents/{rel}",
                                params={"ref": branch})
                if gr.status_code == 200:
                    payload["sha"] = gr.json().get("sha")
                    r = request_gh(token, "PUT",
                                   f"{GH_API}/repos/{owner}/{name}/contents/{rel}",
                                   json=payload)
                if r.status_code not in (200, 201):
                    raise RuntimeError(f"HTTP {r.status_code} {r.text[:150]}")
            uploaded += 1
            if uploaded % 25 == 0:
                print(f"   ... {uploaded}/{len(files)}")
        except Exception as e:
            failed += 1
            fail_msgs.append(f"{rel}: {e}")
    print(f"✓ Hoàn tất (Contents API): {uploaded} file, {failed} lỗi.")
    if fail_msgs:
        print("Danh sách lỗi:")
        for m in fail_msgs[:30]:
            print("  ✗ " + m)
    return uploaded, failed


def deploy(token, owner, name, folder, branch, message, extra_excludes, max_bytes,
           dry_run=False):
    files = collect_files(folder, extra_excludes, max_bytes)
    print(f"→ Tìm thấy {len(files)} file trong thư mục.")

    if dry_run:
        print("→ [dry-run] Không upload. Danh sách file sẽ được đẩy lên:")
        for _, rel in files:
            print("   + " + rel)
        print(f"→ [dry-run] Tổng {len(files)} file.")
        return True

    if not files:
        print("→ Không có file nào để đẩy.")
        return True

    # Xác định parent SHA (kiểm tra repo trống)
    parent_sha = None
    for b in [branch]:
        try:
            ref = request_gh(token, "GET",
                             f"{GH_API}/repos/{owner}/{name}/git/ref/heads/{b}")
            if ref.status_code == 200:
                parent_sha = ref.json().get("object", {}).get("sha")
                break
        except Exception:
            pass

    if parent_sha is None:
        # repo trống → Contents API khởi tạo trước
        print("→ Repo trống hoặc chưa có branch — dùng Contents API.")
        upload_via_contents(token, owner, name, files, branch, message)
        return True

    # Git Data API: tạo blob song song
    entries, failures = [], []
    print(f"→ Tạo blob song song (branch {branch})...")
    with ThreadPoolExecutor(max_workers=UPLOAD_CONCURRENCY) as ex:
        fut_map = {ex.submit(create_blob, token, owner, name, rel,
                             open(abs_path, "rb").read()): rel
                   for abs_path, rel in files}
        total = len(fut_map)
        done = 0
        for fut in as_completed(fut_map):
            rel = fut_map[fut]
            done += 1
            try:
                sha = fut.result()
                entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": sha})
            except Exception as e:
                failures.append(f"{rel}: {e}")
            if done % 50 == 0 or done == total:
                print(f"   ... {done}/{total} blob")
    print(f"→ Đã tạo {len(entries)} blob, {len(failures)} lỗi.")
    if not entries:
        print("✗ Không tạo được blob nào.")
        return False

    # tạo tree (retry; nếu 504 → fallback Contents API)
    tree_sha = None
    tree_payload = {"tree": entries}
    if parent_sha:
        tree_payload["base_tree"] = parent_sha
    for attempt in range(3):
        try:
            tr = request_gh(token, "POST", f"{GH_API}/repos/{owner}/{name}/git/trees",
                            json=tree_payload)
            if tr.status_code in (200, 201):
                tree_sha = tr.json().get("sha")
                break
            if tr.status_code in _TRANSIENT_HTTP:
                if attempt == 2:
                    print("⚠ Tree quá lớn (HTTP 504) — chuyển sang Contents API.")
                    upload_via_contents(token, owner, name, files, branch, message)
                    return True
                sleep_backoff(attempt)
                continue
            print(f"✗ Lỗi tạo tree: HTTP {tr.status_code}")
            return False
        except Exception as e:
            if attempt == 2:
                print("⚠ Không tạo được tree — chuyển sang Contents API: " + str(e))
                upload_via_contents(token, owner, name, files, branch, message)
                return True
            sleep_backoff(attempt)
    if not tree_sha:
        print("✗ Không tạo được tree.")
        return False

    # tạo commit
    commit_payload = {"message": message, "tree": tree_sha,
                      "parents": [parent_sha] if parent_sha else []}
    cr = request_gh(token, "POST", f"{GH_API}/repos/{owner}/{name}/git/commits",
                    json=commit_payload)
    if cr.status_code not in (200, 201):
        print(f"✗ Lỗi tạo commit: HTTP {cr.status_code}")
        return False
    commit_sha = cr.json().get("sha")

    # cập nhật ref (branch)
    up = request_gh(token, "PATCH",
                    f"{GH_API}/repos/{owner}/{name}/git/refs/heads/{branch}",
                    json={"sha": commit_sha, "force": False})
    if up.status_code not in (200, 201):
        cr2 = request_gh(token, "POST", f"{GH_API}/repos/{owner}/{name}/git/refs",
                         json={"ref": f"refs/heads/{branch}", "sha": commit_sha})
        if cr2.status_code not in (200, 201):
            print(f"✗ Lỗi cập nhật branch: HTTP {up.status_code}")
            return False

    print(f"✓ Push thành công! Commit {commit_sha[:8]} → {owner}/{name} ({branch}).")
    if failures:
        print("Cảnh báo — một số file không đẩy được:")
        for m in failures[:30]:
            print("  ✗ " + m)
    return True


def main():
    parser = argparse.ArgumentParser(description="deploy.py — push code lên GitHub")
    parser.add_argument("--dry-run", action="store_true", help="chỉ liệt kê, không upload")
    parser.add_argument("-m", "--message", default=None, help="commit message tùy chọn")
    parser.add_argument("--branch", default=None, help="branch đích")
    parser.add_argument("-y", "--yes", action="store_true", help="bỏ qua xác nhận")
    parser.add_argument("--exclude", action="append", default=[],
                        help="thư mục/file bỏ qua thêm (dùng nhiều lần)")
    args = parser.parse_args()

    env = load_env()
    token = env.get("GITHUB_TOKEN", "").strip()
    repo = env.get("GITHUB_REPO", "").strip()
    branch = args.branch or env.get("GITHUB_BRANCH", "").strip() or "main"
    concurrency = int(env.get("UPLOAD_CONCURRENCY", "4") or "4")
    max_mb = int(env.get("MAX_FILE_MB", "0") or "0")

    global UPLOAD_CONCURRENCY
    UPLOAD_CONCURRENCY = concurrency

    if not token or not token.startswith("ghp_"):
        sys.exit("Thiếu hoặc sai GITHUB_TOKEN trong .env (phải bắt đầu bằng ghp_).")
    if "/" not in repo:
        sys.exit("Thiếu GITHUB_REPO trong .env (định dạng owner/repo, vd d4m-dev/ubuntu-d4m).")
    owner, name = repo.split("/", 1)

    print("=" * 60)
    print("  deploy.py — Push code lên GitHub")
    print("=" * 60)
    print(f"  Repo   : {owner}/{name}")
    print(f"  Branch : {branch}")
    print(f"  Thư mục: {SCRIPT_DIR}")

    # xác thực token
    me = request_gh(token, "GET", f"{GH_API}/user")
    if me.status_code != 200:
        sys.exit(f"✗ Token không hợp lệ (HTTP {me.status_code}).")
    print(f"  Xác thực: @{me.json().get('login', '?')}")

    # xác nhận
    if not args.yes and not args.dry_run:
        ans = input(f"Đẩy code lên {owner}/{name} ({branch})? (y/n): ").lower().strip()
        if ans != "y":
            print("Đã hủy.")
            sys.exit(0)

    message = args.message or f"deploy.py: update {time.strftime('%Y-%m-%d %H:%M:%S')}"
    ok = deploy(token, owner, name, SCRIPT_DIR, branch, message,
                args.exclude, max_mb * 1024 * 1024, args.dry_run)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
