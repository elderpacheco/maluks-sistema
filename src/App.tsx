import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

// pages
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import Clientes from "./pages/Clientes";
import Vendedoras from "./pages/Vendedoras";
import Consignado from "./pages/Consignado";
import Financeiro from "./pages/Financeiro";
import Insumos from "./pages/Insumos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            {/* layout aplicado uma única vez */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Index />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/vendedoras" element={<Vendedoras />} />
              <Route path="/consignado" element={<Consignado />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/insumos" element={<Insumos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
