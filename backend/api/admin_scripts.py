from core import urls as U
import os
import asyncio
import subprocess
import json
import shlex
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import jwt

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
LOGS_DIR = os.path.join(BASE_DIR, "logs", "scripts")
CRON_FILE = os.path.join(BASE_DIR, "logs", "cron_jobs.json")

os.makedirs(SCRIPTS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

router = APIRouter(prefix=U.SCRIPTS["PREFIX"], tags=["Admin Scripts Controller"])

ACTIVE_PROCESSES = {}
HCM_TZ = pytz.timezone("Asia/Ho_Chi_Minh")
scheduler = AsyncIOScheduler(timezone=HCM_TZ)

HIDDEN_SCRIPTS = [
    "network_tunnel.py", ".bashrc", "auto_start.sh", "shutdown_ai.py", "shutdown.sh", "start_ai.py",
    "__init__.py", "status.sh"
]

def is_script_allowed(script_name: str) -> bool:
    if script_name.startswith("_") or script_name in HIDDEN_SCRIPTS: return False
    if not script_name.endswith(".py"): return False
    if script_name not in os.listdir(SCRIPTS_DIR): return False
    return True

def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Chưa cung cấp Token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if int(payload.get("role", 0)) != 1: raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền.")
        return payload
    except Exception: raise HTTPException(status_code=401, detail="Token hỏng.")

def load_cron_jobs():
    if os.path.exists(CRON_FILE):
        try:
            with open(CRON_FILE, "r") as f:
                data = json.load(f)
                # Tự động nâng cấp định dạng file JSON cũ lên bản mới
                for k, v in data.items():
                    if isinstance(v, str):
                        data[k] = {"expr": v, "auto_yes": False, "args": ""}
                    elif isinstance(v, dict) and "args" not in v:
                        v["args"] = ""
                return data
        except: return {}
    return {}

def save_cron_jobs(jobs_dict):
    with open(CRON_FILE, "w") as f: json.dump(jobs_dict, f, indent=4)

# 🚀 NÂNG CẤP ĐỘNG CƠ: BỔ SUNG TRUYỀN THAM SỐ (EXTRA ARGS)
async def execute_script_bg(script_name: str, trigger_type: str = "Manual", auto_yes: bool = False, extra_args: str = ""):
    if not is_script_allowed(script_name): return
    if script_name in ACTIVE_PROCESSES: return

    script_path = os.path.join(SCRIPTS_DIR, script_name)
    log_path = os.path.join(LOGS_DIR, f"{script_name}.log")
    
    with open(log_path, "a", encoding="utf-8") as log_file:
        time_str = datetime.now(HCM_TZ).strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"\n{'='*50}\n")
        log_file.write(f"🚀 BẮT ĐẦU CHẠY: {script_name} | Kích: {trigger_type} | Giờ: VN ({time_str})\n")
        if auto_yes: log_file.write(f"⚙️ Auto-Yes (-y) ĐÃ BẬT\n")
        if extra_args: log_file.write(f"⚙️ Tham số đính kèm: {extra_args}\n")
        log_file.write(f"{'='*50}\n")

    try:
        python_exec = os.path.expanduser("~/myenv/bin/python3") 
        cmd_args = ["-u", script_path]
        if auto_yes: cmd_args.append("-y")
        if extra_args: 
            cmd_args.extend(shlex.split(extra_args)) # Cắt chuỗi an toàn như Terminal

        process = await asyncio.create_subprocess_exec(
            python_exec, *cmd_args, 
            stdin=asyncio.subprocess.PIPE,
            stdout=open(log_path, "a"),
            stderr=subprocess.STDOUT
        )
        
        ACTIVE_PROCESSES[script_name] = process
        await process.wait()
        
    except Exception as e:
        with open(log_path, "a", encoding="utf-8") as log_file: log_file.write(f"\n❌ LỖI HỆ THỐNG: {str(e)}\n")
    finally:
        if script_name in ACTIVE_PROCESSES: del ACTIVE_PROCESSES[script_name]
        with open(log_path, "a", encoding="utf-8") as log_file:
            time_str = datetime.now(HCM_TZ).strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"\n🏁 KẾT THÚC: {script_name} lúc {time_str}\n")

def restore_schedules():
    jobs = load_cron_jobs()
    for script_name, config in list(jobs.items()):
        if not is_script_allowed(script_name):
            del jobs[script_name]
            continue
        try:
            scheduler.add_job(
                execute_script_bg, CronTrigger.from_crontab(config["expr"], timezone=HCM_TZ),
                args=[script_name, "Cronjob", config.get("auto_yes", False), config.get("args", "")],
                id=f"job_{script_name}", replace_existing=True
            )
        except Exception: pass
    save_cron_jobs(jobs)

