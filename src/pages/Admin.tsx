import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Eye, EyeOff, PowerOff, NotepadTextDashed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import NotFound from "./NotFound";
// const API = "http://localhost:8000";
import { QRCodeCanvas } from "qrcode.react";

const API = "";
function Admin() {
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [pass, setPass] = useState("Unauthorized");
  const [newPass, setNewPass] = useState("");
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [errors2, setErrors2] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmKill, setConfirmKill] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let ws;

    function connectWS() {
      ws = new WebSocket(`/ws/heartbeat`);

      ws.onopen = () => {
        console.log("🟢 WS connected");
      };

      ws.onclose = () => {
        console.log("🔴 WS closed");
      };
    }

    connectWS();

    document.title = "EPF • Admin ";
  }, []);

  // Kill timer
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft === 0) {
      window.close();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s !== null ? s - 1 : s));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Modify errors

  function setFieldError(field: string, message: string) {
    setErrors2((prev) => ({
      ...prev,
      [field]: message,
    }));
  }

  function deleteFieldError(field: string) {
    setErrors2((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }

  // Reset confirm kill

  useEffect(() => {
    if (!confirmKill) return;

    const t = setTimeout(() => {
      if (secondsLeft === null) setConfirmKill(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [confirmKill, secondsLeft]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }

    async function unlockAdmin() {
      try {
        const res = await fetch(`${API}/admin/pass`, {
          method: "POST", // POST is better for auth
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setIsAdmin(false);
          throw new Error("Unauthorized");
        }

        const data = await res.json();
        const password = data.pass;
        setIsAdmin(true);
        setPass(password);
        setFieldError("ip", data.ip); // strip token from URL
      } catch (e) {
        console.log(e);
      }
    }

    unlockAdmin();
  }, []);

  useEffect(() => {
    console.log("Errors: ", errors2);
  }, [errors2]);

  // Change password

  async function changePass() {
    if (newPass.length < 1) {
      setFieldError("password", "Password must be at least 1 character long");
      return;
    }

    deleteFieldError("password");

    const res = await fetch(`${API}/admin/setpass`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newPass,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setFieldError("password", "You are not allowed to change the password");
      return;
    }

    deleteFieldError("password");

    const data = await res.json();
    if (data.pass) setPass(data.pass);
    else {
      setFieldError(data.err, data.err);
      return;
    }

    setShowCurrPass(false);
    setShowPassword(false);

    setFieldError("password", "Password Updated");
  }

  // JSON to excel

  async function getExcel() {
    try {
      setGeneratingExcel(true);
      deleteFieldError("kill");
      const res = await fetch(`${API}/excel`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        setFieldError("excel", "Unauthorized");
        throw new Error("Failed to generate excel");
      }

      const data = await res.json();
      if (!data.ok) {
        setFieldError("excel", "No files to combine");
        setGeneratingExcel(false);
        return;
      }

      setTimeout(() => {
        setFieldError("excel", "ok");
        setGeneratingExcel(false);
      }, 2_000);

      setTimeout(() => {
        setGeneratingExcel(false);
        deleteFieldError("excel");
      }, 5_000);
    } catch (e) {
      setGeneratingExcel(false);
      setFieldError("excel", "Unauthorized");

      throw new Error(e);
    }
  }

  async function killServer() {
    deleteFieldError("kill");

    try {
      const res = await fetch(`${API}/kill`, {
        method: "POST",
        credentials: "include",
      });

      // Server responded, but with an error status
      if (!res.ok) {
        toast({
          title: "Server unavailable",
          description: "The server is already stopped or not reachable.",
          variant: "destructive",
        });
        return;
      }

      // Success
      setSecondsLeft(5);
      deleteFieldError("kill");
    } catch (err) {
      // Network error: server is down, refused connection, etc.
      toast({
        title: "Server already closed",
        description: "The backend server is no longer running.",
        variant: "destructive",
      });
    }
  }

  if (!isAdmin) return <NotFound />;

  return (
    <div className="dark bg-black w-screen h-screen flex flex-col items-center justify-center">
      <div
        className="admin-container flex flex-col
        space-y-10 items-center w-[25vw] min-w-[350px] sm:min-w-[478px] min-h-[60vh] pt-10 pb-10"
      >
        {errors2.ip && (
          <QRCodeCanvas
            className="qr transition-transform"
            value={`http://${errors2.ip}`}
            size={200}
          />
        )}

        <div className="relative flex items-center justify-center mb-10">
          <span
            className={`absolute transition-opacity  text-green-200 hover:opacity-70 hover:cursor-pointer
          ${secondsLeft == null && errors2.ip ? "z-10 opacity-50" : "overflow-hidden opacity-0"}`}
          >
            serving at
            <br />
            {errors2.ip}
          </span>

          <span
            className={`no-select text-lg absolute text-red-500/70 transition-all duration-300 text-bold w-40
            ${secondsLeft != null ? "opacity-100 z-10" : "opacity-0 overflow-hidden"}`}
          >
            Server terminated
            <br />
            {secondsLeft}
          </span>
        </div>

        {/* Current password block */}
        <div className="relative min-w-[239px] mb-10">
          <Lock className="absolute top-0 left-4 h-full z-10 pl-2 inset-0 opacity-50" />

          <span
            className=" bg-background  items-center min-w-[240px] inline-flex
            min-h-[3.1rem]
            justify-center
            px-3 py-2
            border border-input
            rounded-md
            text-muted-foreground/70
            text-sm
            select-none"
          >
            {showCurrPass ? pass : "current password →"}
          </span>
          <Button
            title={showCurrPass ? "hide password" : "show password"}
            className="absolute top-0 right-3 h-full px-3 hover:bg-transparent"
            onClick={() => setShowCurrPass(!showCurrPass)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {showCurrPass ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Change password block */}

        <div className="relative">
          <Lock className="absolute top-0 left-5 w-4 h-full z-10 opacity-50" />
          <Input
            className="input bg-background min-w-[240px] text-muted-foreground/70 min-h-[3.1rem] text-center disabled:cursor-not-allowed"
            id="password-toggle"
            disabled={secondsLeft != null}
            onChange={(e) => {
              setNewPass(e.target.value);
            }}
            placeholder="Enter new password"
            type={showPassword ? "text" : "password"}
          />

          <Button
            className="absolute  top-0 right-2 h-full px-3 hover:bg-transparent "
            onClick={() => setShowPassword(!showPassword)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <Button
            variant="default"
            size="lg"
            disabled={secondsLeft != null}
            className=" px-10 bg-foreground/70 hover:!bg-foreground/50"
            onClick={changePass}
          >
            Change password
          </Button>

          <span
            className={`no-select text-sm transition-all duration-300 overflow-hidden
          ${errors2?.password ? "h-5" : "h-0"}
          ${errors2?.password == "Password Updated" ? "text-green-400/70 h-5" : "text-red-500/70 h-5"}`}
          >
            {" "}
            {errors2?.password}
          </span>
        </div>

        {/* TSV to excel / Edit details / Kill server */}
        <div className="flex flex-row gap-5 flex-wrap items-center justify-center">
          <Button
            title="Edit existing user data"
            variant="default"
            onClick={() => {
              window.open("http://localhost:8000", "_blank");
            }}
            disabled={secondsLeft != null}
            className="h-10 !w-15 bg-foreground/50 hover:!bg-foreground/30 hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            Edit details
          </Button>
          <Button
            variant="default"
            disabled={secondsLeft != null || generatingExcel}
            className=" flex h-10 !w-15 bg-foreground/70 hover:!bg-foreground/50 hover:text-foreground items-center justify-center"
            onClick={getExcel}
          >
            {generatingExcel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating
              </>
            ) : (
              <>
                <NotepadTextDashed className="h-4 w-4" />
                Get Excel
              </>
            )}
          </Button>

          <Button
            title="Kill server and close browser"
            variant="destructive"
            onClick={() => {
              if (!confirmKill) {
                setConfirmKill(true);
                return;
              }
              killServer();
            }}
            disabled={secondsLeft != null}
            className="h-10 !w-15 opacity-70 hover:opacity-100 transition-all disabled:cursor-not-allowed"
          >
            <PowerOff />
            {confirmKill ? "Confirm kill?" : "Kill server"}
          </Button>
        </div>

        <div className="relative flex items-center justify-center mb-10">
          <span
            className={`absolute inline-block w-fit no-select text-sm transition-all duration-300 whitespace-nowrap
    ${
      (!errors2.kill && errors2.excel === "Unauthorized") ||
      errors2.excel === "No files to combine"
        ? "opacity-100 translate-y-0 text-red-500/70"
        : errors2.excel === "ok"
          ? "opacity-100 translate-y-0 text-green-300/70"
          : "opacity-0 -translate-y-1 pointer-events-none"
    }`}
          >
            {errors2.excel === "Unauthorized"
              ? "Unable to generate excel"
              : errors2.excel === "No files to combine"
                ? "No files to combine"
                : "Excel sheet generated"}
          </span>

          <span
            className={`absolute no-select text-sm transition-all duration-300 overflow-hidden whitespace-nowrap
              ${errors2.kill === "Unauthorized" && !errors2.excel ? "opacity-100 text-red-500/70" : "opacity-0"}`}
          >
            Not authorized to terminate
          </span>
        </div>
      </div>
    </div>
  );
}

export default Admin;
