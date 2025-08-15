import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ShoppingCart, MessageCircle, Trash2, Package, Edit, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/** Produto vindo da view vw_produtos_resumo */
type ProdutoVendavel = {
  produto_id: string;
  referencia: string | null;
  nome: string | null;
  cor: string | null;
  tamanho: string | null;
  preco_venda: number | null;
  estoque_loja: number;
  estoque_fabrica: number;
};

type ItemVenda = {
  id: number; // id local do formulário
  referencia: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  valor: number; // unitário
};

type ClienteRow = {
  id: string;
  nome: string;
  whatsapp: string | null;
};

type VendaRow = {
  id: string;
  numero: string;
  cliente_id: string | null;
  data: string; // yyyy-mm-dd
  origem?: "loja" | "fabrica";
  valor_total: number;
  desconto: number;
  valor_final: number;
  pagamento: string;
  status: string;
  clientes?: { nome: string; whatsapp: string | null } | null;
  venda_itens?: {
    id: string;
    produto_id: string | null;
    referencia: string | null;
    tamanho: string | null;
    cor: string | null;
    quantidade: number | null;
    valor_unitario: number | null;
  }[];
};

const Vendas = () => {
  const { toast } = useToast();

  // filtros/estado da tela
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [origem, setOrigem] = useState<"loja" | "fabrica">("loja");

  // modo edição
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [vendaOriginal, setVendaOriginal] = useState<{
    origem: "loja" | "fabrica";
    itens: Required<VendaRow>["venda_itens"];
  } | null>(null);
  const [showAllForEdit, setShowAllForEdit] = useState(false);

  // dados
  const [produtos, setProdutos] = useState<ProdutoVendavel[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);

  // venda atual (form)
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([
    { id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 },
  ]);
  const [clienteId, setClienteId] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("PIX");
  const [desconto, setDesconto] = useState<number>(0);

  // lista de vendas
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [carregandoVendas, setCarregandoVendas] = useState(false);

  const formatBR = (n: number) =>
    Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

  /** ---------- Carregar clientes ---------- */
  const carregarClientes = async () => {
    try {
      setCarregandoClientes(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, whatsapp")
        .order("nome", { ascending: true });
      if (error) throw error;
      setClientes((data ?? []) as ClienteRow[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao carregar clientes", description: e?.message, variant: "destructive" });
    } finally {
      setCarregandoClientes(false);
    }
  };

  /** ---------- Produtos (view) ---------- */
  const carregarProdutos = async (forceAll = false) => {
    setCarregandoProdutos(true);
    let q = supabase.from("vw_produtos_resumo").select("*");
    if (!(forceAll || showAllForEdit)) {
      q = origem === "loja" ? q.gt("estoque_loja", 0) : q.gt("estoque_fabrica", 0);
    }
    const { data, error } = await q.order("referencia", { ascending: true });
    if (error) {
      console.error(error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
      setProdutos([]);
    } else {
      setProdutos((data ?? []) as ProdutoVendavel[]);
    }
    setCarregandoProdutos(false);
  };

  useEffect(() => {
    carregarProdutos(showAllForEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem, showAllForEdit]);

  /** ---------- Vendas (lista) ---------- */
  const carregarVendas = async () => {
    setCarregandoVendas(true);
    const { data, error } = await supabase
      .from("vendas")
      .select(`
        id, numero, cliente_id, data, origem, valor_total, desconto, valor_final, pagamento, status,
        clientes:cliente_id ( nome, whatsapp ),
        venda_itens ( id, produto_id, referencia, tamanho, cor, quantidade, valor_unitario )
      `)
      .order("data", { ascending: false })
      .order("numero", { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: "Erro ao carregar vendas",
        description: error.message,
        variant: "destructive",
      });
      setVendas([]);
    } else {
      setVendas((data ?? []) as unknown as VendaRow[]);
    }
    setCarregandoVendas(false);
  };

  useEffect(() => {
    carregarVendas();
    carregarClientes();
  }, []);

  /** listas derivadas */
  const referencias = useMemo(
    () =>
      Array.from(
        new Set(
          produtos
            .map((p) => p.referencia || "")
            .filter((r): r is string => Boolean(r))
        )
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

  /** helpers */
  const calcularTotal = () =>
    itensVenda.reduce((total, item) => total + item.quantidade * item.valor, 0);

  const proximoNumero = async (): Promise<string> => {
    const { data, error } = await supabase
      .from("vendas")
      .select("numero")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return "V001";
    const ultimo = data[0].numero || "V000";
    const n = parseInt(ultimo.replace(/\D/g, "") || "0", 10) + 1;
    return "V" + String(n).padStart(3, "0");
  };

  const getNomeProduto = (ref: string, tam: string, cor: string) => {
    const p = produtos.find(
      (pr) => pr.referencia === ref && pr.tamanho === tam && pr.cor === cor
    );
    return (p?.nome as string) || "Produto";
  };

  /** WhatsApp — para VOCÊ/LOJA (mantido) */
  const enviarWhatsAppLoja = (venda: VendaRow) => {
    const itens = (venda.venda_itens ?? []).map((i) => {
      const nome = getNomeProduto(i.referencia || "", i.tamanho || "", i.cor || "");
      const qtd = Number(i.quantidade || 0);
      const unit = Number(i.valor_unitario || 0);
      const sub = qtd * unit;
      return { ref: i.referencia || "", nome, cor: i.cor || "", tam: i.tamanho || "", qtd, unit, sub };
    });

    const total = Number(venda.valor_total || itens.reduce((s, x) => s + x.sub, 0));
    const descPerc = Number(venda.desconto || 0);
    const descVal = total * (descPerc / 100);
    const totalFinal = Number(venda.valor_final || (total - descVal));

    const itensTxt = itens
      .map(
        (i) =>
          `- ${i.nome} (ref ${i.ref}) — Tam: ${i.tam} | Cor: ${i.cor}\n` +
          `  Qtd: ${i.qtd} x R$ ${formatBR(i.unit)} = R$ ${formatBR(i.sub)}`
      )
      .join("\n");

    const header =
      `*VENDA ${venda.numero}*\n` +
      `Cliente: ${venda.clientes?.nome ?? "-"}\n` +
      `Data: ${venda.data}\n` +
      (venda.origem ? `Origem: ${venda.origem === "fabrica" ? "Fábrica" : "Loja"}\n` : "");

    const totaisTxt =
      `\n*Total dos produtos:* R$ ${formatBR(total)}\n` +
      `*Desconto:* ${formatBR(descPerc)}%${descPerc ? ` (− R$ ${formatBR(descVal)})` : ""}\n` +
      `*Valor final:* R$ ${formatBR(totalFinal)}\n` +
      `*Pagamento:* ${venda.pagamento}`;

    const mensagem = `${header}\n*Itens*\n${itensTxt}${totaisTxt}`;
    const url = `https://wa.me/5548988092521?text=${encodeURIComponent(mensagem)}`; // seu número
    window.open(url, "_blank");
  };

  /** --------- estoque helpers --------- */
  const ajustarEstoque = async (
    produto_id: string,
    tamanho: string,
    cor: string,
    origemEstoque: "loja" | "fabrica",
    delta: number
  ) => {
    const { data: row, error: selErr } = await supabase
      .from("estoque")
      .select("id, estoque_loja, estoque_fabrica")
      .eq("produto_id", produto_id)
      .eq("tamanho", tamanho)
      .eq("cor", cor)
      .single();

    if (selErr || !row) return;

    const update: any = {};
    if (origemEstoque === "loja") {
      update.estoque_loja = Math.max(0, (row.estoque_loja ?? 0) + delta);
    } else {
      update.estoque_fabrica = Math.max(0, (row.estoque_fabrica ?? 0) + delta);
    }

    await supabase.from("estoque").update(update).eq("id", row.id);
  };

  /** ---------- criar venda ---------- */
  const finalizarVenda = async () => {
    try {
      if (!clienteId) {
        toast({ title: "Selecione um cliente", variant: "destructive" });
        return;
      }
      for (const it of itensVenda) {
        if (!it.referencia || !it.tamanho || !it.cor) {
          toast({
            title: "Preencha referência, tamanho e cor de todos os itens",
            variant: "destructive",
          });
          return;
        }
      }

      const total = calcularTotal();
      const desc = Number.isFinite(desconto) ? Number(desconto) : 0;
      const valorFinal = total * (1 - desc / 100);

      const numeroGerado = await proximoNumero();
      const { data: vendaIns, error: vendaErr } = await supabase
        .from("vendas")
        .insert({
          numero: numeroGerado,
          cliente_id: clienteId,
          data: new Date().toISOString().split("T")[0],
          origem,
          valor_total: total,
          desconto: desc,
          valor_final: valorFinal,
          pagamento: formaPagamento,
          status: "Finalizada",
        })
        .select("id, numero")
        .single();

      if (vendaErr) throw vendaErr;
      const vendaId = vendaIns!.id as string;

      for (const i of itensVenda) {
        const p = findProdutoVar(i.referencia, i.tamanho, i.cor);
        const produtoId = p?.produto_id ?? null;

        const { error: itemErr } = await supabase.from("venda_itens").insert({
          venda_id: vendaId,
          produto_id: produtoId,
          referencia: i.referencia,
          tamanho: i.tamanho,
          cor: i.cor,
          quantidade: i.quantidade,
          valor_unitario: i.valor,
        });
        if (itemErr) throw itemErr;

        if (produtoId) {
          await ajustarEstoque(produtoId, i.tamanho, i.cor, origem, -i.quantidade);
        }
      }

      toast({ title: "Venda finalizada!", description: `Número: ${vendaIns.numero}` });
      setIsDialogOpen(false);
      setShowAllForEdit(false);
      setItensVenda([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]);
      setClienteId("");
      setFormaPagamento("PIX");
      setDesconto(0);

      await carregarProdutos(false);
      await carregarVendas();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao salvar venda",
        description: e?.message ?? "Falha ao finalizar venda.",
        variant: "destructive",
      });
    }
  };

  /** ---------- abrir modal para editar ---------- */
  const abrirEdicao = async (vendaId: string) => {
    try {
      setShowAllForEdit(true);
      await carregarProdutos(true);

      const { data, error } = await supabase
        .from("vendas")
        .select(`
          id, numero, cliente_id, data, origem, desconto, valor_total, valor_final, pagamento, status,
          clientes:cliente_id ( nome, whatsapp ),
          venda_itens ( id, produto_id, referencia, tamanho, cor, quantidade, valor_unitario )
        `)
        .eq("id", vendaId)
        .single();

      if (error) throw error;

      setEditingVendaId(vendaId);
      setClienteId(data!.cliente_id || "");
      setOrigem((data!.origem as "loja" | "fabrica") || "loja");
      setFormaPagamento(data!.pagamento || "PIX");
      setDesconto(Number(data!.desconto || 0));

      const itensForm: ItemVenda[] =
        (data!.venda_itens || []).map((it, idx) => ({
          id: Date.now() + idx,
          referencia: it.referencia || "",
          tamanho: it.tamanho || "",
          cor: it.cor || "",
          quantidade: Number(it.quantidade || 1),
          valor: Number(it.valor_unitario || 0),
        })) || [];

      setItensVenda(
        itensForm.length
          ? itensForm
          : [{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]
      );

      setVendaOriginal({
        origem: (data!.origem as "loja" | "fabrica") || "loja",
        itens: data!.venda_itens || [],
      });

      setIsDialogOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao abrir edição",
        description: e?.message ?? "Não foi possível carregar a venda.",
        variant: "destructive",
      });
    }
  };

  /** ---------- salvar alterações (edição) ---------- */
  const salvarEdicao = async () => {
    if (!editingVendaId) return;

    try {
      if (!clienteId) {
        toast({ title: "Selecione um cliente", variant: "destructive" });
        return;
      }
      for (const it of itensVenda) {
        if (!it.referencia || !it.tamanho || !it.cor) {
          toast({
            title: "Preencha referência, tamanho e cor de todos os itens",
            variant: "destructive",
          });
          return;
        }
      }

      const total = calcularTotal();
      const desc = Number.isFinite(desconto) ? Number(desconto) : 0;
      const valorFinal = total * (1 - desc / 100);

      // 1) devolve estoque dos itens antigos
      if (vendaOriginal) {
        for (const it of vendaOriginal.itens || []) {
          if (it.produto_id && it.tamanho && it.cor && it.quantidade) {
            await ajustarEstoque(
              it.produto_id,
              it.tamanho,
              it.cor,
              vendaOriginal.origem,
              +it.quantidade
            );
          }
        }
      }

      // 2) update cabeçalho
      const { error: upErr } = await supabase
        .from("vendas")
        .update({
          cliente_id: clienteId,
          origem,
          valor_total: total,
          desconto: desc,
          valor_final: valorFinal,
          pagamento: formaPagamento,
          status: "Finalizada",
        })
        .eq("id", editingVendaId);

      if (upErr) throw upErr;

      // 3) substituir itens
      await supabase.from("venda_itens").delete().eq("venda_id", editingVendaId);

      for (const i of itensVenda) {
        const p = findProdutoVar(i.referencia, i.tamanho, i.cor);
        const produtoId = p?.produto_id ?? null;

        const { error: itemErr } = await supabase.from("venda_itens").insert({
          venda_id: editingVendaId,
          produto_id: produtoId,
          referencia: i.referencia,
          tamanho: i.tamanho,
          cor: i.cor,
          quantidade: i.quantidade,
          valor_unitario: i.valor,
        });
        if (itemErr) throw itemErr;

        if (produtoId) {
          await ajustarEstoque(produtoId, i.tamanho, i.cor, origem, -i.quantidade);
        }
      }

      toast({ title: "Venda atualizada!", description: "Alterações salvas com sucesso." });
      setIsDialogOpen(false);
      setEditingVendaId(null);
      setVendaOriginal(null);
      setShowAllForEdit(false);

      setItensVenda([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]);
      setClienteId("");
      setFormaPagamento("PIX");
      setDesconto(0);

      await carregarProdutos(false);
      await carregarVendas();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao atualizar venda",
        description: e?.message ?? "Falha ao salvar alterações.",
        variant: "destructive",
      });
    }
  };

  /** ---------- excluir venda ---------- */
  const excluirVenda = async (vendaId: string) => {
    try {
      const { data, error } = await supabase
        .from("vendas")
        .select("origem, venda_itens ( id, produto_id, tamanho, cor, quantidade )")
        .eq("id", vendaId)
        .single();

      if (error) throw error;

      const origemVenda = (data!.origem as "loja" | "fabrica") || "loja";
      for (const it of data!.venda_itens || []) {
        if (it.produto_id && it.tamanho && it.cor && it.quantidade) {
          await ajustarEstoque(it.produto_id, it.tamanho, it.cor, origemVenda, +it.quantidade);
        }
      }

      await supabase.from("venda_itens").delete().eq("venda_id", vendaId);
      const { error: delErr } = await supabase.from("vendas").delete().eq("id", vendaId);
      if (delErr) throw delErr;

      toast({ title: "Venda excluída!", description: "Estoque restaurado." });
      await carregarProdutos(false);
      await carregarVendas();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao excluir venda",
        description: e?.message ?? "Falha ao excluir venda.",
        variant: "destructive",
      });
    }
  };

  /** ---------- IMPRIMIR PDF p/ CLIENTE ---------- */
  const imprimirVendaCliente = (venda: VendaRow) => {
    const itens = (venda.venda_itens ?? []).map((i, idx) => {
      const nome = getNomeProduto(i.referencia || "", i.tamanho || "", i.cor || "");
      const qtd = Number(i.quantidade || 0);
      const unit = Number(i.valor_unitario || 0);
      const sub = qtd * unit;
      return { idx: idx + 1, ref: i.referencia || "", nome, cor: i.cor || "", tam: i.tamanho || "", qtd, unit, sub };
    });

    const total = Number(venda.valor_total || itens.reduce((s, x) => s + x.sub, 0));
    const descPerc = Number(venda.desconto || 0);
    const descVal = Math.round(total * (descPerc / 100) * 100) / 100;
    const totalFinal = Number(venda.valor_final || (total - descVal));

    const linhas = itens.map(i => `
      <tr>
        <td class="c">${i.idx}</td>
        <td class="c">${i.ref}</td>
        <td>${i.nome}</td>
        <td class="c">${i.cor}</td>
        <td class="c">${i.tam}</td>
        <td class="n">${i.qtd}</td>
        <td class="n">R$ ${formatBR(i.unit)}</td>
        <td class="n">R$ ${formatBR(i.sub)}</td>
      </tr>
    `).join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Comprovante ${venda.numero}</title>
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
  th.col-idx { width: 6mm; }
  th.col-ref { width: 20mm; }
  th.col-cor { width: 16mm; }
  th.col-tam { width: 12mm; }
  th.col-qtd { width: 12mm; }
  th.col-unit{ width: 20mm; }
  th.col-sub { width: 24mm; }
  tr { page-break-inside: avoid; }
  .totais { display:flex; gap:6mm; justify-content:flex-end; margin-top: 6mm; }
  .box { border:1px solid #e5e7eb; padding: 4mm; min-width: 46mm; }
  .label { font-size: 10px; color:#666; }
  .value { font-size: 12px; font-weight: 700; }
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
        <div class="title">Comprovante de Compra</div>
        <div class="meta">Venda: <b>${venda.numero}</b></div>
        <div class="meta">Data: <b>${venda.data}</b> • Pagamento: <b>${venda.pagamento}</b></div>
        <div class="meta">Origem do estoque: <b>${venda.origem === "fabrica" ? "Fábrica" : "Loja"}</b></div>
      </div>
    </div>

    <div class="meta mt6"><b>Cliente:</b> ${venda.clientes?.nome ?? "-"}</div>

    <table class="mt8">
      <thead>
        <tr>
          <th class="col-idx c">#</th>
          <th class="col-ref">Ref.</th>
          <th>Produto</th>
          <th class="col-cor c">Cor</th>
          <th class="col-tam c">Tam.</th>
          <th class="col-qtd n">Qtd</th>
          <th class="col-unit n">Valor Unit.</th>
          <th class="col-sub n">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${linhas || `<tr><td colspan="8" class="c" style="color:#666">Sem itens</td></tr>`}
      </tbody>
    </table>

    <div class="totais">
      <div class="box">
        <div class="label">Total dos produtos</div>
        <div class="value">R$ ${formatBR(total)}</div>
      </div>
      <div class="box">
        <div class="label">Desconto</div>
        <div class="value">${formatBR(descPerc)}% ${descPerc ? `(− R$ ${formatBR(descVal)})` : ""}</div>
      </div>
      <div class="box">
        <div class="label">Valor final</div>
        <div class="value">R$ ${formatBR(totalFinal)}</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { try { window.print(); } catch(e){} };</script>
</body>
</html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast({ title: "Pop-up bloqueado", description: "Permita pop-ups para imprimir o comprovante." });
      return;
    }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
  };

  /** ---------- WHATSAPP p/ CLIENTE ---------- */
  const enviarWhatsCliente = async (venda: VendaRow) => {
    try {
      const fone = onlyDigits(venda.clientes?.whatsapp || "");
      if (!fone) {
        toast({
          title: "WhatsApp do cliente não cadastrado",
          description: "Edite o cliente em 'Clientes' e informe o WhatsApp.",
          variant: "destructive",
        });
        return;
      }

      const itens = (venda.venda_itens ?? []).map((i) => {
        const nome = getNomeProduto(i.referencia || "", i.tamanho || "", i.cor || "");
        const qtd = Number(i.quantidade || 0);
        const unit = Number(i.valor_unitario || 0);
        const sub = qtd * unit;
        return { ref: i.referencia || "", nome, cor: i.cor || "", tam: i.tamanho || "", qtd, unit, sub };
      });

      const total = Number(venda.valor_total || itens.reduce((s, x) => s + x.sub, 0));
      const descPerc = Number(venda.desconto || 0);
      const descVal = Math.round(total * (descPerc / 100) * 100) / 100;
      const totalFinal = Number(venda.valor_final || (total - descVal));

      const itensTxt = itens.map(i =>
        `• ${i.ref} - ${i.nome}\n  Cor: ${i.cor} | Tam: ${i.tam}\n  Qtd: ${i.qtd} | Unit: R$ ${formatBR(i.unit)} | Subt: R$ ${formatBR(i.sub)}`
      ).join("\n\n");

      const msg =
        `Olá *${venda.clientes?.nome ?? "cliente"}* 👋\n` +
        `Segue o comprovante da sua compra *${venda.numero}* (${venda.data}).\n\n` +
        `${itensTxt}\n\n` +
        `*Total dos produtos:* R$ ${formatBR(total)}\n` +
        `*Desconto:* ${formatBR(descPerc)}%${descPerc ? ` (− R$ ${formatBR(descVal)})` : ""}\n` +
        `*Valor final:* R$ ${formatBR(totalFinal)}\n` +
        `*Pagamento:* ${venda.pagamento}\n\n` +
        `Qualquer coisa, estou à disposição! 💜`;

      const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao preparar WhatsApp", description: e?.message, variant: "destructive" });
    }
  };

  /** ---------- Render ---------- */
  const filteredVendas = vendas.filter((v) => {
    const nome = v.clientes?.nome?.toLowerCase() ?? "";
    const st = searchTerm.toLowerCase();
    return v.numero.toLowerCase().includes(st) || nome.includes(st);
  });

  const isEditing = Boolean(editingVendaId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Vendas
          </h1>
          <p className="text-muted-foreground">Gerencie suas vendas e notas fiscais</p>
        </div>

        <div className="flex gap-2">
          <Select value={origem} onValueChange={(v: "loja" | "fabrica") => setOrigem(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem do Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loja">Estoque Loja</SelectItem>
              <SelectItem value="fabrica">Estoque Fábrica</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => carregarProdutos(showAllForEdit)} disabled={carregandoProdutos}>
            <Package className="mr-2 h-4 w-4" />
            {carregandoProdutos ? "Atualizando..." : "Atualizar Estoque"}
          </Button>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingVendaId(null);
                setVendaOriginal(null);
                setShowAllForEdit(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90"
                onClick={() => {
                  setEditingVendaId(null);
                  setVendaOriginal(null);
                  setShowAllForEdit(false);
                  setClienteId("");
                  setFormaPagamento("PIX");
                  setDesconto(0);
                  setItensVenda([{ id: 1, referencia: "", tamanho: "", cor: "", quantidade: 1, valor: 0 }]);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Editar Venda" : "Nova Venda"}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Altere as informações da venda. O estoque será ajustado conforme as mudanças."
                    : "Crie uma nova nota de venda com os produtos selecionados."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger>
                        <SelectValue placeholder={carregandoClientes ? "Carregando..." : "Selecione um cliente"} />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estoque de Origem</Label>
                    <Select value={origem} onValueChange={(v: "loja" | "fabrica") => setOrigem(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fábrica ou Loja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fabrica">Fábrica</SelectItem>
                        <SelectItem value="loja">Loja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Itens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Itens da Venda</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setItensVenda((prev) => [
                          ...prev,
                          {
                            id: Date.now(),
                            referencia: "",
                            tamanho: "",
                            cor: "",
                            quantidade: 1,
                            valor: 0,
                          },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {itensVenda.map((item, index) => {
                    const tams = item.referencia ? tamanhosDisponiveis(item.referencia) : [];
                    const cores = item.referencia ? coresDisponiveis(item.referencia, item.tamanho) : [];

                    return (
                      <Card key={item.id} className="p-4">
                        <div className="grid grid-cols-6 gap-4 items-end">
                          <div>
                            <Label>Referência</Label>
                            <Select
                              value={item.referencia || undefined}
                              onValueChange={(ref) => {
                                const first = produtos.find((p) => p.referencia === ref);
                                setItensVenda((prev) =>
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
                              <SelectTrigger>
                                <SelectValue placeholder={carregandoProdutos ? "Carregando..." : "Ref."} />
                              </SelectTrigger>
                              <SelectContent>
                                {referencias.map((ref) => (
                                  <SelectItem key={ref} value={ref}>
                                    {ref}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Tamanho</Label>
                            <Select
                              value={item.tamanho || undefined}
                              onValueChange={(tam) =>
                                setItensVenda((prev) =>
                                  prev.map((it, i) => (i === index ? { ...it, tamanho: tam, cor: "" } : it))
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tam." />
                              </SelectTrigger>
                              <SelectContent>
                                {tams.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Cor</Label>
                            <Select
                              value={item.cor || undefined}
                              onValueChange={(cor) =>
                                setItensVenda((prev) =>
                                  prev.map((it, i) => (i === index ? { ...it, cor } : it))
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Cor" />
                              </SelectTrigger>
                              <SelectContent>
                                {cores.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Qtd</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantidade}
                              onChange={(e) =>
                                setItensVenda((prev) =>
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
                                setItensVenda((prev) =>
                                  prev.map((it, i) =>
                                    i === index ? { ...it, valor: Number(e.target.value || 0) } : it
                                  )
                                )
                              }
                            />
                          </div>

                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setItensVenda((prev) => prev.filter((i) => i.id !== item.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Totais */}
                  <Card className="p-4 bg-muted/30">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Total dos Produtos</Label>
                        <div className="text-2xl font-bold">R$ {calcularTotal().toFixed(2)}</div>
                      </div>
                      <div>
                        <Label>Desconto (%)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={desconto}
                          onChange={(e) => setDesconto(Number(e.target.value || 0))}
                        />
                      </div>
                      <div>
                        <Label>Forma de Pagamento</Label>
                        <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                {isEditing ? (
                  <Button onClick={salvarEdicao} className="bg-gradient-to-r from-purple to-pink text-white">
                    Salvar Alterações
                  </Button>
                ) : (
                  <Button onClick={finalizarVenda} className="bg-gradient-to-r from-purple to-pink text-white">
                    Finalizar Venda
                  </Button>
                )}
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
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabela de vendas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple" />
            Lista de Vendas
          </CardTitle>
          <CardDescription>
            {carregandoVendas ? "Carregando..." : `${filteredVendas.length} venda(s) encontrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell className="font-medium">{venda.numero}</TableCell>
                  <TableCell>{venda.clientes?.nome ?? "-"}</TableCell>
                  <TableCell>{venda.data}</TableCell>
                  <TableCell>{venda.venda_itens?.length ?? 0}</TableCell>
                  <TableCell>R$ {Number(venda.valor_total).toFixed(2)}</TableCell>
                  <TableCell>R$ {Number(venda.valor_final ?? venda.valor_total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{venda.pagamento}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{venda.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(venda.id)} title="Editar venda">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => excluirVenda(venda.id)} title="Excluir venda">
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {/* PDF para cliente */}
                      <Button variant="ghost" size="icon" onClick={() => imprimirVendaCliente(venda)} title="Imprimir/Salvar PDF (cliente)">
                        <FileText className="h-4 w-4" />
                      </Button>

                      {/* WhatsApp do cliente */}
                      <Button variant="ghost" size="icon" onClick={() => enviarWhatsCliente(venda)} title="Enviar resumo para WhatsApp do cliente">
                        <MessageCircle className="h-4 w-4" />
                      </Button>

                      {/* WhatsApp da loja (mantido) */}
                      <Button variant="ghost" size="icon" onClick={() => enviarWhatsAppLoja(venda)} title="Enviar para seu WhatsApp (loja)">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendas;