@router.get("/list")
async def list_scripts(admin=Depends(verify_admin_token)):
    if not os.path.exists(SCRIPTS_DIR): return {"status": "success", "scripts": []}
    scripts = [f for f in os.listdir(SCRIPTS_DIR) if is_script_allowed(f)]
    cron_jobs = load_cron_jobs()
    
    result = []
    for sc in scripts:
        cron_info = cron_jobs.get(sc)
        cron_str = ""
        if cron_info:
            auto_badge = " [+AutoYes]" if cron_info.get("auto_yes") else ""
            args_badge = " [+Args]" if cron_info.get("args") else ""
            cron_str = f"{cron_info['expr']}{auto_badge}{args_badge}"

        result.append({
            "name": sc,
            "status": "running" if sc in ACTIVE_PROCESSES else "stopped",
            "cron": cron_str,
            "raw_cron_expr": cron_info["expr"] if cron_info else "",
            "raw_auto_yes": cron_info["auto_yes"] if cron_info else False,
            "raw_args": cron_info["args"] if cron_info else ""
        })
    return {"status": "success", "scripts": result}

@router.post("/start/{script_name}")
async def start_script(script_name: str, auto_yes: bool = False, admin=Depends(verify_admin_token)):
    if not is_script_allowed(script_name): raise HTTPException(status_code=403, detail="Script này được bảo vệ!")
    if script_name in ACTIVE_PROCESSES: raise HTTPException(status_code=400, detail="ĐANG CHẠY rồi!")
    asyncio.create_task(execute_script_bg(script_name, "Manual", auto_yes))
    return {"status": "success"}

@router.post("/stop/{script_name}")
async def stop_script(script_name: str, admin=Depends(verify_admin_token)):
    if script_name not in ACTIVE_PROCESSES: raise HTTPException(status_code=400, detail="Script hiện không chạy.")
    ACTIVE_PROCESSES[script_name].terminate() 
    del ACTIVE_PROCESSES[script_name]
    log_path = os.path.join(LOGS_DIR, f"{script_name}.log")
    with open(log_path, "a", encoding="utf-8") as log_file: log_file.write(f"\n⚠️ BỊ TIÊU DIỆT BỞI ADMIN LÚC {datetime.now(HCM_TZ).strftime('%H:%M:%S')}\n")
    return {"status": "success"}

@router.get("/logs/{script_name}")
async def get_script_logs(script_name: str, admin=Depends(verify_admin_token)):
    if not is_script_allowed(script_name): raise HTTPException(status_code=403, detail="Tài liệu mật!")
    log_path = os.path.join(LOGS_DIR, f"{script_name}.log")
    if not os.path.exists(log_path): return {"status": "success", "logs": "Chưa có dữ liệu..."}
    with open(log_path, "r", encoding="utf-8") as f: return {"status": "success", "logs": "".join(f.readlines()[-150:])}

class ScriptInput(BaseModel): command: str
@router.post("/input/{script_name}")
async def send_input(script_name: str, req: ScriptInput, admin=Depends(verify_admin_token)):
    if script_name not in ACTIVE_PROCESSES: raise HTTPException(status_code=400, detail="Script hiện không chạy.")
    process = ACTIVE_PROCESSES[script_name]
    if process.stdin:
        process.stdin.write((req.command + "\n").encode("utf-8"))
        await process.stdin.drain()
        with open(os.path.join(LOGS_DIR, f"{script_name}.log"), "a", encoding="utf-8") as log_file: log_file.write(f"{req.command}\n")
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Không có cổng nhập liệu.")

# 🚀 API TÍNH TOÁN THỜI GIAN CHẠY TIẾP THEO (NEXT RUN PREVIEW)
class CronPreviewRequest(BaseModel): cron_expr: str
@router.post("/cron-preview")
async def preview_cron(req: CronPreviewRequest, admin=Depends(verify_admin_token)):
    try:
        trigger = CronTrigger.from_crontab(req.cron_expr, timezone=HCM_TZ)
        current = datetime.now(HCM_TZ)
        runs = []
        for _ in range(3):
            current = trigger.get_next_fire_time(None, current)
            if not current: break
            runs.append(current.strftime("%H:%M:%S | Ngày %d/%m/%Y"))
        return {"status": "success", "runs": runs}
    except Exception:
        raise HTTPException(status_code=400, detail="Biểu thức Cron không hợp lệ")

# 🚀 NÂNG CẤP API CÀI ĐẶT LỊCH
class CronRequest(BaseModel): 
    cron_expr: str
    auto_yes: bool = False
    args: str = ""

@router.post("/schedule/{script_name}")
async def set_schedule(script_name: str, req: CronRequest, admin=Depends(verify_admin_token)):
    if not is_script_allowed(script_name): raise HTTPException(status_code=403, detail="Lỗi bảo mật!")
    CronTrigger.from_crontab(req.cron_expr, timezone=HCM_TZ)
    
    scheduler.add_job(
        execute_script_bg, CronTrigger.from_crontab(req.cron_expr, timezone=HCM_TZ), 
        args=[script_name, "Cronjob", req.auto_yes, req.args], 
        id=f"job_{script_name}", replace_existing=True
    )
    
    jobs = load_cron_jobs()
    jobs[script_name] = {"expr": req.cron_expr, "auto_yes": req.auto_yes, "args": req.args}
    save_cron_jobs(jobs)
    return {"status": "success"}

@router.post("/unschedule/{script_name}")
async def remove_schedule(script_name: str, admin=Depends(verify_admin_token)):
    jobs = load_cron_jobs()
    if script_name in jobs:
        del jobs[script_name]
        save_cron_jobs(jobs)
    try: scheduler.remove_job(f"job_{script_name}")
    except: pass
    return {"status": "success"}