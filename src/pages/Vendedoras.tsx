import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, UserCheck, Calendar, DollarSign, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type VendedoraRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  status: "ativa" | "inativa";
  observacoes: string | null;
  total_notas: number;
  notas_vencidas: number;
  valor_pago: number;
  valor_devendo: number;
  proximo_vencimento: string | null; // YYYY-MM-DD
  created_at: string;
};

const Vendedoras = () => {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    endereco: "",
    status: "ativa" as "ativa" | "inativa",
    observacoes: "",
    total_notas: 0,
    notas_vencidas: 0,
    valor_pago: 0,
    valor_devendo: 0,
    proximo_vencimento: "" as string | ""
  });

  const [vendedoras, setVendedoras] = useState<VendedoraRow[]>([]);
  const [loading, setLoading] = useState(false);

  /** ------------ LOAD ------------ */
  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendedoras")
      .select("id, nome, telefone, email, endereco, status, observacoes, total_notas, notas_vencidas, valor_pago, valor_devendo, proximo_vencimento, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: "Erro ao carregar vendedoras",
        description: error.message,
        variant: "destructive",
      });
      setVendedoras([]);
    } else {
      setVendedoras((data ?? []) as VendedoraRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  /** ------------ HELPERS ------------ */
  const getStatusVariant = (status: string) => (status === "ativa" ? "secondary" : "destructive");

  const getVencimentoVariant = (date?: string | null) => {
    if (!date) return "outline" as const;
    const hoje = new Date();
    const venc = new Date(date);
    const diff = Math.ceil((+venc - +hoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "destructive";
    if (diff <= 7) return "outline";
    return "secondary";
  };

  const resumo = useMemo(() => {
    return {
      ativas: vendedoras.filter(v => v.status === "ativa").length,
      vencidas: vendedoras.reduce((acc, v) => acc + (v.notas_vencidas ?? 0), 0),
      pago: vendedoras.reduce((acc, v) => acc + Number(v.valor_pago ?? 0), 0),
      devendo: vendedoras.reduce((acc, v) => acc + Number(v.valor_devendo ?? 0), 0),
    };
  }, [vendedoras]);

  const filtered = vendedoras.filter(v =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.telefone ?? "").includes(searchTerm)
  );

  /** ------------ OPEN/CLOSE MODAL ------------ */
  const openNew = () => {
    setEditingId(null);
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      endereco: "",
      status: "ativa",
      observacoes: "",
      total_notas: 0,
      notas_vencidas: 0,
      valor_pago: 0,
      valor_devendo: 0,
      proximo_vencimento: ""
    });
    setIsDialogOpen(true);
  };

  const openEdit = (row: VendedoraRow) => {
    setEditingId(row.id);
    setFormData({
      nome: row.nome ?? "",
      telefone: row.telefone ?? "",
      email: row.email ?? "",
      endereco: row.endereco ?? "",
      status: (row.status as "ativa" | "inativa") ?? "ativa",
      observacoes: row.observacoes ?? "",
      total_notas: row.total_notas ?? 0,
      notas_vencidas: row.notas_vencidas ?? 0,
      valor_pago: Number(row.valor_pago ?? 0),
      valor_devendo: Number(row.valor_devendo ?? 0),
      proximo_vencimento: row.proximo_vencimento ?? ""
    });
    setIsDialogOpen(true);
  };

  /** ------------ SAVE ------------ */
  const salvar = async () => {
    if (!formData.nome.trim()) {
      toast({ title: "Informe o nome", variant: "destructive" });
      return;
    }

    // o ENUM no banco é 'ativa' / 'inativa'
    const payload = {
      nome: formData.nome.trim(),
      telefone: formData.telefone || null,
      email: formData.email || null,
      endereco: formData.endereco || null,
      status: formData.status, // já vem em minúsculo
      observacoes: formData.observacoes || null,
      total_notas: Number(formData.total_notas || 0),
      notas_vencidas: Number(formData.notas_vencidas || 0),
      valor_pago: Number(formData.valor_pago || 0),
      valor_devendo: Number(formData.valor_devendo || 0),
      proximo_vencimento: formData.proximo_vencimento || null,
    };

    if (editingId) {
      const { error } = await supabase.from("vendedoras").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Vendedora atualizada!" });
    } else {
      const { error } = await supabase.from("vendedoras").insert(payload);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Vendedora cadastrada!" });
    }

    setIsDialogOpen(false);
    setEditingId(null);
    await carregar();
  };

  /** ------------ DELETE ------------ */
  const excluir = async (id: string) => {
    const { error } = await supabase.from("vendedoras").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vendedora excluída!" });
    await carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Vendedoras
          </h1>
          <p className="text-muted-foreground">Gerencie suas vendedoras e controle de notas</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Vendedora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Vendedora" : "Cadastrar Nova Vendedora"}</DialogTitle>
              <DialogDescription>Preencha as informações. Apenas nome é obrigatório.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => setFormData(p => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div>
                <Label>Endereço</Label>
                <Input value={formData.endereco} onChange={(e) => setFormData(p => ({ ...p, endereco: e.target.value }))} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={formData.status}
                    onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as "ativa" | "inativa" }))}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>

                <div>
                  <Label>Total de Notas</Label>
                  <Input type="number" value={formData.total_notas} onChange={(e) => setFormData(p => ({ ...p, total_notas: Number(e.target.value || 0) }))} />
                </div>

                <div>
                  <Label>Notas Vencidas</Label>
                  <Input type="number" value={formData.notas_vencidas} onChange={(e) => setFormData(p => ({ ...p, notas_vencidas: Number(e.target.value || 0) }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input type="number" value={formData.valor_pago} onChange={(e) => setFormData(p => ({ ...p, valor_pago: Number(e.target.value || 0) }))} />
                </div>

                <div>
                  <Label>Valor Devendo (R$)</Label>
                  <Input type="number" value={formData.valor_devendo} onChange={(e) => setFormData(p => ({ ...p, valor_devendo: Number(e.target.value || 0) }))} />
                </div>

                <div>
                  <Label>Próximo Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.proximo_vencimento || ""}
                    onChange={(e) => setFormData(p => ({ ...p, proximo_vencimento: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <textarea
                  className="w-full p-2 border rounded resize-none h-20"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Observações sobre a vendedora..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} className="bg-gradient-to-r from-purple to-pink text-white">
                {editingId ? "Salvar Alterações" : "Salvar Vendedora"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Buscar vendedoras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-purple" />
              <div>
                <p className="text-sm text-muted-foreground">Vendedoras Ativas</p>
                <p className="text-2xl font-bold">{resumo.ativas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-pink" />
              <div>
                <p className="text-sm text-muted-foreground">Notas Vencidas</p>
                <p className="text-2xl font-bold text-destructive">{resumo.vencidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold">R$ {resumo.pago.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Devendo</p>
                <p className="text-2xl font-bold text-destructive">R$ {resumo.devendo.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple" />
            Lista de Vendedoras
          </CardTitle>
          <CardDescription>
            {loading ? "Carregando..." : `${filtered.length} vendedora(s) encontrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Total Notas</TableHead>
                <TableHead className="text-center">Vencidas</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Valor Devendo</TableHead>
                <TableHead>Próximo Vencimento</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nome}</TableCell>
                  <TableCell>{v.telefone ?? "-"}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(v.status)}>{v.status === "ativa" ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell className="text-center">{v.total_notas}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.notas_vencidas > 0 ? "destructive" : "secondary"}>{v.notas_vencidas}</Badge>
                  </TableCell>
                  <TableCell>R$ {Number(v.valor_pago ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={Number(v.valor_devendo ?? 0) > 0 ? "text-destructive font-semibold" : ""}>
                      R$ {Number(v.valor_devendo ?? 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {v.proximo_vencimento ? (
                      <Badge variant={getVencimentoVariant(v.proximo_vencimento)}>{v.proximo_vencimento}</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(v)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => excluir(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhuma vendedora encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendedoras;
