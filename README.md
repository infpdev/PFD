# EPF Digital Form System

A web-based tool for collecting EPF Form 11 & Form 2 data, generating PDFs and Excel summaries, and managing submissions through an admin dashboard.

Built during an internship at Bosch to reduce manual data entry errors and streamline EPF onboarding.

## Live Demo

**[pfd-dev.onrender.com](https://pfd-dev.onrender.com)**

## Features

- **Digital Forms** — EPF Form 11 & Form 2 with validation and shared-field sync
- **QR-based Intake** — Admin generates a token/QR; employees scan and fill on their own device
- **Admin Dashboard** — View, search, edit, and bulk-export submissions
- **PDF & Excel Generation** — Auto-filled PDFs (via ReportLab) and tab-separated Excel data
- **Self-hosted** — Runs locally with SQLite or with PostgreSQL in production

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React, Vite, Tailwind, shadcn/ui |
| Node Backend | Express, SQLite/PostgreSQL, SSR, WebSocket |
| Python Backend | FastAPI, ReportLab (PDF generation) |

## Quick Start

```bash
npm install
pip install -r backend/requirements.txt
npm run build:all
node server.js
```

Requires Node.js 18+ and Python 3.10+.

## License

[**MIT**](./LICENSE)
