import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Shield,
  Users,
  Database,
  ChevronDown,
  Code,
  Server,
  Layout,
  Zap,
  Globe,
  Lock,
  QrCode,
  Github,
} from "lucide-react";

const Landing = () => {
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="container max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4">
          EPF Digital Form System
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A digital application designed to simplify EPF Form 11 and Form 2 data
          collection, with features for admin review and PDF/Excel generation.
        </p>
        <div className="flex flex-col flex-wrap items-center gap-8">
          <Button
            size="lg"
            variant="default"
            onClick={() => (window.location.href = "/login")}
          >
            <Layout className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Button>
          <div className="-tracking-tighter text-foreground gap-2 flex items-center justify-center border-border max-w-xl">
            <Github className="h-5 w-5 text-primary" />
            Source code available at{" "}
            <a
              href="https://github.com/infpdev/PFD"
              target="_blank"
              rel="noopener noreferrer"
            >
              <code className="hover:underline">github.com/infpdev/PFD</code>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: "Form 11 & Form 2",
              desc: "Complete digital EPF Form 11 & Form 2 with built-in validation, auto-sync of shared fields, and independent signature capture.",
            },
            {
              icon: QrCode,
              title: "QR-based Intake",
              desc: "Admin generates a secure QR code or link. Employees scan and fill forms on their own device. Token-gated access ensures controlled, on-site intake.",
            },
            {
              icon: Shield,
              title: "Admin Dashboard",
              desc: "SSR-powered admin dashboard with submissions table, advanced search (name, UAN, employee no., date), inline editing with field-level locks, and bulk actions.",
            },
            {
              icon: Database,
              title: "Bulk Excel & PDF",
              desc: "Select multiple submissions to copy tab-separated data (configurable column order) or download a ZIP of auto-filled PDFs.",
            },
            {
              icon: Users,
              title: "Smart Deduplication",
              desc: "Shared identity fields (name, DOB, gender, mobile) automatically sync between Form 11 and Form 2, eliminating duplicate data entry.",
            },
            {
              icon: Globe,
              title: "Self-hosted & Offline-ready",
              desc: "Self-hosted system designed for on-prem or cloud deployment. Built on Node.js with a relational database (SQLite locally, PostgreSQL-ready for production).",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Developer Info - Expandable */}
      <section className="container max-w-6xl mx-auto px-4 pb-16">
        <Collapsible open={devOpen} onOpenChange={setDevOpen}>
          <Card className="border-border">
            <CollapsibleTrigger asChild>
              <button className="w-full text-left">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/20">
                        <Code className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Developer Notes
                        </CardTitle>
                        <CardDescription>
                          System architecture, stack choices, and key
                          implementation details
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${devOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </CardHeader>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">
                {/* Architecture */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4" /> Architecture
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground/80 font-mono space-y-1">
                    <p>
                      <span className="text-primary">Frontend:</span> React +
                      Vite + Tailwind + shadcn/ui + MUI DataGrid
                    </p>
                    <p>
                      <span className="text-primary">Node Backend:</span>{" "}
                      Express.js — Auth (cookie sessions), SQLite, SSR, bulk
                      Excel (TSV), WebSocket for live updates
                    </p>
                    <p>
                      <span className="text-primary">Python Backend:</span>{" "}
                      FastAPI — PDF generation (ReportLab), bulk PDF → ZIP
                    </p>
                    <p>
                      <span className="text-primary">Database:</span> SQLite
                      (submissions.db) — id, name, uan, eno, dos, edited_by,
                      data (JSON), docs (JSON)
                    </p>
                    <p>
                      <span className="text-primary">Build:</span> Vite
                      multi-entry — main SPA, PF form client, Admin SSR client
                    </p>
                  </div>
                </div>

                {/* Key files */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Key Files & Entry Points
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {[
                      [
                        "server.js",
                        "Node backend — routes, auth, SQLite, SSR, WebSocket, bulk Excel/PDF proxy",
                      ],
                      [
                        "backend/main.py",
                        "FastAPI — PDF generation, bulk PDF ZIP",
                      ],
                      [
                        "src/pages/Index.tsx",
                        "PF form page — Form 11 + Form 2 + signature + documents",
                      ],
                      [
                        "src/components/admin/SubmissionsPage.tsx",
                        "Admin submissions table with search, bulk actions, editing",
                      ],
                      [
                        "src/pf.client.tsx",
                        "Vite entry for the PF form (served at /pf)",
                      ],
                      [
                        "src/admin.client.tsx",
                        "Vite entry for admin SSR hydration",
                      ],
                      [
                        "backend/pdf_utils/pdf_utils.py",
                        "ReportLab PDF grid overlay + form filling logic",
                      ],
                      [
                        "backend/json_to_excel.py",
                        "Reference for Excel/TSV field mapping",
                      ],
                    ].map(([file, desc]) => (
                      <div
                        key={file}
                        className="bg-muted/30 border border-border rounded-lg p-3"
                      >
                        <code className="text-xs text-primary font-mono">
                          {file}
                        </code>
                        <p className="text-muted-foreground mt-1">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auth Flow */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Auth & Intake Flow
                  </h4>
                  <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5 pl-2">
                    <li>
                      Admin logs in via <code>/login</code> → cookie-based
                      session (httpOnly)
                    </li>
                    <li>
                      Admin starts intake session → generates a token + QR code
                    </li>
                    <li>
                      Employee scans QR → <code>/pf?token=...</code> → token
                      validated by <code>requireIntakeToken</code> middleware
                    </li>
                    <li>
                      Form submissions are gated by <code>gateApiByToken</code>{" "}
                      — requires valid Bearer token or admin session
                    </li>
                    <li>
                      Submission password is configurable per intake session
                    </li>
                  </ul>
                </div>

                {/* Data flow */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" /> Data Flow
                  </h4>
                  <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5 pl-2">
                    <li>
                      Frontend sends form_11 + form_2 + documents (base64) +
                      password to <code>POST /api/forms/process</code>
                    </li>
                    <li>
                      Node reconstructs common form_2 fields from form_11 to
                      reduce payload
                    </li>
                    <li>
                      Signature is shared — form_2 uses{" "}
                      <code>&quot;same&quot;</code> marker referencing form_11's
                      signature
                    </li>
                    <li>
                      Data stored as JSON in SQLite; denormalized name/uan/eno
                      columns for search
                    </li>
                    <li>
                      Admin edits via View dialog send partial updates (
                      <code>PUT /api/submission/:id</code>) with field-level
                      locking
                    </li>
                    <li>
                      WebSocket broadcasts updated submission lists on
                      insert/edit
                    </li>
                  </ul>
                </div>

                {/* Deployment notes */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Deployment Notes
                  </h4>
                  <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5 pl-2">
                    <li>
                      Build: <code>npm run build:all</code> → generates{" "}
                      <code>dist/</code> with client + SSR bundles
                    </li>
                    <li>
                      Run: <code>node server.js</code> — auto-spawns FastAPI via{" "}
                      <code>uvicorn</code>
                    </li>
                    <li>
                      Requires Python 3.10+ with{" "}
                      <code>pip install -r backend/requirements.txt</code>
                    </li>
                    <li>
                      Database schema is automatically initialized on first run
                      (PostgreSQL in production).
                    </li>
                    <li>No external services needed — fully self-contained</li>
                  </ul>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>EPF Digital Form System — Demo Project</p>
      </footer>
    </div>
  );
};

export default Landing;
