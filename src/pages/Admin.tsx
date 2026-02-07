import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "@/components/admin/topbar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SubmissionsPage from "@/components/admin/SubmissionsPage";
import ServerConfigPage from "@/components/admin/ServerConfigPage";
import "../admin.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import NotFound from "./NotFound";

const queryClient = new QueryClient();

function Admin() {
  const [isDark, setIsDark] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState("Submissions");

  useEffect(() => {
    document.title = "EPF • Admin";
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <HelmetProvider>
      <Toaster />
      <Sonner />
      <QueryClientProvider client={queryClient}>
        <div className="h-screen flex flex-col bg-background">
          <Topbar page={page} setIsDarkAdminState={setIsDark} />

          <div className="flex flex-1 overflow-hidden">
            <AdminSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <main className="flex-1 overflow-auto">
              <Routes>
                <Route index element={<Navigate to="submissions" replace />} />
                <Route
                  path="submissions"
                  element={
                    <SubmissionsPage setPage={setPage} isDark={isDark} />
                  }
                />
                <Route
                  path="config"
                  element={<ServerConfigPage setPage={setPage} />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default Admin;
