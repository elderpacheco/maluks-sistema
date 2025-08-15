import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
import { useToast } from "@/hooks/use-toast";

/* ================= helpers ================= */

const META_MENSAL = 45000; // ajuste sua meta aqui

const brl = (v: number | null | undefined) =>
  (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const startOfMonthISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const endOfMonthISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

type VendaRow = {
  id: string;
  cliente: string | null;
  valor_final: number | null;
  data: string;
  status: string;
};

type ItemVendaRow = {
  venda_id: string;
  referencia: string | null;
  tamanho: string | null;
  cor: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
};

type ProdutoNomeRef = { referencia: string | null; nome: string | null };

type PedidoRow = {
  id: string;
  cliente_id: string;
  status: "Aberto" | "Notificado" | "Concluido" | "Cancelado";
  created_at: string;
  cliente?: { id: string; nome: string | null } | null;
  pedido_itens?: { quantidade: number | null; valor_unitario: number | null }[];
};

/* ================= page ================= */

export default function Index() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const [vendasMes, setVendasMes] = useState<VendaRow[]>([]);
  const [itensMes, setItensMes] = useState<ItemVendaRow[]>([]);
  const [produtosNomes, setProdutosNomes] = useState<Record<string, string>>({});
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoRow[]>([]);

  const [inicio, setInicio] = useState<string>(startOfMonthISO());
  const [fim, setFim] = useState<string>(endOfMonthISO());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) Vendas do mês (status Finalizada)
        const { data: vendas, error: vErr } = await supabase
          .from("vendas")
          .select("id, cliente, valor_final, data, status")
          .gte("data", inicio)
          .lte("data", fim)
          .eq("status", "Finalizada");

        if (vErr) throw vErr;
        setVendasMes((vendas ?? []) as VendaRow[]);

        const vendaIds = (vendas ?? []).map((v) => v.id);
        let itens: ItemVendaRow[] = [];
        if (vendaIds.length) {
          const { data: itensData, error: iErr } = await supabase
            .from("venda_itens")
            .select("venda_id, referencia, tamanho, cor, quantidade, valor_unitario")
            .in("venda_id", vendaIds);

          if (iErr) throw iErr;
          itens = (itensData ?? []) as ItemVendaRow[];
        }
        setItensMes(itens);

        // 2) Nomes por referência (view)
        const { data: nomesData, error: nErr } = await supabase
          .from("vw_produtos_resumo")
          .select("referencia, nome");
        if (nErr) throw nErr;

        const map: Record<string, string> = {};
        (nomesData as ProdutoNomeRef[] | null)?.forEach((r) => {
          if (r?.referencia) map[r.referencia] = r.nome || r.referencia;
        });
        setProdutosNomes(map);

        // 3) Pedidos “em atraso”: não concluídos/cancelados + com 7+ dias
        const { data: pedidos, error: pErr } = await supabase
          .from("pedidos")
          .select(
            `id, cliente_id, status, created_at,
             cliente:clientes ( id, nome ),
             pedido_itens ( quantidade, valor_unitario )`
          )
          .neq("status", "Concluido")
          .neq("status", "Cancelado");
        if (pErr) throw pErr;

        // filtra >= 7 dias
        const now = new Date();
        const atrasados = (pedidos ?? []).filter((p) => {
          const diff = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return diff >= 7;
        }) as PedidoRow[];
        setPedidosAbertos(atrasados);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Erro ao carregar dashboard",
          description: e?.message ?? "Falha ao consultar dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [inicio, fim]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ====== KPIs derivados ====== */

  const vendasDoMes = useMemo(() => {
    const total = vendasMes.reduce((s, v) => s + Number(v.valor_final || 0), 0);
    return total;
  }, [vendasMes]);

  const produtosVendidosQtd = useMemo(() => {
    return itensMes.reduce((s, it) => s + Number(it.quantidade || 0), 0);
  }, [itensMes]);

  // clientes ativos no mês = clientes diferentes que compraram no mês
  const clientesAtivosNoMes = useMemo(() => {
    const set = new Set<string>();
    vendasMes.forEach((v) => {
      if (v.cliente) set.add(v.cliente);
    });
    return set.size;
  }, [vendasMes]);

  const progressoMeta = useMemo(() => {
    if (!META_MENSAL) return 0;
    return Math.max(0, Math.min(100, (vendasDoMes / META_MENSAL) * 100));
  }, [vendasDoMes]);

  /* ====== Produtos mais vendidos (TOP 4 por referência) ====== */

  const topProdutos = useMemo(() => {
    const grp = new Map<
      string, // referencia
      { referencia: string; nome: string; quantidade: number }
    >();

    for (const it of itensMes) {
      const ref = it.referencia || "";
      if (!ref) continue;
      const atual = grp.get(ref) || { referencia: ref, nome: produtosNomes[ref] || ref, quantidade: 0 };
      atual.quantidade += Number(it.quantidade || 0);
      grp.set(ref, atual);
    }

    return Array.from(grp.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 4);
  }, [itensMes, produtosNomes]);

  /* ====== Clientes em atraso (top 3 por valor estimado) ====== */

  const clientsInDebt = useMemo(() => {
    const now = new Date();
    const rows = (pedidosAbertos ?? []).map((p) => {
      const total = (p.pedido_itens ?? []).reduce(
        (s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0),
        0
      );
      const days = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: p.cliente?.nome || "Cliente",
        amount: total,
        days,
      };
    });

    return rows.sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [pedidosAbertos]);

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
          {new Date(inicio).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
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
            <div className="text-2xl font-bold">{brl(vendasDoMes)}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando…" : "Consolidado do período"}
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
            <div className="text-2xl font-bold">{produtosVendidosQtd}</div>
            <p className="text-xs text-muted-foreground">Itens faturados no mês</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesAtivosNoMes}</div>
            <p className="text-xs text-muted-foreground">Compraram neste mês</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
            <Target className="h-4 w-4 text-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progressoMeta)}%</div>
            <Progress value={progressoMeta} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{brl(META_MENSAL)} objetivo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple" />
              Produtos Mais Vendidos
            </CardTitle>
            <CardDescription>Top 4 produtos do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topProdutos.length === 0 && (
              <div className="text-sm text-muted-foreground">Sem vendas no período.</div>
            )}
            {topProdutos.map((product, index) => (
              <div key={product.referencia} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple/10 to-pink/10 text-purple text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.nome}</p>
                    <p className="text-xs text-muted-foreground">Ref: {product.referencia}</p>
                  </div>
                </div>
                <Badge variant="secondary">{product.quantidade}</Badge>
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
            <CardDescription>Pedidos não concluídos com 7+ dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientsInDebt.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum atraso encontrado.</div>
            )}
            {clientsInDebt.map((client) => (
              <div key={`${client.name}-${client.days}`} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.days} dias de atraso</p>
                </div>
                <Badge variant="destructive">{brl(client.amount)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agenda (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-pink" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>Tarefas e compromissos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sem agenda integrada ainda. Se tiver uma tabela (ex: <code>agenda</code>), me diga os campos que eu ligo aqui.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
