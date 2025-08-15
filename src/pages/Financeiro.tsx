import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  CalendarDays,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ===================== Tipos ===================== */
type Category = {
  id: string;
  name: "Vendas Loja" | "Vendas Fábrica" | string;
  kind: "entrada" | "saida" | "ambas";
  active: boolean;
  sort: number;
};

type Entry = {
  id: string;
  entry_type: "entrada" | "saida";
  description: string;
  category_id: string | null;
  category?: Category | null;
  amount: number;
  date: string; // yyyy-mm-dd
  due_date: string | null;
  status: "pendente" | "confirmado";
  paid_at: string | null;
  payment_method:
    | "PIX"
    | "Cartão"
    | "Dinheiro"
    | "Boleto"
    | "Transferência"
    | "Cheque"
    | "Outro"
    | null;
  notes: string | null;
};

type Kpis = {
  saldo_atual: number;
  entradas_mes: number;
  saidas_mes: number;
  a_vencer: number;
  vencidas: number;
};

const brl = (v: number | null | undefined) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ===================== Mini calendário mensal ===================== */
function MonthCalendar({
  monthDate,
  pendentesByDay,
  onPickDay,
  onPrevMonth,
  onNextMonth,
}: {
  monthDate: Date;
  pendentesByDay: Record<string, number>;
  onPickDay?: (isoDay: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startCell = new Date(start);
  startCell.setDate(start.getDate() - start.getDay()); // começa domingo
  const totalCells = 42; // 6 linhas

  const cells: { d: Date; iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startCell);
    d.setDate(startCell.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ d, iso, inMonth: d.getMonth() === monthDate.getMonth() });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-purple" />
          <p className="font-semibold">
            {monthDate.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={onPrevMonth} title="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextMonth} title="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs text-muted-foreground mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((wd) => (
          <div key={wd} className="text-center py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ d, iso, inMonth }) => {
          const val = pendentesByDay[iso] || 0;
          const isToday = iso === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={iso}
              onClick={() => onPickDay?.(iso)}
              className={[
                "h-16 rounded-md border flex flex-col items-center justify-between p-1 transition",
                inMonth ? "bg-white hover:bg-muted/50" : "bg-muted/30 text-muted-foreground",
                isToday ? "ring-2 ring-purple" : "",
              ].join(" ")}
              title={val ? `${brl(val)} pendente` : "Sem pendências"}
            >
              <span className="self-start text-xs">{d.getDate()}</span>
              {val > 0 && <span className="text-[11px] font-semibold">{brl(val)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== Página ===================== */
export default function Financeiro() {
  const { toast } = useToast();

  const [kpis, setKpis] = useState<Kpis>({
    saldo_atual: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    a_vencer: 0,
    vencidas: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState<"entradas" | "saidas" | "contas">("entradas");
  const [search, setSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dialogs
  const [openNewIn, setOpenNewIn] = useState(false);
  const [openNewOut, setOpenNewOut] = useState(false);

  // Top 4 categorias de ENTRADA confirmadas no mês visível (reais: manuais + vendas + consignado)
  const [topInCategories, setTopInCategories] = useState<{ name: string; total: number }[]>([]);

  const emptyForm: Partial<Entry> = {
    entry_type: "entrada",
    description: "",
    category_id: null,
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    due_date: null,
    status: "confirmado",
    payment_method: null,
    notes: "",
  };
  const [form, setForm] = useState<Partial<Entry>>(emptyForm);

  /* ---------- LOAD ---------- */
  const loadKpis = async () => {
    const { data, error } = await supabase
      .from("vw_finance_kpis")
      .select("*")
      .single();
    if (error) {
      console.error(error);
      return;
    }
    setKpis({
      saldo_atual: Number(data?.saldo_atual || 0),
      entradas_mes: Number(data?.entradas_mes || 0),
      saidas_mes: Number(data?.saidas_mes || 0),
      a_vencer: Number(data?.a_vencer || 0),
      vencidas: Number(data?.vencidas || 0),
    });
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setCategories((data || []) as Category[]);
  };

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("finance_entries")
      .select("*, finance_categories(*)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    const list = (data || []).map((e: any) => ({
      ...e,
      entry_type: e.entry_type, // explícito
      category: e.finance_categories
        ? {
            id: e.finance_categories.id,
            name: e.finance_categories.name,
            kind: e.finance_categories.kind,
            active: e.finance_categories.active,
            sort: e.finance_categories.sort,
          }
        : null,
    })) as Entry[];
    setEntries(list);
  };

  // Top categorias reais do mês (vem da view unificada)
  const loadTopInCategoriesForMonth = async (d: Date) => {
    const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const next  = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("vw_fin_in_by_category")
      .select("category_name, amount, date")
      .gte("date", first)
      .lt("date", next);

    if (error) {
      console.error(error);
      setTopInCategories([]);
      return;
    }

    const totals: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      const name = r.category_name || "Sem categoria";
      totals[name] = (totals[name] || 0) + Number(r.amount || 0);
    });

    const arr = Object.entries(totals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    setTopInCategories(arr);
  };

  useEffect(() => {
    loadKpis();
    loadCategories();
    loadEntries();
    loadTopInCategoriesForMonth(calendarMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza cards por categoria ao mudar o mês do calendário
  useEffect(() => {
    loadTopInCategoriesForMonth(calendarMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth]);

  /* ---------- HELPERS ---------- */
  const paymentOptions = [
    "PIX",
    "Cartão",
    "Dinheiro",
    "Boleto",
    "Transferência",
    "Cheque",
    "Outro",
  ] as const;

  const filtered = useMemo(() => {
    const st = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (tab === "entradas" && e.entry_type !== "entrada") return false;
      if (tab === "saidas" && e.entry_type !== "saida") return false;
      if (tab === "contas" && e.status !== "pendente") return false;

      if (!st) return true;
      const txt = [e.description, e.category?.name || "", e.payment_method || "", e.notes || ""]
        .join(" ")
        .toLowerCase();
      return txt.includes(st) || e.date.includes(st) || (e.due_date || "").includes(st);
    });
  }, [entries, tab, search]);

  // calendário: soma de pendentes por dia do mês visível (lançamentos manuais pendentes)
  const pendentesByDay = useMemo(() => {
    const first = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    )
      .toISOString()
      .slice(0, 10);
    const last = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);

    const inMonth = entries.filter(
      (e) => e.status === "pendente" && e.due_date && e.due_date >= first && e.due_date <= last
    );
    const map: Record<string, number> = {};
    inMonth.forEach((e) => {
      map[e.due_date!] = (map[e.due_date!] || 0) + Number(e.amount || 0);
    });
    return map;
  }, [entries, calendarMonth]);

  /* ---------- CRUD ---------- */
  const openNew = (kind: "entrada" | "saida") => {
    setForm({ ...emptyForm, entry_type: kind, status: "confirmado" });
    kind === "entrada" ? setOpenNewIn(true) : setOpenNewOut(true);
  };

  const reloadDash = async () => {
    await Promise.all([
      loadEntries(),
      loadKpis(),
      loadTopInCategoriesForMonth(calendarMonth),
    ]);
  };

  const saveNew = async () => {
    try {
      if (!form.description || !form.entry_type || !form.amount) {
        toast({
          title: "Preencha descrição, valor e tipo.",
          variant: "destructive",
        });
        return;
      }
      const payload = {
        entry_type: form.entry_type,
        description: form.description,
        category_id: form.category_id || null,
        amount: Number(form.amount),
        date: form.date || new Date().toISOString().slice(0, 10),
        due_date:
          form.status === "pendente" ? form.due_date || form.date || null : null,
        status: form.status || "confirmado",
        paid_at:
          form.status === "confirmado"
            ? form.paid_at || new Date().toISOString()
            : null,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("finance_entries").insert(payload);
      if (error) throw error;
      toast({ title: "Lançamento salvo!" });
      setOpenNewIn(false);
      setOpenNewOut(false);
      await reloadDash();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao salvar",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const confirmEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("finance_entries")
        .update({ status: "confirmado", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await reloadDash();
    } catch (e: any) {
      toast({
        title: "Erro ao confirmar",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const cancelConfirm = async (id: string) => {
    try {
      const { error } = await supabase
        .from("finance_entries")
        .update({ status: "pendente", paid_at: null })
        .eq("id", id);
      if (error) throw error;
      await reloadDash();
    } catch (e: any) {
      toast({
        title: "Erro ao estornar",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("finance_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await reloadDash();
    } catch (e: any) {
      toast({
        title: "Erro ao excluir",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header + ações */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
          Financeiro
        </h1>
        <div className="flex gap-2">
          <Dialog open={openNewOut} onOpenChange={setOpenNewOut}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => openNew("saida")}>
                Nova Saída
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Saída</DialogTitle>
                <DialogDescription>Cadastre uma despesa.</DialogDescription>
              </DialogHeader>
              <FormEntry
                form={form}
                setForm={setForm}
                categories={categories.filter((c) => c.kind !== "entrada")}
                paymentOptions={paymentOptions}
                isOut
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenNewOut(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={saveNew}
                  className="bg-gradient-to-r from-purple to-pink text-white"
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openNewIn} onOpenChange={setOpenNewIn}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-purple to-pink text-white"
                onClick={() => openNew("entrada")}
              >
                <Plus className="h-4 w-4 mr-2" /> Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Entrada</DialogTitle>
                <DialogDescription>Cadastre uma receita.</DialogDescription>
              </DialogHeader>
              <FormEntry
                form={form}
                setForm={setForm}
                categories={categories.filter((c) => c.kind !== "saida")}
                paymentOptions={paymentOptions}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenNewIn(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={saveNew}
                  className="bg-gradient-to-r from-purple to-pink text-white"
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs (reais: manuais + vendas + consignado) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-2xl font-bold">{brl(kpis.saldo_atual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Entradas do Mês</p>
            <p className="text-2xl font-bold">{brl(kpis.entradas_mes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Saídas do Mês</p>
            <p className="text-2xl font-bold">{brl(kpis.saidas_mes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">A Vencer</p>
            <p className="text-2xl font-bold">{kpis.a_vencer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vencidas</p>
            <p className="text-2xl font-bold">{kpis.vencidas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top categorias reais do mês (ex.: Vendas Loja, Vendas Fábrica, Consignado, etc.) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topInCategories.length > 0 ? (
          topInCategories.map(({ name, total }) => (
            <Card key={name}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground truncate" title={name}>
                  {name} (mês)
                </p>
                <p className="text-2xl font-bold">{brl(total)}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Categorias do mês</p>
              <p className="text-2xl font-bold">Sem entradas confirmadas</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros + busca */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant={tab === "entradas" ? "default" : "outline"}
              onClick={() => setTab("entradas")}
            >
              Entradas
            </Button>
            <Button
              variant={tab === "saidas" ? "default" : "outline"}
              onClick={() => setTab("saidas")}
            >
              Saídas
            </Button>
            <Button
              variant={tab === "contas" ? "default" : "outline"}
              onClick={() => setTab("contas")}
            >
              Contas a Pagar/Receber
            </Button>
          </div>
          <div className="ml-auto relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Buscar lançamentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {/* (setas ficam dentro do MonthCalendar) */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabela (lançamentos manuais) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{e.category?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={e.entry_type === "entrada" ? "secondary" : "destructive"}
                      >
                        {e.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{brl(e.amount)}</TableCell>
                    <TableCell>{e.date}</TableCell>
                    <TableCell>{e.due_date || "-"}</TableCell>
                    <TableCell>
                      {e.status === "confirmado" ? (
                        <Badge variant="outline" className="border-green-600 text-green-700">
                          Confirmado
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>{e.payment_method || "-"}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        {e.status === "pendente" ? (
                          <Button size="sm" variant="outline" onClick={() => confirmEntry(e.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => cancelConfirm(e.id)}>
                            <XCircle className="h-4 w-4 mr-1" /> Estornar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteEntry(e.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      Nenhum lançamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Calendário com setas próprias */}
        <MonthCalendar
          monthDate={calendarMonth}
          pendentesByDay={pendentesByDay}
          onPickDay={(iso) => setSearch(iso)}
          onPrevMonth={() =>
            setCalendarMonth(
              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
            )
          }
          onNextMonth={() =>
            setCalendarMonth(
              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
            )
          }
        />
      </div>
    </div>
  );
}

/* ===================== Formulário reusável ===================== */
function FormEntry({
  form,
  setForm,
  categories,
  paymentOptions,
  isOut = false,
}: {
  form: Partial<Entry>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Entry>>>;
  categories: Category[];
  paymentOptions: readonly string[];
  isOut?: boolean;
}) {
  return (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>Descrição</Label>
          <Input
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={isOut ? "Ex.: Aluguel, Insumo..." : "Ex.: Venda Loja, Consignado..."}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Categoria</Label>
          <select
            className="w-full p-2 border rounded"
            value={form.category_id || ""}
            onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
          >
            <option value="">Selecione</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Forma de Pagamento</Label>
          <select
            className="w-full p-2 border rounded"
            value={form.payment_method || ""}
            onChange={(e) =>
              setForm({ ...form, payment_method: (e.target.value || null) as any })
            }
          >
            <option value="">Selecione</option>
            {paymentOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Valor</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={form.amount || 0}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value || 0) })}
            className="text-right"
          />
        </div>
        <div>
          <Label>{form.status === "pendente" ? "Emissão" : "Data"}</Label>
          <Input
            type="date"
            value={form.date || ""}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="w-full p-2 border rounded"
            value={form.status || "confirmado"}
            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
          >
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </div>

      {form.status === "pendente" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Vencimento</Label>
            <Input
              type="date"
              value={form.due_date || ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Input
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
      )}
    </div>
  );
}
