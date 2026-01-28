import asyncio
from datetime import datetime
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import sys
import threading
import time
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from backend.pdf_utils.send_mail import send_mail
from backend.models import Payload
from backend.pdf_utils.pdf_utils import form2_to_tsv, generate_merged_forms, readDefaults
from fastapi.middleware.cors import CORSMiddleware
from backend.json_to_excel import combine_json_to_excel
from starlette.exceptions import HTTPException as StarletteHTTPException



class SetPassBody(BaseModel):
    newPass: str


# Submission password - change this for your deployment

defaults = readDefaults()
password = defaults.get("password", "").strip()
SUBMISSION_PASSWORD = password if password else secrets.token_urlsafe(12)


if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))


DATE_NAME = "PF_"+str(datetime.now().strftime("%d-%m-%Y"))
JSON_INPUT_DIR = os.path.join(BASE_DIR, "output")
EXCEL_OUTPUT_FILE = os.path.join(BASE_DIR,"output", f"{DATE_NAME}.xlsx")


# Output directory for generated files
OUTPUT_DIR = Path.cwd() / "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Filename"],
)



@app.post("/api/forms/process", status_code=status.HTTP_200_OK)
def process_forms(payload: Payload, background_tasks: BackgroundTasks, request: Request):
    # Validate password
    
    member_name = payload.forms.form_11.personal_details.member_name
    
    if payload.password != request.app.state.SUBMISSION_PASSWORD:
        print(f"🔴 Submission attempt by {member_name} blocked: Invalid password")
        raise HTTPException(status_code=401, detail="Invalid password")
    
    forms = payload.forms
    docs = payload.documents
    
    
    uan = forms.form_11.previous_employment.uan or ""
    dob = forms.form_11.personal_details.date_of_birth
    
    # Sanitize filename
    safe_name = "".join(c for c in member_name if c.isalnum() or c in (' ', '-', '_')).strip().upper()
    safe_uan = "".join(c for c in uan if c.isalnum()).strip()
    safe_dob = "".join(c for c in str(dob))
    
    base_filename = f"{safe_name}_{safe_dob}" if safe_dob else safe_name
    
    # Ensure output folders exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "TSV"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "PDF"), exist_ok=True)
    
    # Save TSV file
    tsv_path = os.path.join(OUTPUT_DIR, "TSV", f"{base_filename}.tsv")
    with open(tsv_path, "w", encoding="utf-8") as f:
        f.write(form2_to_tsv(payload.forms))
        
    # Save JSON file
    
    json_path = os.path.join(OUTPUT_DIR, f"{base_filename}.json")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload.model_dump(), f, indent=2, default=str)
    
    # Generate PDF
    pdf_path = os.path.join(OUTPUT_DIR, "PDF", f"{base_filename}.pdf")
    generate_merged_forms(pdf_path, forms, docs)


    # Send mail

    background_tasks.add_task(
        send_mail,
        name = safe_name,
        UAN = safe_uan,
        attachment_path = pdf_path,
    )
    
    print(f"PDF generated: {base_filename}")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{base_filename}.pdf",
        headers={
            "X-Filename": f"{base_filename}.pdf",
        },
    )
    

def require_admin(request: Request):
    if request.cookies.get("admin_session") != "1":
        raise HTTPException(status_code=403)
    
    

frontend_connected = False
last_seen = None
KILL_AFTER = 15  # seconds


@app.websocket("/ws/heartbeat")
async def heartbeat_ws(ws: WebSocket):
    global frontend_connected, last_seen

    if ws.cookies.get("admin_session") != "1":
        await ws.close(code=4401)
        return

    await ws.accept()

    frontend_connected = True
    last_seen = time.time()
    print("🟢 Frontend connected")

    try:
        while True:
            msg = await ws.receive_text()  # blocks (good)
            if msg == "ping":
                last_seen = time.time()
    except WebSocketDisconnect:
        frontend_connected = False
        last_seen = time.time()
        print("🔴 Frontend disconnected")

