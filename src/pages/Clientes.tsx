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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Users, MessageCircle, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** ---------- Tipos ---------- */
type ClienteRow = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
  created_at?: string;
};

type ProdutoVar = {
  produto_id: string;
  referencia: string | null;
  nome: string | null;
  cor: string | null;
  tamanho: string | null;
  preco_venda: number | null;
  estoque_loja: number;
  estoque_fabrica: number;
};

type PedidoItemForm = {
  id: number; // id local do formulário
  referencia: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  valor: number; // unitário
};

type PedidoRow = {
  id: string;
  cliente_id: string;
  canal: "whatsapp" | "instagram" | "outro";
  status: "Aberto" | "Notificado" | "Concluido" | "Cancelado";
  created_at: string;
  cliente?: { id: string; nome: string; whatsapp: string | null } | null;
  pedido_itens?: {
    id: string;
    produto_id: string | null;
    referencia: string | null;
    tamanho: string | null;
    cor: string | null;
    quantidade: number | null;
    valor_unitario: number | null;
  }[];
};

/** Format helpers */
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const asMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

export default function Clientes() {
  const { toast } = useToast();

  /** ---------- Filtros e UI ---------- */
  const [tab, setTab] = useState<"clientes" | "pedidos">("clientes");
  const [search, setSearch] = useState("");

  /** ---------- Clientes ---------- */
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [clienteForm, setClienteForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    cidade: "",
    observacoes: "",
  });

  /** ---------- Produtos (para pedido) ---------- */
  const [produtos, setProdutos] = useState<ProdutoVar[]>([]);
  const [origemEstoqueParaDisponibilidade, setOrigemEstoqueParaDisponibilidade] =
    useState<"loja" | "fabrica" | "qualquer">("qualquer");

  /** ---------- Pedidos ---------- */
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [pedidoFormClienteId, setPedidoFormClienteId] = useState<string>("");
  const [pedidoFormCanal, setPedidoFormCanal] = useState<"whatsapp" | "instagram" | "outro">(
    "whatsapp"
  );
  const [pedidoItens, setPedidoItens] = useState<PedidoItemForm[]>([
    { id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 },
  ]);

  /** ---------- Carregamentos ---------- */
  const carregarClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, whatsapp, email, cidade, observacoes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
      setClientes([]);
      return;
    }
    setClientes((data ?? []) as ClienteRow[]);
  };

  const carregarProdutos = async () => {
    const { data, error } = await supabase
      .from("vw_produtos_resumo")
      .select("*")
      .order("referencia", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar estoque", description: error.message, variant: "destructive" });
      setProdutos([]);
      return;
    }
    setProdutos((data ?? []) as ProdutoVar[]);
  };

  const carregarPedidos = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        `
        id, cliente_id, canal, status, created_at,
        cliente:clientes!pedidos_cliente_id_fkey ( id, nome, whatsapp ),
        pedido_itens ( id, produto_id, referencia, tamanho, cor, quantidade, valor_unitario )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar pedidos", description: error.message, variant: "destructive" });
      setPedidos([]);
      return;
    }
    setPedidos((data ?? []) as unknown as PedidoRow[]);
  };

  useEffect(() => {
    carregarClientes();
    carregarProdutos();
    carregarPedidos();
  }, []);

  /** ---------- Derivados ---------- */
  const clientesFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.whatsapp ?? "").includes(onlyDigits(search)) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.cidade ?? "").toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const pedidosFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return pedidos.filter(
      (p) =>
        (p.cliente?.nome ?? "").toLowerCase().includes(q) ||
        (p.pedido_itens ?? []).some((i) => (i.referencia ?? "").toLowerCase().includes(q))
    );
  }, [pedidos, search]);

  /** ---------- Helpers de produtos/estoque ---------- */
  const referencias = useMemo(
    () =>
      Array.from(
        new Set(produtos.map((p) => p.referencia || "").filter((r): r is string => Boolean(r)))
      ),
    [produtos]
  );

  const tamanhosDisponiveis = (ref: string) =>
    Array.from(
      new Set(
        produtos
          .filter((p) => p.referencia === ref)
          .map((p) => p.tamanho || "")
          .filter((t): t is string => Boolean(t))
      )
    );

  const coresDisponiveis = (ref: string, tam?: string) =>
    Array.from(
      new Set(
        produtos
          .filter((p) => p.referencia === ref && (!tam || p.tamanho === tam))
          .map((p) => p.cor || "")
          .filter((c): c is string => Boolean(c))
      )
    );

  const findProdutoVar = (ref: string, tam: string, cor: string) =>
    produtos.find((p) => p.referencia === ref && p.tamanho === tam && p.cor === cor);

  const itemDisponivel = (it: { referencia?: string | null; tamanho?: string | null; cor?: string | null; quantidade?: number | null }) => {
    if (!it.referencia || !it.tamanho || !it.cor) return false;
    const p = findProdutoVar(it.referencia, it.tamanho, it.cor);
    if (!p) return false;
    const qNec = Number(it.quantidade ?? 0) || 0;
    if (origemEstoqueParaDisponibilidade === "loja") return (p.estoque_loja ?? 0) >= qNec;
    if (origemEstoqueParaDisponibilidade === "fabrica") return (p.estoque_fabrica ?? 0) >= qNec;
    return (p.estoque_loja + p.estoque_fabrica) >= qNec;
  };

  const pedidoDisponivelInfo = (p: PedidoRow) => {
    const itens = p.pedido_itens ?? [];
    const disponiveis = itens.filter(itemDisponivel).length;
    return { disponiveis, total: itens.length, all: disponiveis === itens.length && itens.length > 0 };
  };

  /** ---------- Clientes: criar/editar ---------- */
  const abrirNovoCliente = () => {
    setEditingClienteId(null);
    setClienteForm({ nome: "", whatsapp: "", email: "", cidade: "", observacoes: "" });
    setIsClienteModalOpen(true);
  };

  const abrirEdicaoCliente = (cliente: ClienteRow) => {
    setEditingClienteId(cliente.id);
    setClienteForm({
      nome: cliente.nome || "",
      whatsapp: cliente.whatsapp || "",
      email: cliente.email || "",
      cidade: cliente.cidade || "",
      observacoes: cliente.observacoes || "",
    });
    setIsClienteModalOpen(true);
  };

  const salvarCliente = async () => {
    try {
      if (!clienteForm.nome.trim()) {
        toast({ title: "Nome é obrigatório", variant: "destructive" });
        return;
      }

      if (editingClienteId) {
        const { error } = await supabase
          .from("clientes")
          .update({
            nome: clienteForm.nome.trim(),
            whatsapp: clienteForm.whatsapp?.trim() || null,
            email: clienteForm.email?.trim() || null,
            cidade: clienteForm.cidade?.trim() || null,
            observacoes: clienteForm.observacoes?.trim() || null,
          })
          .eq("id", editingClienteId);

        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
      } else {
        const { error } = await supabase.from("clientes").insert({
          nome: clienteForm.nome.trim(),
          whatsapp: clienteForm.whatsapp?.trim() || null,
          email: clienteForm.email?.trim() || null,
          cidade: clienteForm.cidade?.trim() || null,
          observacoes: clienteForm.observacoes?.trim() || null,
          ativo: true,
        });
        if (error) throw error;
        toast({ title: "Cliente cadastrado!" });
      }

      setIsClienteModalOpen(false);
      setEditingClienteId(null);
      await carregarClientes();
    } catch (e: any) {
      toast({ title: "Erro ao salvar cliente", description: e?.message, variant: "destructive" });
    }
  };

  /** ---------- Pedidos: criar/editar/excluir ---------- */
  const abrirNovoPedido = () => {
    setEditingPedidoId(null);
    setPedidoFormClienteId("");
    setPedidoFormCanal("whatsapp");
    setPedidoItens([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]);
    setIsPedidoModalOpen(true);
  };

  const abrirEdicaoPedido = (p: PedidoRow) => {
    setEditingPedidoId(p.id);
    setPedidoFormClienteId(p.cliente_id);
    setPedidoFormCanal(p.canal);
    setPedidoItens(
      (p.pedido_itens ?? []).map((i, idx) => ({
        id: Date.now() + idx,
        referencia: i.referencia || "",
        tamanho: i.tamanho || "",
        cor: i.cor || "",
        quantidade: Number(i.quantidade || 1),
        valor: Number(i.valor_unitario || 0),
      }))
    );
    setIsPedidoModalOpen(true);
  };

  const salvarPedido = async () => {
    try {
      if (!pedidoFormClienteId) {
        toast({ title: "Selecione um cliente", variant: "destructive" });
        return;
      }
      for (const it of pedidoItens) {
        if (!it.referencia || !it.tamanho || !it.cor) {
          toast({ title: "Preencha referência, tamanho e cor de todos os itens", variant: "destructive" });
          return;
        }
      }

      if (editingPedidoId) {
        // update header
        const { error: upErr } = await supabase
          .from("pedidos")
          .update({ cliente_id: pedidoFormClienteId, canal: pedidoFormCanal })
          .eq("id", editingPedidoId);
        if (upErr) throw upErr;

        // replace items
        await supabase.from("pedido_itens").delete().eq("pedido_id", editingPedidoId);
        for (const it of pedidoItens) {
          const p = findProdutoVar(it.referencia, it.tamanho, it.cor);
          await supabase.from("pedido_itens").insert({
            pedido_id: editingPedidoId,
            produto_id: p?.produto_id ?? null,
            referencia: it.referencia,
            tamanho: it.tamanho,
            cor: it.cor,
            quantidade: it.quantidade,
            valor_unitario: it.valor,
          });
        }

        toast({ title: "Pedido atualizado!" });
      } else {
        // create header
        const { data: inserted, error: insErr } = await supabase
          .from("pedidos")
          .insert({ cliente_id: pedidoFormClienteId, canal: pedidoFormCanal, status: "Aberto" })
          .select("id")
          .single();
        if (insErr) throw insErr;

        // items
        for (const it of pedidoItens) {
          const p = findProdutoVar(it.referencia, it.tamanho, it.cor);
          await supabase.from("pedido_itens").insert({
            pedido_id: inserted!.id,
            produto_id: p?.produto_id ?? null,
            referencia: it.referencia,
            tamanho: it.tamanho,
            cor: it.cor,
            quantidade: it.quantidade,
            valor_unitario: it.valor,
          });
        }

        toast({ title: "Pedido cadastrado!" });
      }

      setIsPedidoModalOpen(false);
      setEditingPedidoId(null);
      await carregarPedidos();
    } catch (e: any) {
      toast({ title: "Erro ao salvar pedido", description: e?.message, variant: "destructive" });
    }
  };

  const excluirPedido = async (id?: string) => {
    if (!id) return;
    try {
      await supabase.from("pedido_itens").delete().eq("pedido_id", id);
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Pedido removido!" });
      await carregarPedidos();
    } catch (e: any) {
      toast({ title: "Erro ao excluir pedido", description: e?.message, variant: "destructive" });
    }
  };

  /** ---------- WhatsApp: envio ---------- */
  const enviarWhatsPedido = async (pedido: PedidoRow) => {
    const cli = pedido.cliente;
    if (!cli?.whatsapp) {
      toast({ title: "Cliente sem WhatsApp cadastrado", variant: "destructive" });
      return;
    }

    const itens = (pedido.pedido_itens ?? []).map((i) => {
      const pv = i.referencia && i.tamanho && i.cor ? findProdutoVar(i.referencia, i.tamanho, i.cor) : undefined;
      return {
        ref: i.referencia || "",
        nome: pv?.nome || "Produto",
        cor: i.cor || "",
        tam: i.tamanho || "",
        qtd: Number(i.quantidade || 0),
        val: Number(i.valor_unitario || 0),
        disp: itemDisponivel(i),
        subtotal: Number(i.quantidade || 0) * Number(i.valor_unitario || 0),
      };
    });

    const total = itens.reduce((t, i) => t + i.subtotal, 0);
    const disponiveis = itens.filter((i) => i.disp);
    const temTodos = disponiveis.length === itens.length && itens.length > 0;

    const linhas = itens
      .map(
        (i) =>
          `• ${i.ref} - ${i.nome}\n  Cor: ${i.cor} | Tam: ${i.tam}\n  Qtd: ${i.qtd} | Unit: ${asMoney(i.val)}${
            i.disp ? "  [DISPONÍVEL]" : "  [EM FALTA]"
          }`
      )
      .join("\n\n");

    const msg =
      `*${cli.nome}*, boas notícias! 💜\n` +
      `Seu pedido (*${pedido.id.slice(0, 8).toUpperCase()}*) está ${temTodos ? "*PRONTO*" : "parcialmente disponível"}.\n\n` +
      `${linhas}\n\n` +
      `*Total estimado:* ${asMoney(total)}\n` +
      `Formas de pagamento: PIX, Dinheiro, Cartão (débito/crédito)\n\n` +
      `Posso reservar por 24h para você?`;

    const url = `https://wa.me/55${onlyDigits(cli.whatsapp)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

    // marca como notificado
    await supabase.from("pedidos").update({ status: "Notificado" }).eq("id", pedido.id);
    await carregarPedidos();
  };

  /** ---------- UI ---------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Clientes
          </h1>
          <p className="text-muted-foreground">Gerencie clientes e seus pedidos</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isPedidoModalOpen} onOpenChange={setIsPedidoModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={abrirNovoPedido}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPedidoId ? "Editar Pedido" : "Cadastrar Novo Pedido"}</DialogTitle>
                <DialogDescription>
                  Registre uma reserva/solicitação do cliente. Mostramos a disponibilidade conforme o estoque.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Cliente</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={pedidoFormClienteId}
                      onChange={(e) => setPedidoFormClienteId(e.target.value)}
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.whatsapp ? `- ${c.whatsapp}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Canal</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={pedidoFormCanal}
                      onChange={(e) =>
                        setPedidoFormCanal(e.target.value as "whatsapp" | "instagram" | "outro")
                      }
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <Label>Disponibilidade considera</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={origemEstoqueParaDisponibilidade}
                      onChange={(e) =>
                        setOrigemEstoqueParaDisponibilidade(
                          e.target.value as "loja" | "fabrica" | "qualquer"
                        )
                      }
                    >
                      <option value="qualquer">Loja + Fábrica</option>
                      <option value="loja">Somente Loja</option>
                      <option value="fabrica">Somente Fábrica</option>
                    </select>
                  </div>
                </div>

                {/* Itens do pedido */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Itens</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPedidoItens((prev) => [
                          ...prev,
                          { id: Date.now(), referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {pedidoItens.map((item, index) => {
                    const tams = item.referencia ? tamanhosDisponiveis(item.referencia) : [];
                    const cores = item.referencia ? coresDisponiveis(item.referencia, item.tamanho) : [];
                    const disp = itemDisponivel(item);

                    return (
                      <Card key={item.id} className="p-4">
                        <div className="grid grid-cols-6 gap-4 items-end">
                          <div>
                            <Label>Referência</Label>
                            <select
                              className="w-full p-2 border rounded"
                              value={item.referencia}
                              onChange={(e) => {
                                const ref = e.target.value;
                                const first = produtos.find((p) => p.referencia === ref);
                                setPedidoItens((prev) =>
                                  prev.map((it, i) =>
                                    i === index
                                      ? {
                                          ...it,
                                          referencia: ref,
                                          tamanho: "",
                                          cor: "",
                                          valor: Number(first?.preco_venda ?? 0),
                                        }
                                      : it
                                  )
                                );
                              }}
                            >
                              <option value="">Selecione…</option>
                              {referencias.map((ref) => (
                                <option key={ref} value={ref}>
                                  {ref}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Tamanho</Label>
                            <select
                              className="w-full p-2 border rounded"
                              value={item.tamanho}
                              onChange={(e) =>
                                setPedidoItens((prev) =>
                                  prev.map((it, i) =>
                                    i === index ? { ...it, tamanho: e.target.value, cor: "" } : it
                                  )
                                )
                              }
                            >
                              <option value="">Selecione…</option>
                              {tams.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Cor</Label>
                            <select
                              className="w-full p-2 border rounded"
                              value={item.cor}
                              onChange={(e) =>
                                setPedidoItens((prev) =>
                                  prev.map((it, i) => (i === index ? { ...it, cor: e.target.value } : it))
                                )
                              }
                            >
                              <option value="">Selecione…</option>
                              {cores.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Qtd</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantidade}
                              onChange={(e) =>
                                setPedidoItens((prev) =>
                                  prev.map((it, i) =>
                                    i === index ? { ...it, quantidade: Number(e.target.value || 1) } : it
                                  )
                                )
                              }
                            />
                          </div>

                          <div>
                            <Label>Valor Unit.</Label>
                            <Input
                              type="number"
                              value={item.valor}
                              onChange={(e) =>
                                setPedidoItens((prev) =>
                                  prev.map((it, i) =>
                                    i === index ? { ...it, valor: Number(e.target.value || 0) } : it
                                  )
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={disp ? "secondary" : "destructive"}>
                              {disp ? "Disponível" : "Em falta"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setPedidoItens((prev) => prev.filter((i) => i.id !== item.id))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPedidoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={salvarPedido} className="bg-gradient-to-r from-purple to-pink text-white">
                  {editingPedidoId ? "Salvar Alterações" : "Salvar Pedido"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isClienteModalOpen} onOpenChange={setIsClienteModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90" onClick={abrirNovoCliente}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClienteId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
                <DialogDescription>Preencha as informações do cliente. Apenas nome é obrigatório.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Nome completo"
                      value={clienteForm.nome}
                      onChange={(e) => setClienteForm((p) => ({ ...p, nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input
                      placeholder="48999991234"
                      value={clienteForm.whatsapp}
                      onChange={(e) => setClienteForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={clienteForm.email}
                    onChange={(e) => setClienteForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Cidade"
                    value={clienteForm.cidade}
                    onChange={(e) => setClienteForm((p) => ({ ...p, cidade: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <textarea
                    className="w-full p-2 border rounded resize-none h-20"
                    placeholder="Observações sobre o cliente..."
                    value={clienteForm.observacoes}
                    onChange={(e) => setClienteForm((p) => ({ ...p, observacoes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsClienteModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={salvarCliente} className="bg-gradient-to-r from-purple to-pink text-white">
                  {editingClienteId ? "Salvar Alterações" : "Salvar Cliente"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar clientes/pedidos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Abas */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        </TabsList>

        {/* CLIENTES */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple" />
                Lista de Clientes
              </CardTitle>
              <CardDescription>{clientesFiltrados.length} cliente(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.whatsapp || "-"}</TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{c.cidade || "-"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicaoCliente(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {c.whatsapp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="WhatsApp"
                              onClick={() => {
                                const url = `https://wa.me/55${onlyDigits(c.whatsapp!)}`;
                                window.open(url, "_blank");
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PEDIDOS */}
        <TabsContent value="pedidos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple" />
                Lista de Pedidos
              </CardTitle>
              <CardDescription>{pedidosFiltrados.length} pedido(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Disponíveis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.map((p) => {
                    const info = pedidoDisponivelInfo(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.cliente?.nome ?? "-"}</TableCell>
                        <TableCell>{p.pedido_itens?.length ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={info.all ? "secondary" : info.disponiveis > 0 ? "outline" : "destructive"}>
                            {info.disponiveis}/{info.total}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === "Aberto" ? "outline" : "secondary"}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicaoPedido(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => excluirPedido(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="WhatsApp: avisar disponibilidade"
                              onClick={() => enviarWhatsPedido(p)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
