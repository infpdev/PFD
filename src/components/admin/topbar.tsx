import { AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useContext, useEffect, useState } from "react";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { LogOut } from "lucide-react";
const apiUrl = "http://localhost:3000";

export default function Topbar({ page, setIsDarkAdminState }) {
  const [isDark, setIsDark] = useState(false);
  const [userName, setUsername] = useState("");
  const [title, setTitle] = useState("Submissions");

  function setTheme(setDark: boolean) {
    const root = document.documentElement;
    setIsDark(!isDark);
    if (setDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function logout() {
    await fetch(`${apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  }

  async function getInfo() {
    try {
      const res = await fetch(`${apiUrl}/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        window.location.href = "/login";
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      setUsername(data.name ?? "");
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setIsDarkAdminState(document.documentElement.classList.contains("dark"));
    getInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  useEffect(() => {
    setTitle(page);
  }, [page]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleToggle = () => {
    setTheme(!isDark);
  };

  return (
    <header className="py-10 h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex h-full w-full items-center justify-between px-4">
        <span className="font-bold text-xl text-foreground">{title}</span>

        {userName && (
          <span className="font-medium text-lg text-foreground/70 bg-muted p-2 rounded-sm">
            Logged in as: {userName}
          </span>
        )}
        <div className="flex items-center gap-3">
          <IconButton
            title={isDark ? "Toggle light mode" : "Toggle dark mode"}
            onClick={handleToggle}
          >
            {isDark ? (
              <DarkModeOutlinedIcon className="text-foreground" />
            ) : (
              <LightModeOutlinedIcon className="text-foreground" />
            )}
          </IconButton>
          <IconButton
            onClick={logout}
            title="Logout"
            className="hover:cursor-pointer"
          >
            <LogOut className="text-foreground" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
