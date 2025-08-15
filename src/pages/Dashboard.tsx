import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
  ShoppingBag,
} from "lucide-react";

export default function Dashboard() {
  const salesData = [
    { month: "Jan", value: 15000 },
    { month: "Fev", value: 23000 },
    { month: "Mar", value: 18000 },
    { month: "Abr", value: 32000 },
    { month: "Mai", value: 28000 },
    { month: "Jun", value: 35000 },
  ];

  const topProducts = [
    { name: "Sutiã Push-Up Rosa", sales: 125, ref: "SP001" },
    { name: "Calcinha Renda Preta", sales: 98, ref: "CR002" },
    { name: "Conjunto Nadador", sales: 87, ref: "CN003" },
    { name: "Pijama Cetim", sales: 76, ref: "PC004" },
  ];

  const clientsInDebt = [
    { name: "Maria Silva", amount: 450, days: 15 },
    { name: "Ana Costa", amount: 230, days: 8 },
    { name: "Lucia Santos", amount: 180, days: 22 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-purple/10 to-pink/10 text-purple border border-purple/20">
          Junho 2024
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 35.420</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              +12.5% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
            <Package className="h-4 w-4 text-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground">+8 produtos hoje</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+12 novos clientes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
            <Target className="h-4 w-4 text-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <Progress value={78} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">R$ 45.000 objetivo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple" />
              Produtos Mais Vendidos
            </CardTitle>
            <CardDescription>Top 4 produtos do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.ref} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple/10 to-pink/10 text-purple text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Ref: {product.ref}</p>
                  </div>
                </div>
                <Badge variant="secondary">{product.sales}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clientes em Atraso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clientes em Atraso
            </CardTitle>
            <CardDescription>Pagamentos pendentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientsInDebt.map((client) => (
              <div key={client.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.days} dias de atraso</p>
                </div>
                <Badge variant="destructive">R$ {client.amount}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-pink" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>Tarefas e compromissos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple" />
              <div>
                <p className="font-medium text-sm">Entrega para Maria Silva</p>
                <p className="text-xs text-muted-foreground">14:30</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-pink" />
              <div>
                <p className="font-medium text-sm">Reunião com fornecedor</p>
                <p className="text-xs text-muted-foreground">16:00</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple" />
              <div>
                <p className="font-medium text-sm">Fechamento do caixa</p>
                <p className="text-xs text-muted-foreground">18:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { ok } from '@/ _alias_check';
console.log(ok);
