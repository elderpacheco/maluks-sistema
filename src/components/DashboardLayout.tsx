import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/auth");
    } catch {
      toast({
        title: "Erro ao sair",
        description: "Ocorreu um erro ao tentar sair da conta.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-border p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-purple" />
            <span className="font-medium">Olá, Maluks</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* As páginas entram aqui */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
