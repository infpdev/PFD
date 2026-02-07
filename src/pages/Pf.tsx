import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { HelmetProvider } from "react-helmet-async";
import Index from "./Index";

const queryClient = new QueryClient();

const Pf = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <Index />
    </QueryClientProvider>
  </HelmetProvider>
);

export default Pf;
