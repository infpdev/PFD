import React, { useEffect, useRef, useState, useMemo } from "react";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import {
  Blocks,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  Download,
  Pencil,
  Package,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { ThemeProvider } from "@mui/material";
import { muiTheme } from "@/components/admin/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ViewSubmissionDialog from "./ViewSubmissionDialog";
import {
  Forms,
  IndexDocumentsPayload,
  SearchResult,
  SubmissionData,
} from "@/types/epf-forms";
import "../../admin.css";
import Index from "@/pages/Index";
import { toast } from "@/hooks/use-toast";

let apiUrl = "http://localhost:3000";
apiUrl = "";

const SEARCH_TYPES = ["Name", "Uan", "Date", "Eno"] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

const INPUT_TYPE_TEXT = {
  Name: "Try typing TEST",
  Uan: "Search users by UAN",
  Date: "Search users by date of submission",
  Eno: "Search users by Employee Number",
} as const;

const MAX_LEN = {
  Uan: 12,
  Eno: 8,
} as const;

interface TsvColumn {
  key: string;
  label: string;
}

const MONTHS = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

const DEFAULT_TSV_COLUMNS: TsvColumn[] = [
  { key: "name", label: "Name" },
  { key: "eno", label: "Employee No." },
  { key: "uan", label: "UAN" },
  { key: "bank_acc", label: "Bank Acc. No." },
  { key: "ifsc", label: "IFSC" },
  { key: "phone", label: "Phone No." },
  { key: "nominee_name", label: "Nominee Name" },
  { key: "nominee_dob", label: "Nominee DOB" },
  { key: "nominee_rel", label: "Nominee Relationship" },
];

const STORAGE_KEY_TSV_ORDER = "admin_tsv_column_order";

const loadTsvOrder = (): TsvColumn[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TSV_ORDER);
    if (stored) {
      const keys = JSON.parse(stored) as string[];
      const result: TsvColumn[] = [];
      const defaults = [...DEFAULT_TSV_COLUMNS];
      for (const key of keys) {
        const col = defaults.find((c) => c.key === key);
        if (col) {
          result.push(col);
          defaults.splice(defaults.indexOf(col), 1);
        }
      }
      return [...result, ...defaults];
    }
  } catch (err) {
    console.error(err);
  }
  return [...DEFAULT_TSV_COLUMNS];
};

interface SubmissionsPageProps {
  setPage: React.Dispatch<React.SetStateAction<string>>;
  isDark: boolean;
}

