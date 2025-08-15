import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  UserCheck, 
  Package2, 
  DollarSign,
  BarChart3,
  Settings,
  Menu,
  X
} from "lucide-react";
import swanLogo from "@/assets/swan-logo.png";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Vendas", href: "/vendas", icon: ShoppingCart },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Vendedoras", href: "/vendedoras", icon: UserCheck },
  { name: "Consignado", href: "/consignado", icon: Package2 },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Insumos", href: "/insumos", icon: Package },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <img src={swanLogo} alt="Maluks" className="h-8 w-8" />
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Maluks
          </h1>
          <p className="text-xs text-muted-foreground">Moda Íntima</p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-purple/10 to-pink/10 text-purple border border-purple/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border shadow-lg">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block w-72 bg-card border-r border-border">
        <SidebarContent />
      </div>
    </>
  );
}