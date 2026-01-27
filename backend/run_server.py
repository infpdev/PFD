# run_server.py
import asyncio
import os
import secrets
import sys
import webbrowser
import uvicorn
from backend.main import app
import sys
import logging

# pyinstaller --onefile --add-data "../dist;dist" --add-data "./pdf_utils/template.pdf;." --add-data "./pdf_utils/overlay.pdf;." --add-data "./pdf_utils/config.template.ini;." --icon=../public/favicon.ico --version-file version.txt --name=PF_Server run_server.py

HAS_CONSOLE = (
    sys.stdout is not None
    and hasattr(sys.stdout, "isatty")
    and sys.stdout.isatty()
)

if not HAS_CONSOLE:
    class SafePrintLogger:
        SUPPRESSED_PREFIXES = (
            "DEBUG:    > PING",
            "DEBUG:    < PONG",
            "DEBUG:    % received keepalive",
        )

        def write(self, message):
            msg = message.strip()
            if not msg:
                return

            for prefix in self.SUPPRESSED_PREFIXES:
                if msg.startswith(prefix):
                    return

            logging.info(msg)

        def flush(self):
            pass

        def isatty(self):
            return False

    sys.stdout = SafePrintLogger()
    sys.stderr = SafePrintLogger()




LOG_FILE = "log.txt"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)

logging.getLogger("PIL").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)


for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logger = logging.getLogger(logger_name)
    logger.handlers.clear()
    logger.propagate = True

for noisy in (
    "websockets",
    "websockets.client",
    "websockets.server",
    "websockets.protocol",
):
    logging.getLogger(noisy).setLevel(logging.WARNING)


if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


if __name__ == "__main__":
    # Open browser automatically
    
    print("Backend started")
    
    app.state.ONE_TIME_ADMIN_TOKEN = secrets.token_urlsafe(128)

    app.state.SUBMISSION_PASSWORD = "1"

    
    webbrowser.open(f"http://localhost:8000/admin?token={app.state.ONE_TIME_ADMIN_TOKEN}")
    
    DEBUG = not getattr(sys, "frozen", False)

    uvicorn_kwargs = dict(
        app=app,
        host="0.0.0.0",
        port=8000,
        access_log=True,
        use_colors=False,
        reload=False,
    )

    if not DEBUG:
        # packaged / no console → keep your file logging
        uvicorn_kwargs["log_config"] = None
        uvicorn_kwargs["log_level"] = "info"

    # DEBUG mode → do NOT pass log_config at all
    uvicorn.run(**uvicorn_kwargs)

    
    
    