const SubmissionsPage = ({ setPage, isDark }: SubmissionsPageProps) => {
  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>("Name");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionData | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [downloading, setIsDownloading] = useState(false);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [forms, setForms] = useState<Forms | null>(null);
  const [docs, setDocs] = useState<IndexDocumentsPayload | null>(null);
  const [tsvColumns, setTsvColumns] = useState<TsvColumn[]>(loadTsvOrder);

  const saveTsvOrder = (columns: TsvColumn[]) => {
    setTsvColumns(columns);
    localStorage.setItem(
      STORAGE_KEY_TSV_ORDER,
      JSON.stringify(columns.map((c) => c.key)),
    );
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newCols = [...tsvColumns];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCols.length) return;
    [newCols[index], newCols[targetIndex]] = [
      newCols[targetIndex],
      newCols[index],
    ];
    saveTsvOrder(newCols);
  };

  // Helper to get selected IDs as number array
  const selectedIds = useMemo(() => {
    if (selectionModel.type === "include") {
      return Array.from(selectionModel.ids).map((id) => Number(id));
    } else {
      const excludedIds = new Set(selectionModel.ids);
      return results
        .filter((row) => !excludedIds.has(row.id))
        .map((row) => row.id);
    }
  }, [selectionModel, results]);

  const isNumeric = searchType === "Uan" || searchType === "Eno";
  const maxLen = isNumeric ? MAX_LEN[searchType] : undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage("Submissions");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // const ws = new WebSocket("ws://localhost:3000/ws/latest-submissions");
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;

    const ws = new WebSocket(`${protocol}://${host}/ws/latest-submissions`);

    ws.onopen = () => {
      console.log("Websocket connected..");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "latest-submissions") {
        setResults(msg.data);
      }
    };

    ws.onerror = console.error;

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (searchText.length > 0) return;

    let cancelled = false;

    async function fetchLatestSubmissions() {
      try {
        const res = await fetch(`${apiUrl}/api/submissions/latest`, {
          credentials: "include",
        });

        if (!res.ok) {
          window.location.href = "/login";

          throw new Error("Failed to fetch latest submissions");
        }

        const data = await res.json();
        if (!cancelled) {
          setResults(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
        }
      }
    }

    fetchLatestSubmissions();

    return () => {
      cancelled = true;
    };
  }, [searchText]);

  useEffect(() => {
    if (!searchText.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const id = setTimeout(() => {
      const trimmed = searchText.trim();
      if (
        (searchType === "Name" && trimmed.length >= 3) ||
        searchType !== "Name"
      ) {
        search(signal);
      }
    }, 300);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchType]);

  async function search(signal?: AbortSignal) {
    try {
      const res = await fetch(`${apiUrl}/api/search`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: searchType,
          value: searchText,
        }),
        signal,
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        window.location.href = "/login";
        throw new Error("Search failed");
      }

      const data = await res.json();
      const searchResults = data.results || [];
      setResults(searchResults);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error(err);
      setResults([]);
    }
  }

  const handleView = async (id: number) => {
    setLoadingSubmission(true);
    try {
      const res = await fetch(`${apiUrl}/api/submission/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch submission");
      const data = await res.json();

      setSelectedSubmission(data);
      setViewDialogOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const getExcel = async (ids: number[], name?: string) => {
    setBulkDownloading(true);
    try {
      const res = await fetch(`${apiUrl}/api/bulk-excel`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids,
          columnOrder: tsvColumns.map((c) => c.key),
        }),
      });

      if (!res.ok) throw new Error("Failed to generate TSV");

      const tsv = await res.text();

      // Copy to clipboard
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (name)
        toast({
          title: "Excel",
          description: `Copied excel data of ${name}`,
          variant: "default",
          duration: 2000,
        });
    } catch (err) {
      console.error(err);
    } finally {
      setBulkDownloading(false);
    }
  };

  const getPDF = async (id: number) => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${apiUrl}/get-pdf`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
        }),
      });

      if (!res.ok) {
        window.location.href = "/login";
        throw new Error("Failed to generate PDF");
      }

      const blob = await res.blob();
      const filename = res.headers.get("X-Filename") || "submission.pdf";

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      a.download = filename;
    } catch (err) {
      console.log(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getBulkPDF = async (ids: number[]) => {
    setBulkDownloading(true);
    try {
      const res = await fetch(`${apiUrl}/api/bulk-pdf`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) throw new Error("Failed to generate PDFs");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setBulkDownloading(false);
    }
  };

  const editUser = async (id: number) => {
    setLoadingSubmission(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/submission/${id}?shouldSendDocs=true`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch submission");
      const data = await res.json();

      setForms(data.forms);
      setDocs(data.docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmission(false);
    }

    setEditing(id);
  };

  useEffect(() => {
    setPage("EPF New Entry");
    if (!editing) {
      setPage("Submissions");
      setForms(null);
      setDocs(null);
      document.title = "EPF • Admin";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "DB ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      headerAlign: "center",
    },
    {
      field: "uan",
      headerName: "UAN",
      flex: 0.5,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "eno",
      headerName: "Employee no.",
      flex: 0.5,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "dos",
      headerName: "Submission date",
      flex: 0.5,
      headerAlign: "center",
      align: "center",
      renderCell: ({ row }) => {
        const [year, month, day] = row.dos.split("-");

        return `${day} ${MONTHS[parseInt(month, 10)]} ${year}`;
      },
    },
    {
      field: "edited_by",
      headerName: "Edited by",
      flex: 0.5,
      headerAlign: "center",
      align: "center",
      renderCell: ({ row }) => {
        if (!row.edited_by || row.edited_by.length === 0) return "-";
        else return row.edited_by;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.5,
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        return (
          <div
            className="w-full h-full grid place-items-center
                grid-cols-2 px-0 2xl:px-8 2xl:m-0 m-3 2xl:grid-cols-4"
          >
            <Button
              variant="outline"
              title={`View details of ${row.name}`}
              size="sm"
              onClick={() => handleView(row.id)}
              disabled={loadingSubmission}
              className="gap-2 w-[85px] 2xl:w-auto"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={`Get excel row of ${row.name}`}
              onClick={() => getExcel([row.id], row.name)}
              disabled={bulkDownloading}
              className="gap-2 w-[85px] 2xl:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={`Download filled PF PDF of ${row.name}`}
              onClick={() => getPDF(row.id)}
              disabled={downloading || bulkDownloading}
              className="gap-2 w-[85px] 2xl:w-auto"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={`Edit and submit details of ${row.name}`}
              onClick={() => editUser(row.id)}
              disabled={loadingSubmission}
              className="gap-2 w-[85px] 2xl:w-auto"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const hasSelection = selectedIds.length > 1;

  return editing ? (
    <Index
      forms={forms}
      docs={docs}
      isEditing={editing}
      setEditing={setEditing}
    />
  ) : (
    <div className="flex flex-col h-full">
      <title>EPF • Admin</title>
      <meta name="description" content="View submissions" />
      {/* Search bar and bulk actions */}
      <div className="w-full p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <form className="flex-1">
            <div className="flex shadow-xs">
              <button
                id="dropdown-button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen((v) => !v);
                }}
                type="button"
                className="rounded-l-sm inline-flex gap-2 items-center shrink-0 z-10 text-foreground/70 bg-muted box-border border border-border hover:bg-muted/80 hover:text-foreground font-medium leading-5 text-sm px-4 py-2.5 focus:outline-none"
              >
                <Blocks className="w-5 h-5" />
                Search by: {searchType}
                <ChevronDown
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div
                  onPointerLeave={() => setOpen(false)}
                  className="rounded-sm absolute mt-12 z-10 bg-background border border-border rounded-base shadow-lg w-[178px]"
                >
                  <ul className="p-2 text-sm text-foreground/70 font-medium">
                    {SEARCH_TYPES.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          title={INPUT_TYPE_TEXT[item]}
                          onClick={() => {
                            setSearchType(item);
                            setSearchText("");
                            setOpen(false);
                          }}
                          className="w-full text-left p-2 hover:bg-foreground/10 hover:text-foreground rounded-md"
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <input
                ref={inputRef}
                type={searchType !== "Date" ? "text" : "date"}
                inputMode={isNumeric ? "numeric" : undefined}
                value={searchText}
                onChange={(e) => {
                  if (searchType === "Date") {
                    setSearchText(e.target.value);
                    return;
                  }
                  if (!isNumeric || !maxLen) {
                    const cleaned = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z ]+/g, "")
                      .replace(/\s+/g, " ");
                    setSearchText(cleaned);
                    return;
                  }

                  const digits = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, maxLen);
                  setSearchText(digits);
                }}
                className="rounded-r-sm px-3 py-2.5 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 bg-background border border-border focus:border-border text-foreground text-sm block w-full placeholder:text-muted-foreground"
                placeholder={INPUT_TYPE_TEXT[searchType]}
                required
              />
            </div>
          </form>

          {/* Bulk actions - only show when multiple rows selected */}
          {hasSelection && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>

              {/* Excel dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkDownloading}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Excel"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b mb-1">
                    Column Order:
                  </div>
                  {tsvColumns.map((col, idx) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-1 px-2 py-1 text-sm"
                    >
                      <span className="w-5 text-xs text-muted-foreground">
                        {idx + 1}.
                      </span>
                      <span className="flex-1">{col.label}</span>
                      <button
                        type="button"
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(idx, "up");
                        }}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30 text-muted-foreground hover:text-foreground"
                        disabled={idx === tsvColumns.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(idx, "down");
                        }}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t mt-1 pt-1">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => getExcel(selectedIds)}
                    >
                      <Copy className="h-4 w-4" />
                      Copy TSV to Clipboard
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* PDF bulk download */}
              <Button
                variant="outline"
                size="sm"
                disabled={bulkDownloading}
                className="gap-2"
                onClick={() => getBulkPDF(selectedIds)}
              >
                <Package className="h-4 w-4" />
                PDF (Zip)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <main className="flex-1 overflow-visible p-6 pt-0">
        {!searchText && (
          <div className="flex-1 w-full relative">
            <span className="absolute -translate-y-[125%] py-1 px-2 rounded w-auto whitespace-nowrap bg-muted text-foreground/70 text-sm font-medium">
              showing recent submissions
            </span>
          </div>
        )}
        <ThemeProvider theme={muiTheme}>
          <DataGrid
            rows={results}
            columns={columns}
            checkboxSelection
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setSelectionModel(newSelection);
            }}
            getRowHeight={() => "auto"}
            sx={{
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
              },
              ".MuiDataGrid-columnHeader .MuiIconButton-root": {
                color: "hsl(var(--foreground))",
              },
              ".MuiDataGrid-columnHeaders": {
                backgroundColor: "hsl(var(--background) / 0.6)",
                borderBottom: "1px solid hsl(var(--border))",
              },
              borderRadius: "10px",
              border: "3px solid hsl(var(--foreground)/30%)",
              "--DataGrid-borderWidth": "0px",
              boxShadow: `0 10px 30px hsl(var(--foreground) / ${isDark ? 0.1 : 0.3}), inset 0 0 0 1px hsl(var(--border))`,
            }}
            slotProps={{
              baseCheckbox: {
                style: {
                  color: "hsl(var(--foreground)/70%)",
                },
              },
            }}
          />
        </ThemeProvider>
      </main>

      {/* View Dialog */}
      <ViewSubmissionDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        submission={selectedSubmission}
        search={search}
      />
    </div>
  );
};

export default SubmissionsPage;
