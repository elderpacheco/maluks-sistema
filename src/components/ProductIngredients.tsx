// src/components/ProductIngredients.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

/** Deve casar com o shape salvo em produtos.insumos */
export type IngredientItem = {
  id: string | number;   // id da linha no form
  insumo: string;        // NOME do insumo (chave única humana)
  quantidade: number;
  unidade: string;       // m, kg, rl, …
  valorUnitario: number; // preço unitário
  valorTotal: number;    // quantidade * valorUnitario
};

/** Opções vindas do catálogo (vw_insumos_resumo) */
export type InsumoOpcao = {
  nome: string;
  unidade: string;
  unidade_abrev: string | null;
  valor_unitario: number;
};

type Props = {
  ingredients: IngredientItem[];
  onIngredientsChange: (rows: IngredientItem[]) => void;
  margemLucro: number;
  onMargemChange: (m: number) => void;
  /** <<< NOVO: catálogo real vindo do banco */
  insumosDisponiveis: InsumoOpcao[];
};

const fmt = (n: number) =>
  `R$ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`.replace(".", ",");

export default function ProductIngredients({
  ingredients,
  onIngredientsChange,
  margemLucro,
  onMargemChange,
  insumosDisponiveis,
}: Props) {
  const addRow = () => {
    onIngredientsChange([
      ...ingredients,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        insumo: "",
        quantidade: 0,
        unidade: "Auto",
        valorUnitario: 0,
        valorTotal: 0,
      },
    ]);
  };

  const updateRow = (idx: number, patch: Partial<IngredientItem>) => {
    const rows = [...ingredients];
    rows[idx] = { ...rows[idx], ...patch };
    const q = Number(rows[idx].quantidade || 0);
    const vu = Number(rows[idx].valorUnitario || 0);
    rows[idx].valorTotal = q * vu;
    onIngredientsChange(rows);
  };

  const removeRow = (idx: number) => {
    const rows = [...ingredients];
    rows.splice(idx, 1);
    onIngredientsChange(rows);
  };

  const custoTotal = ingredients.reduce((s, r) => s + (r.valorTotal || 0), 0);
  const lucro = custoTotal * (Number(margemLucro || 0) / 100);
  const precoVenda = custoTotal + lucro;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Insumos e Cálculo de Preço</h3>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Insumo
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          Nenhum insumo adicionado. Clique em “Adicionar Insumo” para começar.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-3 text-sm text-muted-foreground">
            <span>Insumo</span>
            <span>Quantidade</span>
            <span>Unidade</span>
            <span>Valor Unit.</span>
            <span>Total</span>
            <span className="text-right pr-2">Ações</span>
          </div>

          {ingredients.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-6 gap-3 items-center">
              {/* INSUMO (CONTROLADO) */}
              <Select
                value={row.insumo || ""}
                onValueChange={(nomeSelecionado) => {
                  const cat = insumosDisponiveis.find((c) => c.nome === nomeSelecionado);
                  updateRow(idx, {
                    insumo: nomeSelecionado,
                    unidade: cat ? (cat.unidade_abrev || cat.unidade) : row.unidade,
                    valorUnitario: cat ? Number(cat.valor_unitario || 0) : row.valorUnitario,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={insumosDisponiveis.length ? "Selecione" : "Sem insumos"} />
                </SelectTrigger>
                <SelectContent>
                  {insumosDisponiveis.map((opt) => (
                    <SelectItem key={opt.nome} value={opt.nome}>
                      {opt.nome} — {fmt(Number(opt.valor_unitario || 0))}
                      {`/${opt.unidade_abrev || opt.unidade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* QUANTIDADE */}
              <Input
                type="number"
                step="0.01"
                value={row.quantidade}
                onChange={(e) =>
                  updateRow(idx, { quantidade: Number(e.target.value || 0) })
                }
              />

              {/* UNIDADE (preenchida automaticamente, mas editável) */}
              <Input
                value={row.unidade}
                onChange={(e) => updateRow(idx, { unidade: e.target.value })}
              />

              {/* VALOR UNITÁRIO (vem do catálogo, mas editável) */}
              <Input
                type="number"
                step="0.01"
                value={row.valorUnitario}
                onChange={(e) =>
                  updateRow(idx, { valorUnitario: Number(e.target.value || 0) })
                }
              />

              {/* TOTAL */}
              <div className="px-3 py-2 rounded-md bg-muted">
                {fmt(row.valorTotal)}
              </div>

              {/* AÇÕES */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(idx)}
                  title="Remover insumo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Rodapé com margem e totais */}
      <div className="grid grid-cols-3 gap-4 rounded-md border p-4 bg-muted/30">
        <div>
          <Label>Margem de Lucro (%)</Label>
          <Input
            type="number"
            value={margemLucro}
            onChange={(e) => onMargemChange(Number(e.target.value || 0))}
          />
        </div>

        <div>
          <Label>Custo Total</Label>
          <div className="text-2xl font-bold">{fmt(custoTotal)}</div>
        </div>

        <div>
          <Label>Preço Venda</Label>
          <div className="text-2xl font-bold text-purple">{fmt(precoVenda)}</div>
        </div>
      </div>
    </div>
  );
}