async def ws_watchdog():
    global frontend_connected, last_seen

    while True:
        await asyncio.sleep(2)

        if not frontend_connected:
            if last_seen and time.time() - last_seen > KILL_AFTER:
                print("❌ Frontend gone, shutting down")
                delayed_kill(1.0)
                break



@app.get("/admin")
def serve_admin(request: Request, token: str | None = None):
    ONE_TIME_ADMIN_TOKEN = getattr(request.app.state, "ONE_TIME_ADMIN_TOKEN", None)

    # 1️⃣ First-time unlock via OTA
    if token and token == ONE_TIME_ADMIN_TOKEN:
        # consume OTA
        request.app.state.ONE_TIME_ADMIN_TOKEN = None

        response = FileResponse(resource_path("dist/index.html"))
        response.set_cookie(
            "admin_session",
            "1",
            httponly=True,
            samesite="strict",
        )
        print("Admin page accessed. If not you, CTRL C to terminate the server.")
        return response

    # 2️⃣ Subsequent access via cookie
    if request.cookies.get("admin_session") == "1":
        print("Admin page accessed. If not you, CTRL C to terminate the server.")
        return FileResponse(resource_path("dist/index.html"))

    # 3️⃣ Deny everything else
    return FileResponse(
            resource_path("dist/index.html"),
            status_code=403,   # 👈 key line
        )

    


def get_local_ip():
    try:
        # try LAN gateway-like address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.168.1.1", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()



@app.post("/admin/pass")
def admin_pass(request: Request):
    require_admin(request)

    ip = get_local_ip()
    port = 8000

    print(f"Local URL: http://{ip}:{port}")

    return JSONResponse({
        "pass": getattr(request.app.state, "SUBMISSION_PASSWORD", SUBMISSION_PASSWORD),
        "ip": f"{ip}:{port}",
    })



@app.post("/admin/setpass")
def set_pass(request: Request, body: SetPassBody):
    
    
    require_admin(request)
    
    if not body.newPass:
        return JSONResponse( { 
            "err": "Password must be at least 1 character long",
            
        },
        status_code=400
        )
        
    print("New password set: ", body.newPass)
    
    request.app.state.SUBMISSION_PASSWORD = body.newPass


    response = JSONResponse({
        "pass": getattr(request.app.state, "SUBMISSION_PASSWORD", SUBMISSION_PASSWORD)

    })

    return response


@app.post("/kill")
def kill_server(request: Request):
    
    require_admin(request)
    
    # return {"ok": False}
    print("🔴 Server terminated")
    
    response = JSONResponse({"ok": True})
    response.delete_cookie(
        key="admin_session",
        path="/",
    )
    
    # Graceful shutdown
    threading.Thread(
        target=delayed_kill,
        args=(3.0,),   # seconds
        daemon=True,
    ).start()

    return response

@app.post("/excel")
def json_to_excel(request:Request):

    require_admin(request)

    ok = combine_json_to_excel(JSON_INPUT_DIR, EXCEL_OUTPUT_FILE)

    if not ok:
        return {"ok":False}
    return {"ok": True}


@app.get("/isAdmin")
def is_admin(request: Request):
    """Check if the current user has admin privileges via cookie."""
    is_admin_user = request.cookies.get("admin_session") == "1"
    return JSONResponse({"isAdmin": is_admin_user})


def resource_path(relative_path: str) -> str:
    if hasattr(sys, "_MEIPASS"):
        return str(Path(sys._MEIPASS) / relative_path)

    # dev mode → backend file location, not cwd
    return str(
        (Path(__file__).resolve().parent.parent / relative_path).resolve()
    )



def delayed_kill(delay: float):
    time.sleep(delay)
    os.kill(os.getpid(), signal.SIGTERM)
    

def get_OTA():
    return os.getenv("ONE_TIME_ADMIN_TOKEN")


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise ex

app.mount("/", SPAStaticFiles(directory=resource_path("dist"), html=True), name="spa-static-files")


@app.on_event("startup")
async def start_watchdog():
    asyncio.create_task(ws_watchdog())
