import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, TrendingUp, Package, FileText, Download, Users, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Charts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

type Kpis = {
  vendas_loja: number;
  vendas_fabrica: number;
  consignado_recebido: number;
  gastos_compras: number;
  gastos_outros: number;
  entradas_total: number;
  saidas_total: number;
  itens_vendidos: number;
};

type SerieMes = { mes: string; loja: number; fabrica: number; consignado: number };
type SerieFinanceiro = { mes: string; entradas: number; saidas: number };

type TopProduto = {
  produto_id: string;
  referencia: string | null;
  nome: string | null;
  categoria: string | null;
  quantidade: number;
  valor_total: number;
};

type TopModeloCor = {
  referencia: string;
  nome: string | null;
  cor: string;
  quantidade: number;
  valor_total: number;
};

type TopCliente = {
  cliente_id: string;
  nome: string;
  pedidos: number;
  itens: number;
  valor_total: number;
};

const brl = (v: number | null | undefined) =>
  (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Relatorios() {
  const { toast } = useToast();

  // Período (default: mês atual)
  const hoje = new Date();
  const inicioDefault = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimDefault = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(inicioDefault);
  const [dataFim, setDataFim] = useState(fimDefault);

  const [kpis, setKpis] = useState<Kpis>({
    vendas_loja: 0,
    vendas_fabrica: 0,
    consignado_recebido: 0,
    gastos_compras: 0,
    gastos_outros: 0,
    entradas_total: 0,
    saidas_total: 0,
    itens_vendidos: 0,
  });

  const [serieVendas, setSerieVendas] = useState<SerieMes[]>([]);
  const [serieFinanceiro, setSerieFinanceiro] = useState<SerieFinanceiro[]>([]);
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([]);
  const [topModeloCores, setTopModeloCores] = useState<TopModeloCor[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente[]>([]);
  const [loading, setLoading] = useState(false);

  const aplicarFiltros = async () => {
    try {
      setLoading(true);

      // 1) KPIs
      const { data: kpi, error: kErr } = await supabase.rpc("fn_rel_kpis", {
        p_inicio: dataInicio,
        p_fim: dataFim,
      });
      if (kErr) throw kErr;
      setKpis({
        vendas_loja: Number(kpi?.vendas_loja ?? 0),
        vendas_fabrica: Number(kpi?.vendas_fabrica ?? 0),
        consignado_recebido: Number(kpi?.consignado_recebido ?? 0),
        gastos_compras: Number(kpi?.gastos_compras ?? 0),
        gastos_outros: Number(kpi?.gastos_outros ?? 0),
        entradas_total: Number(kpi?.entradas_total ?? 0),
        saidas_total: Number(kpi?.saidas_total ?? 0),
        itens_vendidos: Number(kpi?.itens_vendidos ?? 0),
      });

      // 2) vendas por origem (mês)
      const { data: serie, error: sErr } = await supabase.rpc("fn_rel_vendas_por_mes", {
        p_inicio: dataInicio,
        p_fim: dataFim,
      });
      if (sErr) throw sErr;
      setSerieVendas(
        (serie ?? []).map((r: any) => ({
          mes: r.mes_label,
          loja: Number(r.vendas_loja ?? 0),
          fabrica: Number(r.vendas_fabrica ?? 0),
          consignado: Number(r.consignado ?? 0),
        }))
      );

      // 3) entradas x saídas por mês
      const { data: finSerie, error: fErr } = await supabase.rpc("fn_rel_financeiro_por_mes", {
        p_inicio: dataInicio,
        p_fim: dataFim,
      });
      if (fErr) throw fErr;
      setSerieFinanceiro(
        (finSerie ?? []).map((r: any) => ({
          mes: r.mes_label,
          entradas: Number(r.entradas ?? 0),
          saidas: Number(r.saidas ?? 0),
        }))
      );

      // 4) top produtos
      const { data: tops, error: tErr } = await supabase.rpc("fn_rel_top_produtos", {
        p_inicio: dataInicio,
        p_fim: dataFim,
        p_limite: 10,
      });
      if (tErr) throw tErr;
      setTopProdutos(
        (tops ?? []).map((r: any) => ({
          produto_id: r.produto_id,
          referencia: r.referencia,
          nome: r.nome,
          categoria: r.categoria,
          quantidade: Number(r.quantidade ?? 0),
          valor_total: Number(r.valor_total ?? 0),
        }))
      );

      // 5) top modelos por cor
      const { data: tmc, error: tmcErr } = await supabase.rpc("fn_rel_top_modelos_cor", {
        p_inicio: dataInicio,
        p_fim: dataFim,
        p_limite: 10,
      });
      if (tmcErr) throw tmcErr;
      setTopModeloCores(
        (tmc ?? []).map((r: any) => ({
          referencia: r.referencia,
          nome: r.nome,
          cor: r.cor,
          quantidade: Number(r.quantidade || 0),
          valor_total: Number(r.valor_total || 0),
        }))
      );

      // 6) top clientes
      const { data: tc, error: tcErr } = await supabase.rpc("fn_rel_top_clientes", {
        p_inicio: dataInicio,
        p_fim: dataFim,
        p_limite: 10,
      });
      if (tcErr) throw tcErr;
      setTopClientes(
        (tc ?? []).map((r: any) => ({
          cliente_id: r.cliente_id,
          nome: r.nome,
          pedidos: Number(r.pedidos || 0),
          itens: Number(r.itens || 0),
          valor_total: Number(r.valor_total || 0),
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao carregar relatórios",
        description: e?.message ?? "Falha ao consultar dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    aplicarFiltros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportar = (tipo: string) => {
    toast({
      title: `Exportando ${tipo}...`,
      description: "O arquivo será baixado em instantes.",
    });
  };

  const vendasResumoMes = useMemo(() => {
    const totalVendas = kpis.vendas_loja + kpis.vendas_fabrica + kpis.consignado_recebido;
    return { totalVendas, itensVendidos: kpis.itens_vendidos };
  }, [kpis]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Relatórios
          </h1>
          <p className="text-muted-foreground">Análises e relatórios gerenciais</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportar("Excel")}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90" onClick={aplicarFiltros} disabled={loading}>
            <FileText className="mr-2 h-4 w-4" />
            {loading ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div>
              <Button className="w-full" onClick={aplicarFiltros} disabled={loading}>
                {loading ? "Aplicando..." : "Aplicar Filtros"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Vendas Loja</p>
                <p className="text-2xl font-bold text-green-600">{brl(kpis.vendas_loja)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Vendas Fábrica</p>
                <p className="text-2xl font-bold text-green-600">{brl(kpis.vendas_fabrica)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Consignado Recebido</p>
                <p className="text-2xl font-bold text-green-600">{brl(kpis.consignado_recebido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-pink" />
              <div>
                <p className="text-sm text-muted-foreground">Itens Vendidos</p>
                <p className="text-2xl font-bold">{kpis.itens_vendidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entradas x Saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas (mês a mês)</CardTitle>
            <CardDescription>Consolidação financeira do período</CardDescription>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieFinanceiro}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entradas" />
                <Bar dataKey="saidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendas por origem */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por origem (mês a mês)</CardTitle>
            <CardDescription>Loja, Fábrica e Consignado</CardDescription>
          </CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieVendas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="loja" />
                <Bar dataKey="fabrica" />
                <Bar dataKey="consignado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="produtos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="produtos">Produtos Mais Vendidos</TabsTrigger>
          <TabsTrigger value="modeloscor">Top Modelos por Cor</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
        </TabsList>

        {/* Top Produtos */}
        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple" />
                Top Produtos
              </CardTitle>
              <CardDescription>Ranking dos produtos com melhor performance de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Qtd Vendida</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Valor Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProdutos.map((p, index) => (
                    <TableRow key={`${p.produto_id}-${index}`}>
                      <TableCell>
                        <Badge variant={index < 3 ? "secondary" : "outline"}>{index + 1}º</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{p.referencia ?? "-"}</TableCell>
                      <TableCell>{p.nome ?? "-"}</TableCell>
                      <TableCell>{p.categoria ?? "-"}</TableCell>
                      <TableCell className="text-center font-semibold">{p.quantidade}</TableCell>
                      <TableCell className="font-semibold text-green-600">{brl(p.valor_total)}</TableCell>
                      <TableCell>{brl((p.valor_total || 0) / Math.max(p.quantidade || 1, 1))}</TableCell>
                    </TableRow>
                  ))}
                  {topProdutos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        Sem vendas no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Modelos por Cor */}
        <TabsContent value="modeloscor">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-pink" />
                Modelos mais vendidos por cor
              </CardTitle>
              <CardDescription>Variações (referência + cor) mais vendidas no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topModeloCores.map((r, i) => (
                    <TableRow key={`${r.referencia}-${r.cor}-${i}`}>
                      <TableCell><Badge variant={i < 3 ? "secondary" : "outline"}>{i + 1}º</Badge></TableCell>
                      <TableCell className="font-medium">{r.referencia}</TableCell>
                      <TableCell>{r.nome ?? "-"}</TableCell>
                      <TableCell>{r.cor}</TableCell>
                      <TableCell className="text-center">{r.quantidade}</TableCell>
                      <TableCell className="font-semibold text-green-600">{brl(r.valor_total)}</TableCell>
                    </TableRow>
                  ))}
                  {topModeloCores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Sem vendas no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Clientes */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple" />
                Clientes que mais compram
              </CardTitle>
              <CardDescription>Ranking por valor comprado no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes.map((c, i) => (
                    <TableRow key={c.cliente_id ?? `c-${i}`}>
                      <TableCell><Badge variant={i < 3 ? "secondary" : "outline"}>{i + 1}º</Badge></TableCell>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-center">{c.pedidos}</TableCell>
                      <TableCell className="text-center">{c.itens}</TableCell>
                      <TableCell className="font-semibold text-green-600">{brl(c.valor_total)}</TableCell>
                    </TableRow>
                  ))}
                  {topClientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Sem vendas no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
