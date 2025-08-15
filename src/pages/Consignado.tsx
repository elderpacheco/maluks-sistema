import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, FileText, Package, Trash2, Edit, Archive, ArchiveRestore, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/** --- Tipos --- */
type VendedoraCard = {
  id: string;
  nome: string;
  notas_abertas: number;
  saldo_aberto: number;
};

type ConsignadoResumo = {
  id: string;
  numero: string;
  vendedora_id: string;
  vendedora_nome: string | null;
  data_emissao: string;
  vencimento: string | null;
  origem: "loja" | "fabrica";
  status: "aberta" | "fechada" | "cancelada";
  valor_total: number;
  valor_devolvido: number;
  valor_vendido: number;
  itens_total: number;
  itens_devolvidos: number;
  itens_vendidos: number;
  valor_pago: number;
  saldo: number;
  archived: boolean;
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

type ItemForm = {
  id: number;
  referencia: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  valor: number;
};

type ItemParaDevolucao = {
  id: string;
  consignado_id: string;
  numero: string;
  referencia: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  quantidade_devolvida: number;
  valor_unitario: number;
  status_nota: "aberta" | "fechada" | "cancelada";
};

type ConsignadoKPIs = {
  total_fora: number;
  top_fora_referencia: string | null;
  top_fora_qtd: number | null;
  top_fora_nome: string | null;
  top_devolve_referencia: string | null;
  top_devolve_qtd: number | null;
  top_devolve_nome: string | null;
};

type Pagamento = {
  id?: string;
  consignado_id: string;
  parcela_numero: number;
  due_date: string | null;
  valor: number;
  valor_pago: number;
  pago: boolean;
  pago_em: string | null;
  obs?: string | null;
  _ui_new?: boolean;
  _ui_deleted?: boolean;
};

const brl = (v: number | null | undefined) =>
  (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** --- Componente --- */
const Consignado = () => {
  const { toast } = useToast();

  // filtros/abas
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendedora, setSelectedVendedora] = useState<string | null>(null);
  const [aba, setAba] = useState<"atuais" | "arquivadas">("atuais");

  // dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // origem
  const [origem, setOrigem] = useState<"loja" | "fabrica">("fabrica");

  // dados
  const [cards, setCards] = useState<VendedoraCard[]>([]);
  const [notas, setNotas] = useState<ConsignadoResumo[]>([]);
  const [produtos, setProdutos] = useState<ProdutoVar[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState<ConsignadoKPIs>({
    total_fora: 0,
    top_fora_referencia: null,
    top_fora_qtd: null,
    top_fora_nome: null,
    top_devolve_referencia: null,
    top_devolve_qtd: null,
    top_devolve_nome: null,
  });

  // form nova nota
  const [novaVendedoraId, setNovaVendedoraId] = useState<string>("");
  const [vencimento, setVencimento] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [itensNota, setItensNota] = useState<ItemForm>(
    [{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }] as any
  );

  // edição
  const [editNota, setEditNota] = useState<ConsignadoResumo | null>(null);
  const [editItens, setEditItens] = useState<ItemParaDevolucao[]>([]);

  // pagamentos no modal de edição
  const [editPagamentos, setEditPagamentos] = useState<Pagamento[]>([]);
  const [gerarParcelasQtd, setGerarParcelasQtd] = useState<number>(1);
  const [gerarParcelasPrimeiroVcto, setGerarParcelasPrimeiroVcto] = useState<string>("");

  /** ------------------- Carregamentos ------------------- */
  const carregarCards = async () => {
    const { data, error } = await supabase
      .from("vw_vendedoras_consignado")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar vendedoras", description: error.message, variant: "destructive" });
      setCards([]);
    } else {
      setCards((data ?? []) as VendedoraCard[]);
    }
  };

  const carregarNotas = async () => {
    const { data, error } = await supabase
      .from("vw_consignados_resumo")
      .select("*")
      .order("data_emissao", { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar notas", description: error.message, variant: "destructive" });
      setNotas([]);
    } else {
      setNotas((data ?? []) as ConsignadoResumo[]);
    }
  };

  const carregarProdutos = async () => {
    setCarregandoProdutos(true);
    let q = supabase.from("vw_produtos_resumo").select("*");
    q = origem === "loja" ? q.gt("estoque_loja", 0) : q.gt("estoque_fabrica", 0);

    const { data, error } = await q.order("referencia", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar produtos", description: error.message, variant: "destructive" });
      setProdutos([]);
    } else {
      setProdutos((data ?? []) as ProdutoVar[]);
    }
    setCarregandoProdutos(false);
  };

  const carregarKPIs = async () => {
    const { data, error } = await supabase.from("vw_consignado_kpis").select("*").single();
    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar indicadores", description: error.message, variant: "destructive" });
      return;
    }
    setKpis({
      total_fora: Number(data?.total_fora ?? 0),
      top_fora_referencia: data?.top_fora_referencia ?? null,
      top_fora_qtd: data?.top_fora_qtd ?? null,
      top_fora_nome: data?.top_fora_nome ?? null,
      top_devolve_referencia: data?.top_devolve_referencia ?? null,
      top_devolve_qtd: data?.top_devolve_qtd ?? null,
      top_devolve_nome: data?.top_devolve_nome ?? null,
    });
  };

  useEffect(() => {
    carregarCards();
    carregarNotas();
    carregarKPIs();
  }, []);

  useEffect(() => {
    carregarProdutos();
    setItensNota([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }] as any);
  }, [origem]);

  /** ------------------- Helpers p/ produtos ------------------- */
  const referencias = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.referencia || "").filter((r): r is string => Boolean(r)))),
    [produtos]
  );

  const tamanhosDisponiveis = (ref: string) =>
    Array.from(new Set(produtos.filter((p) => p.referencia === ref).map((p) => p.tamanho || "").filter(Boolean) as string[]));

  const coresDisponiveis = (ref: string, tam?: string) =>
    Array.from(
      new Set(
        produtos
          .filter((p) => p.referencia === ref && (!tam || p.tamanho === tam))
          .map((p) => p.cor || "")
          .filter(Boolean) as string[]
      )
    );

  const findProdutoVar = (ref: string, tam: string, cor: string) =>
    produtos.find((p) => p.referencia === ref && p.tamanho === tam && p.cor === cor);

  /** ------------------- Nova Nota ------------------- */
  const adicionarItem = () =>
    setItensNota((prev: any) => [...prev, { id: Date.now(), referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]);

  const removerItem = (id: number) => setItensNota((prev: any) => prev.filter((i: ItemForm) => i.id !== id));

  const proximoNumeroConsignado = async (): Promise<string> => {
    const { data, error } = await supabase
      .from("consignados")
      .select("numero, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return "C001";
    const ultimo = (data[0].numero as string) || "C000";
    const n = parseInt(ultimo.replace(/\D/g, "") || "0", 10) + 1;
    return "C" + String(n).padStart(3, "0");
  };

  const finalizarNota = async () => {
    try {
      if (!novaVendedoraId) {
        toast({ title: "Selecione a vendedora", variant: "destructive" });
        return;
      }
      for (const it of itensNota as any as ItemForm[]) {
        if (!it.referencia || !it.tamanho || !it.cor) {
          toast({ title: "Preencha referência, tamanho e cor de todos os itens", variant: "destructive" });
          return;
        }
      }

      const numero = await proximoNumeroConsignado();

      const { data: cab, error: errCab } = await supabase
        .from("consignados")
        .insert({
          numero,
          vendedora_id: novaVendedoraId,
          origem,
          vencimento: vencimento || null,
          observacoes: observacoes || null,
          status: "aberta",
        })
        .select("id, numero")
        .single();
      if (errCab) throw errCab;

      for (const it of itensNota as any as ItemForm[]) {
        const varSel = findProdutoVar(it.referencia, it.tamanho, it.cor);
        const produto_id = varSel?.produto_id ?? null;
        const { error: errItem } = await supabase.from("consignado_itens").insert({
          consignado_id: cab.id,
          produto_id,
          referencia: it.referencia,
          tamanho: it.tamanho,
          cor: it.cor,
          quantidade: it.quantidade,
          valor_unitario: it.valor,
        });
        if (errItem) throw errItem;
      }

      toast({ title: "Nota criada!", description: `Número: ${cab.numero}` });
      setIsDialogOpen(false);

      setNovaVendedoraId("");
      setVencimento("");
      setObservacoes("");
      setItensNota([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }] as any);

      await Promise.all([carregarProdutos(), carregarNotas(), carregarCards(), carregarKPIs()]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao criar nota", description: e?.message ?? "Falha ao salvar.", variant: "destructive" });
    }
  };

  /** ------------------- Edição / devoluções ------------------- */
  const abrirEdicao = async (nota: ConsignadoResumo) => {
    try {
      setEditNota(nota);

      const { data: itens, error: errItens } = await supabase
        .from("consignado_itens")
        .select("id, consignado_id, referencia, tamanho, cor, quantidade, quantidade_devolvida, valor_unitario")
        .eq("consignado_id", nota.id);
      if (errItens) throw errItens;

      const itensMap: ItemParaDevolucao[] =
        (itens ?? []).map((row: any) => ({ ...row, numero: nota.numero, status_nota: nota.status })) || [];
      setEditItens(itensMap);

      const { data: pags, error: errP } = await supabase
        .from("consignado_pagamentos")
        .select("id, consignado_id, parcela_numero, due_date, valor, valor_pago, pago, pago_em, obs")
        .eq("consignado_id", nota.id)
        .order("parcela_numero", { ascending: true });
      if (errP) throw errP;

      const list: Pagamento[] = (pags ?? []).map((p: any) => ({
        id: p.id,
        consignado_id: p.consignado_id,
        parcela_numero: p.parcela_numero,
        due_date: p.due_date,
        valor: Number(p.valor || 0),
        valor_pago: Number(p.valor_pago || 0),
        pago: !!p.pago,
        pago_em: p.pago_em,
        obs: p.obs ?? null,
      }));

      setEditPagamentos(list);
      setIsEditDialogOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao abrir edição", description: e?.message, variant: "destructive" });
    }
  };

  const salvarEdicao = async () => {
    if (!editNota) return;
    try {
      const { error: errUp } = await supabase
        .from("consignados")
        .update({ vencimento: editNota.vencimento, status: editNota.status })
        .eq("id", editNota.id);
      if (errUp) throw errUp;

      for (const it of editItens) {
        const { error } = await supabase
          .from("consignado_itens")
          .update({ quantidade_devolvida: it.quantidade_devolvida })
          .eq("id", it.id);
        if (error) throw error;
      }

      const linhasBase = (p: Pagamento, idx: number) => ({
        consignado_id: editNota!.id,
        parcela_numero: p.parcela_numero ?? idx + 1,
        due_date: p.due_date || null,
        valor: Number(p.valor || 0),
        valor_pago: Number(p.valor_pago || 0),
        pago: !!p.pago,
        pago_em: p.pago ? (p.pago_em || new Date().toISOString()) : null,
        obs: p.obs ?? null,
      });

      const ativos = editPagamentos.filter((p) => !p._ui_deleted);

      const existentes = ativos
        .filter((p) => !!p.id)
        .map((p, idx) => ({ id: p.id!, ...linhasBase(p, idx) }));

      const novos = ativos
        .filter((p) => !p.id)
        .map((p, idx) => linhasBase(p, idx));

      if (existentes.length) {
        const { error: errU } = await supabase
          .from("consignado_pagamentos")
          .upsert(existentes, { onConflict: "id", ignoreDuplicates: false });
        if (errU) throw errU;
      }

      if (novos.length) {
        const { error: errI } = await supabase.from("consignado_pagamentos").insert(novos);
        if (errI) throw errI;
      }

      const toDelete = editPagamentos.filter((p) => p._ui_deleted && p.id).map((p) => p.id as string);
      if (toDelete.length) {
        const { error: errD } = await supabase
          .from("consignado_pagamentos")
          .delete()
          .in("id", toDelete);
        if (errD) throw errD;
      }

      toast({ title: "Nota atualizada!", description: "Alterações salvas." });
      setIsEditDialogOpen(false);
      setEditNota(null);
      setEditItens([]);
      setEditPagamentos([]);

      await Promise.all([carregarNotas(), carregarProdutos(), carregarCards(), carregarKPIs()]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao atualizar nota", description: e?.message, variant: "destructive" });
    }
  };

  /** ------------------- Resumos / Totais ------------------- */
  const resumoEdicao = useMemo(() => {
    const totalOriginal = editItens.reduce((acc, it) => acc + it.quantidade * Number(it.valor_unitario || 0), 0);
    const totalDevolvido = editItens.reduce(
      (acc, it) => acc + Number(it.quantidade_devolvida || 0) * Number(it.valor_unitario || 0),
      0
    );
    const totalAtual = totalOriginal - totalDevolvido;
    return { totalOriginal, totalDevolvido, totalAtual };
  }, [editItens]);

  const resumoPagamentos = useMemo(() => {
    const totalParcelado = editPagamentos.filter((p) => !p._ui_deleted).reduce((a, p) => a + Number(p.valor || 0), 0);
    const totalPago = editPagamentos.filter((p) => !p._ui_deleted).reduce((a, p) => a + Number(p.valor_pago || 0), 0);
    const saldo = Math.max(0, (resumoEdicao.totalAtual || 0) - totalPago);
    return { totalParcelado, totalPago, saldo };
  }, [editPagamentos, resumoEdicao.totalAtual]);

  // KPIs
  const valorForaAtual = useMemo(() => {
    const base = notas.filter((n) => !n.archived);
    return base.reduce(
      (acc, n) => acc + Number(n.valor_total || 0) - Number(n.valor_devolvido || 0) - Number(n.valor_vendido || 0),
      0
    );
  }, [notas]);

  const valorVendidoAtual = useMemo(() => {
    const base = notas.filter((n) => !n.archived);
    return base.reduce((acc, n) => acc + Number(n.valor_vendido || 0), 0);
  }, [notas]);

  // Total da nova nota
  const totalNovaNota = useMemo(
    () => (itensNota as any as ItemForm[]).reduce((acc, it) => acc + Number(it.valor || 0) * Number(it.quantidade || 0), 0),
    [itensNota]
  );

  /** ------------------- Devolução rápida ------------------- */
  const [itensDevolucao, setItensDevolucao] = useState<ItemParaDevolucao[]>([]);
  const carregarItensDevolucao = async (vendedoraId: string) => {
    try {
      const { data: notasDaVend, error: errNotasVend } = await supabase
        .from("consignados")
        .select("id, numero, status")
        .eq("vendedora_id", vendedoraId)
        .eq("status", "aberta")
        .eq("archived", false);
      if (errNotasVend) throw errNotasVend;

      const ids = (notasDaVend ?? []).map((n: any) => n.id);
      if (!ids.length) {
        setItensDevolucao([]);
        return;
      }

      const { data: itens, error: errItens } = await supabase
        .from("consignado_itens")
        .select("id, consignado_id, referencia, tamanho, cor, quantidade, quantidade_devolvida, valor_unitario")
        .in("consignado_id", ids);
      if (errItens) throw errItens;

      const mapNumero: Record<string, string> = {};
      (notasDaVend ?? []).forEach((n: any) => (mapNumero[n.id] = n.numero));

      const list: ItemParaDevolucao[] = (itens ?? []).map((it: any) => ({
        ...it,
        numero: mapNumero[it.consignado_id],
        status_nota: "aberta",
      }));
      setItensDevolucao(list);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao carregar itens", description: e?.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (selectedVendedora) carregarItensDevolucao(selectedVendedora);
  }, [selectedVendedora]);

  const devolverQuantidade = async (itemId: string, devolver: number) => {
    try {
      const item = itensDevolucao.find((i) => i.id === itemId);
      if (!item) return;
      const nova = Math.min(item.quantidade, item.quantidade_devolvida + Math.max(0, devolver));
      const { error } = await supabase.from("consignado_itens").update({ quantidade_devolvida: nova }).eq("id", itemId);
      if (error) throw error;

      toast({ title: "Devolução registrada", description: "Estoque atualizado." });
      if (selectedVendedora) await carregarItensDevolucao(selectedVendedora);
      await Promise.all([carregarNotas(), carregarCards(), carregarProdutos(), carregarKPIs()]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na devolução", description: e?.message, variant: "destructive" });
    }
  };

  /** ------------------- Arquivar / Desarquivar ------------------- */
  const toggleArquivar = async (nota: ConsignadoResumo) => {
    try {
      if (!nota.archived && nota.status !== "fechada") {
        toast({ title: "Só é possível arquivar notas fechadas", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("consignados").update({ archived: !nota.archived }).eq("id", nota.id);
      if (error) throw error;
      toast({ title: nota.archived ? "Nota desarquivada" : "Nota arquivada" });
      await carregarNotas();
      await carregarCards();
      await carregarKPIs();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao arquivar", description: e?.message, variant: "destructive" });
    }
  };

  /** ------------------- Apagar (somente arquivadas) ------------------- */
  const deletarNota = async (nota: ConsignadoResumo) => {
    try {
      if (!nota.archived) {
        toast({ title: "Só é possível apagar notas arquivadas", variant: "destructive" });
        return;
      }

      const ok = window.confirm(
        `Tem certeza que deseja apagar DEFINITIVAMENTE a nota ${nota.numero}? Esta ação não pode ser desfeita.`
      );
      if (!ok) return;

      const { error: errP } = await supabase
        .from("consignado_pagamentos")
        .delete()
        .eq("consignado_id", nota.id);
      if (errP) throw errP;

      const { error: errI } = await supabase
        .from("consignado_itens")
        .delete()
        .eq("consignado_id", nota.id);
      if (errI) throw errI;

      const { error: errC } = await supabase.from("consignados").delete().eq("id", nota.id);
      if (errC) throw errC;

      toast({ title: `Nota ${nota.numero} apagada com sucesso.` });
      await Promise.all([carregarNotas(), carregarCards(), carregarKPIs()]);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao apagar nota",
        description: e?.message ?? "Falha ao excluir registros.",
        variant: "destructive",
      });
    }
  };

  /** ------------------- IMPRESSÃO DA NOTA ------------------- */
const imprimirNota = async (nota: ConsignadoResumo) => {
  try {
    // itens da nota (agora traz quantidade_devolvida)
    const { data: itens, error: iErr } = await supabase
      .from("consignado_itens")
      .select("referencia, tamanho, cor, quantidade, quantidade_devolvida, valor_unitario")
      .eq("consignado_id", nota.id)
      .order("referencia", { ascending: true });
    if (iErr) throw iErr;

    // nomes por referência
    const refs = Array.from(new Set((itens ?? []).map(i => i.referencia).filter(Boolean))) as string[];
    const nomes: Record<string, string> = {};
    if (refs.length) {
      const { data: prods } = await supabase
        .from("vw_produtos_resumo")
        .select("referencia, nome")
        .in("referencia", refs);
      (prods ?? []).forEach((p: any) => { if (p?.referencia) nomes[p.referencia] = p.nome || p.referencia; });
    }

    // observações (opcional)
    const { data: obsRow } = await supabase
      .from("consignados")
      .select("observacoes")
      .eq("id", nota.id)
      .single();

    const totalOriginal = (itens ?? []).reduce(
      (s, it) => s + Number(it.quantidade || 0) * Number(it.valor_unitario || 0),
      0
    );

    const linhas = (itens ?? []).map((it, idx) => {
      const qtd     = Number(it.quantidade || 0);
      const dev     = Number(it.quantidade_devolvida || 0);
      const rest    = Math.max(0, qtd - dev);                // RESTANTE (opcional)
      const unit    = Number(it.valor_unitario || 0);
      const sub     = rest * unit;                            // subtotal com base no restante
      const nome    = it.referencia ? (nomes[it.referencia] || it.referencia) : "";
      return `
        <tr>
          <td class="c">${idx + 1}</td>
          <td class="c">${it.referencia ?? ""}</td>
          <td>${nome}</td>
          <td class="c">${it.cor ?? ""}</td>
          <td class="c">${it.tamanho ?? ""}</td>
          <td class="n">${qtd}</td>
          <td class="n">${dev}</td>
          <td class="n">${rest}</td>                          <!-- RESTANTE (opcional) -->
          <td class="n">${unit.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
          <td class="n">${sub.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
        </tr>`;
    }).join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Nota de Consignado ${nota.numero}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color:#222; }
  .wrap { width: 190mm; margin: 0 auto; padding-top: 2mm; font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial; }
  .row { display:flex; justify-content:space-between; align-items:flex-start; }
  .brand { font-weight: 800; font-size: 13px; color:#6b21a8; }
  .meta  { font-size: 10px; color:#555; line-height:1.35; }
  .title { font-size: 13px; font-weight: 700; text-align:right; }
  .mt6 { margin-top: 6px; }
  .mt8 { margin-top: 8px; }

  table { width:100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th, td { border:1px solid #e5e7eb; padding: 3px 5px; font-size: 10.5px; }
  th { background:#f4f3ff; }
  .c { text-align:center; }
  .n { text-align:right; }

  /* larguras (mm) ajustadas para novas colunas */
  th.col-idx   { width: 6mm; }
  th.col-ref   { width: 20mm; }
  th.col-cor   { width: 16mm; }
  th.col-tam   { width: 10mm; }
  th.col-qtd   { width: 12mm; }
  th.col-dev   { width: 12mm; }
  th.col-rest  { width: 12mm; }    /* RESTANTE (opcional) */
  th.col-unit  { width: 22mm; }
  th.col-sub   { width: 24mm; }

  tr { page-break-inside: avoid; }

  .totais { display:flex; gap:6mm; justify-content:flex-end; margin-top: 6mm; }
  .box { border:1px solid #e5e7eb; padding: 4mm; min-width: 46mm; }
  .label { font-size: 10px; color:#666; }
  .value { font-size: 12px; font-weight: 700; }
  .obs { margin-top: 4mm; font-size: 10.5px; color:#444; }
  .assin { margin-top: 10mm; display:flex; gap:10mm; }
  .assin .l { flex:1; text-align:center; font-size:10px; }
  .assin .l .ln { margin-top: 14mm; border-top:1px solid #bbb; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="row">
      <div>
        <div class="brand">Maluks • Moda Íntima</div>
        <div class="meta">CNPJ: ———— • Telefone: ————</div>
      </div>
      <div style="text-align:right">
        <div class="title">Nota de Consignado</div>
        <div class="meta">Número: <b>${nota.numero}</b></div>
        <div class="meta">Emissão: <b>${nota.data_emissao}</b> • Venc.: <b>${nota.vencimento ?? "-"}</b></div>
        <div class="meta">Origem do estoque: <b>${nota.origem === "fabrica" ? "Fábrica" : "Loja"}</b></div>
      </div>
    </div>

    <div class="meta mt6"><b>Vendedora:</b> ${nota.vendedora_nome ?? "-"}</div>

    <table class="mt8">
      <thead>
        <tr>
          <th class="col-idx c">#</th>
          <th class="col-ref">Ref.</th>
          <th>Produto</th>
          <th class="col-cor c">Cor</th>
          <th class="col-tam c">Tam.</th>
          <th class="col-qtd n">Qtd</th>
          <th class="col-dev n">Devol.</th>
          <th class="col-rest n">Rest.</th>   <!-- RESTANTE (opcional) -->
          <th class="col-unit n">Valor Unit.</th>
          <th class="col-sub n">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${linhas || `<tr><td colspan="10" class="c" style="color:#666">Sem itens</td></tr>`}
      </tbody>
    </table>

    <div class="totais">
      <div class="box">
        <div class="label">Total Original</div>
        <div class="value">${(totalOriginal||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
      </div>
      <div class="box">
        <div class="label">Devolvido</div>
        <div class="value">${(Number(nota.valor_devolvido)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
      </div>
      <div class="box">
        <div class="label">Vendido</div>
        <div class="value">${(Number(nota.valor_vendido)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
      </div>
      <div class="box">
        <div class="label">Saldo</div>
        <div class="value">${(Number(nota.saldo)||0).toLocaleString("pt-BR",{style:"currency","currency":"BRL"})}</div>
      </div>
    </div>

    ${obsRow?.observacoes ? `<div class="obs"><b>Observações:</b> ${obsRow.observacoes}</div>` : ""}

    <div class="assin">
      <div class="l"><div class="ln"></div>Entregue por</div>
      <div class="l"><div class="ln"></div>Recebido por</div>
      <div class="l"><div class="ln"></div>Data</div>
    </div>
  </div>
  <script>window.onload = () => { try { window.print(); } catch(e){} };</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast({ title: "Pop-up bloqueado", description: "Permita pop-ups para imprimir a nota." });
      return;
    }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
  } catch (e: any) {
    console.error(e);
    toast({ title: "Erro ao gerar impressão", description: e?.message, variant: "destructive" });
  }
};


  /** ------------------- Derivados / filtros ------------------- */
  const countAtuais = notas.filter((n) => !n.archived).length;
  const countArquivadas = notas.filter((n) => n.archived).length;

  const filteredNotas = useMemo(() => {
    const base = notas.filter((n) => (aba === "arquivadas" ? n.archived : !n.archived));
    const porVendedora = selectedVendedora ? base.filter((n) => n.vendedora_id === selectedVendedora) : base;
    if (!searchTerm.trim()) return porVendedora;
    const st = searchTerm.toLowerCase();
    return porVendedora.filter(
      (n) => n.numero.toLowerCase().includes(st) || (n.vendedora_nome ?? "").toLowerCase().includes(st)
    );
  }, [notas, aba, selectedVendedora, searchTerm]);

  const statusBadge = (s: ConsignadoResumo["status"]) =>
    s === "aberta" ? "secondary" : s === "fechada" ? "outline" : "destructive";

  /** ------------------- Pagamentos: helpers do UI ------------------- */
  const addParcelaManual = () => {
    if (!editNota) return;
    const nextNum =
      (editPagamentos.filter((p) => !p._ui_deleted).reduce((m, p) => Math.max(m, p.parcela_numero || 0), 0) || 0) + 1;
    setEditPagamentos((prev) => [
      ...prev,
      {
        consignado_id: editNota.id,
        parcela_numero: nextNum,
        due_date: "",
        valor: 0,
        valor_pago: 0,
        pago: false,
        pago_em: null,
        obs: "",
        _ui_new: true,
      },
    ]);
  };

  const gerarParcelasIguais = () => {
    if (!editNota) return;
    const qtd = Math.max(1, Math.floor(gerarParcelasQtd || 1));
    const base = Math.max(0, resumoEdicao.totalAtual - (resumoPagamentos.totalPago || 0));
    if (base <= 0) {
      toast({ title: "Nada a parcelar", description: "O total a pagar já está quitado.", variant: "destructive" });
      return;
    }
    const valorParcela = Math.floor((base / qtd) * 100) / 100;
    const resto = Math.round((base - valorParcela * qtd) * 100) / 100;

    let d0 = gerarParcelasPrimeiroVcto ? new Date(gerarParcelasPrimeiroVcto) : new Date();
    const novos: Pagamento[] = [];
    let nextNum =
      (editPagamentos.filter((p) => !p._ui_deleted).reduce((m, p) => Math.max(m, p.parcela_numero || 0), 0) || 0) + 1;

    for (let i = 0; i < qtd; i++) {
      const val = i === 0 ? valorParcela + resto : valorParcela;
      const due = new Date(d0);
      if (i > 0) due.setMonth(due.getMonth() + i);
      const dueStr = due.toISOString().slice(0, 10);
      novos.push({
        consignado_id: editNota.id,
        parcela_numero: nextNum++,
        due_date: dueStr,
        valor: Math.max(0, Math.round(val * 100) / 100),
        valor_pago: 0,
        pago: false,
        pago_em: null,
        obs: "",
        _ui_new: true,
      });
    }
    setEditPagamentos((prev) => [...prev, ...novos]);
  };

  const excluirParcela = (p: Pagamento) => {
    if (p.id) {
      setEditPagamentos((prev) => prev.map((x) => (x.id === p.id ? { ...x, _ui_deleted: true } : x)));
    } else {
      setEditPagamentos((prev) => prev.filter((x) => x !== p));
    }
  };

  /** ------------------- Render ------------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Consignado
          </h1>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setNovaVendedoraId("");
              setVencimento("");
              setObservacoes("");
              setItensNota([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }] as any);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Nota
            </Button>
          </DialogTrigger>

          {/* MODAL DE CRIAÇÃO */}
          <DialogContent className="w-[95vw] max-w-[1200px] max-h-[92vh] overflow-hidden">
            <div className="p-6 space-y-6 overflow-y-auto">
              <DialogHeader className="space-y-1">
                <DialogTitle>Nova Nota de Consignado</DialogTitle>
                <DialogDescription>Crie uma nova nota de consignado para vendedora.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Vendedora</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={novaVendedoraId}
                      onChange={(e) => setNovaVendedoraId(e.target.value)}
                    >
                      <option value="">Selecione uma vendedora</option>
                      {cards.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Origem do Estoque</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value as "loja" | "fabrica")}
                    >
                      <option value="fabrica">Fábrica</option>
                      <option value="loja">Loja</option>
                    </select>
                  </div>

                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  </div>
                </div>

                {/* Itens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Itens da Nota</h3>
                    <Button variant="outline" size="sm" onClick={adicionarItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {(itensNota as any as ItemForm[]).map((item) => {
                    const tams = item.referencia ? tamanhosDisponiveis(item.referencia) : [];
                    const cores = item.referencia ? coresDisponiveis(item.referencia, item.tamanho) : [];

                    return (
                      <Card key={item.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                          <div>
                            <Label>Referência</Label>
                            <select
                              className="w-full p-2 border rounded"
                              value={item.referencia || ""}
                              onChange={(e) => {
                                const ref = e.target.value;
                                const primeiro = produtos.find((p) => p.referencia === ref);
                                setItensNota((prev: any) =>
                                  (prev as ItemForm[]).map((it) =>
                                    it.id === item.id
                                      ? {
                                          ...it,
                                          referencia: ref,
                                          tamanho: "",
                                          cor: "",
                                          valor: Number(primeiro?.preco_venda ?? 0),
                                        }
                                      : it
                                  )
                                );
                              }}
                            >
                              <option value="">{carregandoProdutos ? "Carregando..." : "Selecione produto..."}</option>
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
                              value={item.tamanho || ""}
                              onChange={(e) =>
                                setItensNota((prev: any) =>
                                  (prev as ItemForm[]).map((it) => (it.id === item.id ? { ...it, tamanho: e.target.value, cor: "" } : it))
                                )
                              }
                            >
                              <option value="">Selecione tamanho...</option>
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
                              value={item.cor || ""}
                              onChange={(e) =>
                                setItensNota((prev: any) =>
                                  (prev as ItemForm[]).map((it) => (it.id === item.id ? { ...it, cor: e.target.value } : it))
                                )
                              }
                            >
                              <option value="">Selecione cor...</option>
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
                                setItensNota((prev: any) =>
                                  (prev as ItemForm[]).map((it) =>
                                    it.id === item.id ? { ...it, quantidade: Number(e.target.value || 1) } : it
                                  )
                                )
                              }
                              className="text-right"
                            />
                          </div>

                          <div>
                            <Label>Valor Unit.</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valor}
                              onChange={(e) =>
                                setItensNota((prev: any) =>
                                  (prev as ItemForm[]).map((it) => (it.id === item.id ? { ...it, valor: Number(e.target.value || 0) } : it))
                                )
                              }
                              className="text-right"
                            />
                          </div>

                          <div className="flex md:justify-end">
                            <Button variant="ghost" size="icon" onClick={() => removerItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações da nota..." />
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total da Nota</p>
                      <p className="text-2xl font-bold">{brl(totalNovaNota)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={finalizarNota} className="bg-gradient-to-r from-purple to-pink text-white">
                  Criar Nota
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs do consignado */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple" />
              <div>
                <p className="text-sm text-muted-foreground">Itens fora (em consignado)</p>
                <p className="text-2xl font-bold">{Number(kpis.total_fora || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-pink" />
              <div>
                <p className="text-sm text-muted-foreground">Produto com mais itens fora</p>
                <p className="text-base font-semibold">{kpis.top_fora_nome || kpis.top_fora_referencia || "-"}</p>
                <p className="text-sm text-muted-foreground">{kpis.top_fora_qtd ? `${kpis.top_fora_qtd} un.` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Produto que mais volta</p>
                <p className="text-base font-semibold">{kpis.top_devolve_nome || kpis.top_devolve_referencia || "-"}</p>
                <p className="text-sm text-muted-foreground">{kpis.top_devolve_qtd ? `${kpis.top_devolve_qtd} un.` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple" />
              <div>
                <p className="text-sm text-muted-foreground">R$ em consignado (não vendidos)</p>
                <p className="text-2xl font-bold">{brl(valorForaAtual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-pink" />
              <div>
                <p className="text-sm text-muted-foreground">R$ vendidos (atuais)</p>
                <p className="text-2xl font-bold">{brl(valorVendidoAtual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Atuais / Arquivadas */}
      <div className="flex items-center gap-2">
        <Button variant={aba === "atuais" ? "default" : "outline"} onClick={() => setAba("atuais")}>
          Atuais <span className="ml-2 text-xs opacity-80">{countAtuais}</span>
        </Button>
        <Button variant={aba === "arquivadas" ? "default" : "outline"} onClick={() => setAba("arquivadas")}>
          Arquivadas <span className="ml-2 text-xs opacity-80">{countArquivadas}</span>
        </Button>
        {!selectedVendedora && (
          <div className="ml-auto relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input className="pl-10" placeholder="Buscar notas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {/* Header vendedora selecionada */}
      {selectedVendedora && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Notas de {cards.find((v) => v.id === selectedVendedora)?.nome}</h2>
            <p className="text-muted-foreground">{filteredNotas.length} nota(s) encontrada(s)</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedVendedora(null)}>
            Ver Todas as Notas
          </Button>
        </div>
      )}

      {/* Tabela de Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple" />
            {aba === "arquivadas" ? "Notas Arquivadas" : "Notas de Consignado"}
          </CardTitle>
          <CardDescription>{filteredNotas.length} nota(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Número</TableHead>
                <TableHead className="w-56">Vendedora</TableHead>
                <TableHead className="w-32">Emissão</TableHead>
                <TableHead className="w-36">Vencimento</TableHead>
                <TableHead className="w-36 text-right">Valor Total</TableHead>
                <TableHead className="w-36 text-right">Devolvido</TableHead>
                <TableHead className="w-36 text-right">Vendido</TableHead>
                <TableHead className="w-36 text-right">Pago</TableHead>
                <TableHead className="w-36 text-right">Saldo</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28 text-center">Itens</TableHead>
                <TableHead className="w-40 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.numero}</TableCell>
                  <TableCell>{n.vendedora_nome ?? "-"}</TableCell>
                  <TableCell>{n.data_emissao}</TableCell>
                  <TableCell>
                    <Badge variant={n.vencimento && new Date(n.vencimento) < new Date() ? "destructive" : "outline"}>
                      {n.vencimento ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{brl(n.valor_total)}</TableCell>
                  <TableCell className="text-right">{brl(n.valor_devolvido)}</TableCell>
                  <TableCell className="text-right">{brl(n.valor_vendido)}</TableCell>
                  <TableCell className="text-right">{brl(n.valor_pago)}</TableCell>
                  <TableCell className="text-right">{brl(n.saldo)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge(n.status)}>
                      {n.status === "aberta" ? "Aberta" : n.status === "fechada" ? "Fechada" : "Cancelada"}
                    </Badge>
                  </TableCell>

                  {/* Itens */}
                  <TableCell className="text-center">
                    <span className="text-sm">
                      {n.itens_total} / {n.itens_devolvidos} dev.
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(n)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Imprimir" onClick={() => imprimirNota(n)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={n.archived ? "Desarquivar" : "Arquivar"}
                        onClick={() => toggleArquivar(n)}
                      >
                        {n.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      {n.archived && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Apagar definitivamente"
                          onClick={() => deletarNota(n)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog Editar Nota */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditNota(null);
            setEditItens([]);
            setEditPagamentos([]);
          }
        }}
      >
        <DialogContent className="w-[96vw] max-w-[1200px] max-h-[92vh] overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto">
            <DialogHeader className="space-y-1">
              <DialogTitle>Editar Nota de Consignado {editNota ? `- ${editNota.numero}` : ""}</DialogTitle>
              <DialogDescription>Atualize vencimento, status, devoluções e pagamentos.</DialogDescription>
            </DialogHeader>

            {editNota && (
              <div className="grid gap-6">
                {/* Cabeçalho */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Número</Label>
                    <Input value={editNota.numero} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Vencimento</Label>
                    <Input type="date" value={editNota.vencimento ?? ""} onChange={(e) => setEditNota({ ...editNota, vencimento: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={editNota.status}
                      onChange={(e) => setEditNota({ ...editNota, status: e.target.value as ConsignadoResumo["status"] })}
                    >
                      <option value="aberta">Aberta</option>
                      <option value="fechada">Fechada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Resumo valores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total original</p>
                    <p className="text-lg font-semibold">{brl(resumoEdicao.totalOriginal)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total devolvido</p>
                    <p className="text-lg font-semibold text-destructive">{brl(resumoEdicao.totalDevolvido)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total a pagar (após devoluções)</p>
                    <p className="text-lg font-semibold">{brl(resumoEdicao.totalAtual)}</p>
                  </div>
                </div>

                {/* Itens / Devoluções */}
                <div className="space-y-2">
                  <Label>Itens / Devoluções</Label>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28">Ref.</TableHead>
                          <TableHead className="w-40">Cor/Tam</TableHead>
                          <TableHead className="w-20">Qtd</TableHead>
                          <TableHead className="w-28">Devolvida</TableHead>
                          <TableHead className="w-40">Setar Devolvida</TableHead>
                          <TableHead className="w-32 text-right">Vlr Unit</TableHead>
                          <TableHead className="w-32 text-right">Total do Item</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editItens.map((it) => {
                          const totalItem = (it.quantidade - it.quantidade_devolvida) * Number(it.valor_unitario || 0);
                          return (
                            <TableRow key={it.id}>
                              <TableCell>{it.referencia}</TableCell>
                              <TableCell>
                                {it.cor} / {it.tamanho}
                              </TableCell>
                              <TableCell>{it.quantidade}</TableCell>
                              <TableCell>{it.quantidade_devolvida}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={it.quantidade}
                                  value={it.quantidade_devolvida}
                                  onChange={(e) => {
                                    const v = Math.max(0, Math.min(it.quantidade, Number(e.target.value || 0)));
                                    setEditItens((prev) => prev.map((x) => (x.id === it.id ? { ...x, quantidade_devolvida: v } : x)));
                                  }}
                                  className="w-32 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">{brl(it.valor_unitario)}</TableCell>
                              <TableCell className="text-right">{brl(totalItem)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagamentos / Parcelas */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Label className="text-base">Pagamentos / Parcelas</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <Input type="number" min={1} value={gerarParcelasQtd} onChange={(e) => setGerarParcelasQtd(Number(e.target.value || 1))} className="w-28" placeholder="Qtd" />
                      <Input type="date" value={gerarParcelasPrimeiroVcto} onChange={(e) => setGerarParcelasPrimeiroVcto(e.target.value)} className="w-44" placeholder="1º venc." />
                      <Button variant="outline" onClick={gerarParcelasIguais} className="justify-center">
                        Gerar parcelas iguais
                      </Button>
                      <Button variant="outline" onClick={addParcelaManual} className="justify-center">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar parcela
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Total parcelado</p>
                      <p className="text-lg font-semibold">{brl(resumoPagamentos.totalParcelado)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Total pago</p>
                      <p className="text-lg font-semibold text-green-700">{brl(resumoPagamentos.totalPago)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Saldo pendente</p>
                      <p className="text-lg font-semibold">{brl(resumoPagamentos.saldo)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="min-w-[1150px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">#</TableHead>
                          <TableHead className="w-40">Vencimento</TableHead>
                          <TableHead className="w-32 text-right">Valor</TableHead>
                          <TableHead className="w-20">Pago?</TableHead>
                          <TableHead className="w-60">Pago em</TableHead>
                          <TableHead className="w-36 text-right">Valor pago</TableHead>
                          <TableHead className="w-[280px]">Obs</TableHead>
                          <TableHead className="w-48 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editPagamentos.filter((p) => !p._ui_deleted).map((p, idx) => (
                          <TableRow key={p.id ?? `new-${idx}`}>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={p.parcela_numero}
                                onChange={(e) => {
                                  const v = Math.max(1, Number(e.target.value || 1));
                                  setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, parcela_numero: v } : x)));
                                }}
                                className="w-20 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={p.due_date ?? ""}
                                onChange={(e) => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, due_date: e.target.value } : x)))}
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={p.valor}
                                onChange={(e) => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, valor: Number(e.target.value || 0) } : x)))}
                                className="w-32 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={p.pago}
                                onChange={() =>
                                  setEditPagamentos((prev) =>
                                    prev.map((x) =>
                                      x === p
                                        ? {
                                            ...x,
                                            pago: !x.pago,
                                            valor_pago: !x.pago ? (x.valor_pago > 0 ? x.valor_pago : x.valor) : 0,
                                            pago_em: !x.pago ? (x.pago_em || new Date().toISOString()) : null,
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="datetime-local"
                                value={p.pago_em ? p.pago_em.slice(0, 16) : ""}
                                onChange={(e) => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, pago_em: e.target.value } : x)))}
                                disabled={!p.pago}
                                className="w-60"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={p.valor_pago}
                                onChange={(e) => {
                                  const v = Math.max(0, Number(e.target.value || 0));
                                  setEditPagamentos((prev) =>
                                    prev.map((x) => (x === p ? { ...x, valor_pago: v, pago: v > 0 ? (v >= x.valor ? true : x.pago) : false } : x))
                                  );
                                }}
                                disabled={!p.pago}
                                className="w-36 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input value={p.obs ?? ""} onChange={(e) => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, obs: e.target.value } : x)))} className="w-[280px]" />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, pago: true, valor_pago: x.valor, pago_em: x.pago_em || new Date().toISOString() } : x)))}
                                >
                                  Quitar
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditPagamentos((prev) => prev.map((x) => (x === p ? { ...x, pago: false, valor_pago: 0, pago_em: null } : x)))} >
                                  Estornar
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => excluirParcela(p)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {editPagamentos.filter((p) => !p._ui_deleted).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                              Nenhuma parcela/pagamento registrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Ações finais */}
                <div className="flex justify-end gap-2">
                  {editNota && (
                    <Button variant="outline" onClick={() => toggleArquivar(editNota)} title={editNota.archived ? "Desarquivar" : "Arquivar"}>
                      {editNota.archived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                      {editNota.archived ? "Desarquivar" : "Arquivar"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={salvarEdicao} className="bg-gradient-to-r from-purple to-pink text-white">
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consignado;
