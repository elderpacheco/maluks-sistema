import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Package2, AlertTriangle, TrendingDown, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** id da unidade é UUID (string) */
type Unidade = { id: string; nome: string; abreviacao: string | null };

type InsumoResumo = {
  id: string;
  nome: string;
  categoria: string | null;
  cor: string | null;
  unidade: string;
  unidade_abrev: string | null;
  fornecedor: string | null;
  data_compra: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;

  quantidade_atual: number;
  quantidade_minima: number;
  valor_unitario: number;
  valor_total: number;
  status: "sem_estoque" | "baixo" | "atencao" | "normal";
};

const brl = (v: number | null | undefined) =>
  (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Insumos() {
  const { toast } = useToast();

  // Lista / kpis / selects
  const [insumos, setInsumos] = useState<InsumoResumo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [kpis, setKpis] = useState({ total_insumos: 0, estoque_baixo: 0, valor_total: 0, categorias: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Controle de edição
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cor, setCor] = useState("");
  const [unidadeId, setUnidadeId] = useState<string>(""); // UUID
  const [valorUnitario, setValorUnitario] = useState<string>("0");
  const [quantidade, setQuantidade] = useState<string>("0");
  const [quantidadeMinima, setQuantidadeMinima] = useState<string>("0");
  const [dataCompra, setDataCompra] = useState<string>("");
  const [fornecedor, setFornecedor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const unidadeSelecionada = useMemo(
    () => unidades.find((u) => String(u.id) === String(unidadeId)) || null,
    [unidades, unidadeId]
  );

  // helper numérico
  const toNumber = (v: string, def = 0) => {
    if (v === "" || v === null || v === undefined) return def;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };

  const resetForm = () => {
    setEditingId(null);
    setNome("");
    setCategoria("");
    setCor("");
    setUnidadeId("");
    setValorUnitario("0");
    setQuantidade("0");
    setQuantidadeMinima("0");
    setDataCompra("");
    setFornecedor("");
    setObservacoes("");
  };

  /** ---------- carregamentos ---------- */
  const carregarUnidades = async () => {
    const { data, error } = await supabase
      .from("unidades_medida")
      .select("id, nome, abreviacao")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar unidades", description: error.message, variant: "destructive" });
      setUnidades([]);
    } else {
      setUnidades((data ?? []) as Unidade[]);
    }
  };

  const carregarKPIs = async () => {
    const { data, error } = await supabase.from("vw_insumos_kpis").select("*").single();
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar indicadores", description: error.message, variant: "destructive" });
      return;
    }
    setKpis({
      total_insumos: Number(data?.total_insumos ?? 0),
      estoque_baixo: Number(data?.estoque_baixo ?? 0),
      valor_total: Number(data?.valor_total ?? 0),
      categorias: Number(data?.categorias ?? 0),
    });
  };

  const carregarInsumos = async () => {
    const { data, error } = await supabase
      .from("vw_insumos_resumo")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar insumos", description: error.message, variant: "destructive" });
      setInsumos([]);
    } else {
      setInsumos((data ?? []) as InsumoResumo[]);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([carregarUnidades(), carregarKPIs(), carregarInsumos()]);
    })();
  }, []);

  /** ---------- novo / editar / apagar ---------- */
  const abrirNovo = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const abrirEdicao = async (id: string) => {
    try {
      // Busca o registro REAL na tabela 'insumos' (precisamos do unidade_medida_id)
      const { data, error } = await supabase
        .from("insumos")
        .select(
          "id, nome, categoria, cor, unidade_medida_id, valor_unitario, quantidade, quantidade_minima, data_compra, fornecedor, observacoes"
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        toast({ title: "Insumo não encontrado", variant: "destructive" });
        return;
      }

      setEditingId(data.id);
      setNome(data.nome ?? "");
      setCategoria(data.categoria ?? "");
      setCor(data.cor ?? "");
      setUnidadeId(String(data.unidade_medida_id ?? ""));
      setValorUnitario(String(Number(data.valor_unitario ?? 0)));
      setQuantidade(String(Number(data.quantidade ?? 0)));
      setQuantidadeMinima(String(Number(data.quantidade_minima ?? 0)));
      setDataCompra(data.data_compra ? String(data.data_compra).slice(0, 10) : "");
      setFornecedor(data.fornecedor ?? "");
      setObservacoes(data.observacoes ?? "");
      setIsDialogOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao abrir edição", description: e?.message, variant: "destructive" });
    }
  };

  const apagarInsumo = async (id: string, nome: string) => {
    try {
      const ok = window.confirm(`Apagar o insumo "${nome}"? Esta ação não pode ser desfeita.`);
      if (!ok) return;

      const { error } = await supabase.from("insumos").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Insumo apagado" });
      await Promise.all([carregarKPIs(), carregarInsumos()]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao apagar", description: e?.message, variant: "destructive" });
    }
  };

  /** ---------- salvar (insert / update) ---------- */
  const handleSaveInsumo = async () => {
    try {
      if (!nome.trim()) {
        toast({ title: "Informe o nome do insumo", variant: "destructive" });
        return;
      }
      if (!unidadeId) {
        toast({ title: "Selecione a unidade de medida", variant: "destructive" });
        return;
      }

      const payload = {
        nome: nome.trim(),
        categoria: categoria.trim() || null,
        cor: cor.trim() || null,
        unidade_medida_id: unidadeId, // UUID string
        valor_unitario: toNumber(valorUnitario, 0),
        quantidade: toNumber(quantidade, 0),
        quantidade_minima: toNumber(quantidadeMinima, 0),
        data_compra: dataCompra || null,
        fornecedor: fornecedor.trim() || null,
        observacoes: observacoes.trim() || null,
        ativo: true,
      };

      if (editingId) {
        const { error } = await supabase.from("insumos").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Insumo atualizado!", description: "Alterações salvas." });
      } else {
        const { error } = await supabase.from("insumos").insert(payload);
        if (error) throw error;
        toast({ title: "Insumo salvo!", description: "Cadastrado com sucesso." });
      }

      setIsDialogOpen(false);
      resetForm();
      await Promise.all([carregarKPIs(), carregarInsumos()]);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao salvar",
        description: e?.message ?? "Falha ao salvar insumo.",
        variant: "destructive",
      });
    }
  };

  /** ---------- filtros/pesquisa ---------- */
  const filteredInsumos = useMemo(() => {
    if (!searchTerm.trim()) return insumos;
    const st = searchTerm.toLowerCase();
    return insumos.filter(
      (i) =>
        i.nome.toLowerCase().includes(st) ||
        (i.categoria ?? "").toLowerCase().includes(st) ||
        (i.cor ?? "").toLowerCase().includes(st) ||
        (i.fornecedor ?? "").toLowerCase().includes(st)
    );
  }, [insumos, searchTerm]);

  const estoqueBadgeVariant = (s: InsumoResumo["status"]) =>
    s === "sem_estoque" ? "destructive" : s === "baixo" ? "destructive" : s === "atencao" ? "outline" : "secondary";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Insumos
          </h1>
          <p className="text-muted-foreground">Gerencie materiais e matérias-primas</p>
        </div>

        {/* Novo insumo */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90" onClick={abrirNovo}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Insumo
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Insumo" : "Cadastrar Novo Insumo"}</DialogTitle>
              <DialogDescription>
                Preencha as informações. Apenas o <b>nome</b> é obrigatório.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lycra Estampada" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Tecido" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unidade de Medida *</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={unidadeId}
                    onChange={(e) => setUnidadeId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.nome} {u.abreviacao ? `(${u.abreviacao})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>
                    Valor Unitário{" "}
                    {unidadeSelecionada ? (
                      <span className="text-muted-foreground text-xs">
                        (por {unidadeSelecionada.abreviacao || unidadeSelecionada.nome})
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Cor</Label>
                  <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Ex.: Preto, Rosa" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </div>
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={quantidadeMinima}
                    onChange={(e) => setQuantidadeMinima(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data da Compra</Label>
                  <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Fornecedor</Label>
                <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Fornecedor" />
              </div>

              <div>
                <Label>Observações</Label>
                <textarea
                  className="w-full p-2 border rounded resize-none h-20"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o insumo..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveInsumo} className="bg-gradient-to-r from-purple to-pink text-white">
                {editingId ? "Salvar Alterações" : "Salvar Insumo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package2 className="h-8 w-8 text-purple" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Insumos</p>
                <p className="text-2xl font-bold">{kpis.total_insumos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-600">{kpis.estoque_baixo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">{brl(kpis.valor_total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{kpis.categorias}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar insumos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-purple" />
            Lista de Insumos
          </CardTitle>
          <CardDescription>{filteredInsumos.length} insumo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInsumos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>{i.categoria ?? "-"}</TableCell>
                  <TableCell>{i.cor ?? "-"}</TableCell>
                  <TableCell>
                    <span className={i.status !== "normal" ? "text-red-600 font-semibold" : ""}>
                      {i.quantidade_atual}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">(mín: {i.quantidade_minima})</span>
                  </TableCell>
                  <TableCell>
                    {i.unidade}
                    {i.unidade_abrev ? ` (${i.unidade_abrev})` : ""}
                  </TableCell>
                  <TableCell>{brl(i.valor_unitario)}</TableCell>
                  <TableCell className="font-semibold">{brl(i.valor_total)}</TableCell>
                  <TableCell>{i.fornecedor ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={estoqueBadgeVariant(i.status)}>
                      {i.status === "sem_estoque"
                        ? "Sem Estoque"
                        : i.status === "baixo"
                        ? "Estoque Baixo"
                        : i.status === "atencao"
                        ? "Atenção"
                        : "Normal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(i.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Apagar"
                        onClick={() => apagarInsumo(i.id, i.nome)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInsumos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground">
                    Nenhum insumo encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
