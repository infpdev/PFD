import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Power, PowerOff, RefreshCw } from "lucide-react";

let apiUrl = "http://localhost:3000";
apiUrl = "";

const ServerConfigPage = ({ setPage }) => {
  const [serverStatus, setServerStatus] = useState<
    "running" | "stopped" | "loading"
  >("loading");
  const [currentPassword, setCurrentPassword] = useState("********");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isTogglingServer, setIsTogglingServer] = useState(false);
  const [token, setToken] = useState<string>("");
  const [showPasswordErr, setShowPasswordErr] = useState("");

  useEffect(() => {
    setPage("Configuration");
    // Check server status on mount
    checkServerStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let baseUrl = window.location.origin;
    // baseUrl = "http://10.78.93.189:8080";
    setQrUrl(`${baseUrl}/pf?token=${token}`);
  }, [token]);

  const checkServerStatus = async () => {
    setServerStatus("loading");
    try {
      const res = await fetch(`${apiUrl}/api/intake/status`, {
        credentials: "include",
      });
      if (!res.ok) window.location.assign("/login");
      const data = await res.json();

      setCurrentPassword(data.password);

      if (data.active) {
        // console.log(data.token);
        // console.log(data);

        setToken(data.token);
        setServerStatus("running");
      } else {
        setServerStatus("stopped");
      }
    } catch {
      setServerStatus("stopped");
    }
  };

  const restartServer = async () => {
    setServerStatus("loading");
    try {
      const res = await fetch(`${apiUrl}/api/intake/restart`, {
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) window.location.assign("/login");
      const data = await res.json();

      if (data.token) {
        setToken(data.token);
        setServerStatus("running");
      } else {
        setServerStatus("stopped");
      }
    } catch {
      setServerStatus("stopped");
    }
  };

  const toggleServer = async () => {
    setIsTogglingServer(true);
    try {
      const action = serverStatus === "running" ? "stop" : "start";
      const res = await fetch(`${apiUrl}/api/intake/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) window.location.assign("/login");

      const data = await res.json();
      setToken(data.token);
      if (action === "start") setCurrentPassword(data.password);

      setServerStatus(action === "start" ? "running" : "stopped");
    } catch (err) {
      console.error("Failed to toggle server:", err);
    } finally {
      setIsTogglingServer(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setShowPasswordErr("Passwords must match");
      return;
    }
    if (newPassword.length < 3) {
      setShowPasswordErr("Password must be at least 3 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${apiUrl}/api/intake/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setCurrentPassword(newPassword);
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordErr("Password changed successfully");
      } else {
        setShowPasswordErr("Failed to change password");
      }
    } catch (err) {
      console.error("Failed to change password:", err);
      setShowPasswordErr("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        Server Configuration
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>Form Access QR Code</CardTitle>
            <CardDescription>
              Scan to access the EPF form on mobile devices
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {token ? (
              <>
                <div className="p-4 bg-transparent rounded-lg">
                  <QRCodeSVG
                    value={qrUrl || "https://example.com"}
                    size={180}
                    level="H"
                    includeMargin
                    className="qr bg-transparent"
                  />
                </div>

                <p className="text-sm text-muted-foreground text-center break-all">
                  {qrUrl}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center pt-5">
                Inactive, start the server to display QR
              </p>
            )}
          </CardContent>
        </Card>

        {/* Server Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>Control the backend server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  serverStatus === "running"
                    ? "bg-green-500"
                    : serverStatus === "stopped"
                      ? "bg-red-500"
                      : "bg-yellow-500 animate-pulse"
                }`}
              />
              <span className="text-foreground font-medium capitalize">
                {serverStatus === "loading" ? "Checking..." : serverStatus}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={toggleServer}
                disabled={isTogglingServer || serverStatus === "loading"}
                variant={serverStatus === "running" ? "destructive" : "default"}
                className="gap-2 w-full"
              >
                {serverStatus === "running" ? (
                  <>
                    <PowerOff className="h-4 w-4" />
                    Stop Server
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4" />
                    Start Server
                  </>
                )}
              </Button>
              {
                <Button
                  variant="outline"
                  size="icon"
                  onClick={restartServer}
                  // disabled={serverStatus === "loading"}
                  className={`gap-2 w-full transition-all overflow-hidden ${serverStatus === "running" ? "opacity-100" : "opacity-0 w-0"}`}
                >
                  <>
                    <RefreshCw className={`h-4 w-4`} />
                    Restart server
                  </>
                </Button>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Password Configuration</CardTitle>
          <CardDescription>View or change the admin password</CardDescription>
        </CardHeader>
        {!token ? (
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground text-center p-5">
              Inactive, start the server to configure the submission password
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-6">
            {/* Current Password Display */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    readOnly
                    className="pr-10 pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex relative items-center gap-5">
                <h3 className="font-medium text-foreground whitespace-nowrap">
                  Change Password
                </h3>
                {showPasswordErr === "Password changed successfully" && (
                  <span className="absolute text-success text-sm font-bold w-full text-center">
                    {showPasswordErr}
                  </span>
                )}
                {showPasswordErr != "Password changed successfully" && (
                  <span className="absolute w-full text-destructive text-sm font-bold text-center">
                    {showPasswordErr}
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword || !newPassword || !confirmPassword
                }
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ServerConfigPage;
