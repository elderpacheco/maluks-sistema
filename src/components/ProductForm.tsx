import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StockBySizeColor from "./StockBySizeColor";
import ProductIngredients from "./ProductIngredients";

/** Mantemos ids internos tolerantes. No DB (produtos) o id é UUID (string). */
interface StockItem {
  id?: string | number;
  cor: string;
  tamanho: string;
  quantidadeFabrica: number;
  quantidadeLoja: number;
}

interface IngredientItem {
  id?: string | number;
  insumo: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

/** Este tipo PRECISA casar com o que a page Produtos usa. */
export interface ProductFormData {
  id?: string; // UUID do Supabase quando estiver editando
  referencia: string;
  nome: string;
  categoria: string;
  valor: number; // preco_venda
  stockItems: StockItem[];
  ingredients: IngredientItem[];
  margemLucro: number;
}

/** Opções de insumo vindas do catálogo */
type InsumoOpcao = {
  nome: string;
  unidade: string;
  unidade_abrev: string | null;
  valor_unitario: number;
};

export interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: ProductFormData) => void;
  editingProduct?: ProductFormData | null;
  coresDisponiveis: Array<{ id: string | number; nome: string; ativa?: boolean }>;
  tamanhosDisponiveis: Array<{ id: string | number; nome: string; ativo?: boolean }>;
  categoriasDisponiveis: Array<{ id: string | number; nome: string; ativa?: boolean }>;
  /** <<< NOVO: lista de insumos vinda do banco */
  insumosDisponiveis: InsumoOpcao[];
}

const ProductForm = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
  coresDisponiveis,
  tamanhosDisponiveis,
  categoriasDisponiveis,
  insumosDisponiveis, // <<< NOVO
}: ProductFormProps) => {
  const [formData, setFormData] = useState<ProductFormData>({
    referencia: "",
    nome: "",
    categoria: "",
    valor: 0,
    stockItems: [],
    ingredients: [],
    margemLucro: 50,
  });

  useEffect(() => {
    if (editingProduct) {
      // clone para não mutar o objeto recebido
      setFormData({ ...editingProduct });
    } else {
      // reset para novo produto
      setFormData({
        referencia: "",
        nome: "",
        categoria: "",
        valor: 0,
        stockItems: [],
        ingredients: [],
        margemLucro: 50,
      });
    }
  }, [editingProduct, isOpen]);

  const calcularPrecoAutomatico = () => {
    if (formData.ingredients.length > 0) {
      const custoTotal = formData.ingredients.reduce((total, item) => total + item.valorTotal, 0);
      return custoTotal * (1 + formData.margemLucro / 100);
    }
    return formData.valor;
  };

  const handleSave = () => {
    if (!formData.nome.trim()) return;

    // Se houver ingredientes, o preço é calculado automaticamente
    const precoFinal =
      formData.ingredients.length > 0
        ? formData.ingredients.reduce((total, item) => total + item.valorTotal, 0) *
          (1 + formData.margemLucro / 100)
        : formData.valor;

    const produtoFinal: ProductFormData = {
      ...formData,
      valor: precoFinal,
      // mantém o id se estiver editando; para novo, deixa undefined (DB cria)
      id: editingProduct?.id,
    };

    onSave(produtoFinal);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}</DialogTitle>
          <DialogDescription>
            {editingProduct
              ? "Modifique as informações do produto."
              : "Preencha as informações do produto. Apenas nome é obrigatório."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referencia">Referência</Label>
                <Input
                  id="referencia"
                  placeholder="Ex: SP001"
                  value={formData.referencia}
                  onChange={(e) => setFormData((prev) => ({ ...prev, referencia: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Sutiã Push-Up"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDisponiveis
                      .filter((cat) => cat.ativa !== false)
                      .map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.nome}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valor">
                  Valor de Venda {formData.ingredients.length > 0 && "(Calculado automaticamente)"}
                </Label>
                <Input
                  id="valor"
                  type="number"
                  placeholder="0.00"
                  value={
                    formData.ingredients.length > 0
                      ? calcularPrecoAutomatico().toFixed(2)
                      : String(formData.valor)
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))
                  }
                  disabled={formData.ingredients.length > 0}
                  className={formData.ingredients.length > 0 ? "bg-muted" : ""}
                />
              </div>
            </div>
          </div>

          {/* Insumos e Cálculo de Preço */}
          <ProductIngredients
            ingredients={formData.ingredients}
            onIngredientsChange={(ingredients) => setFormData((prev) => ({ ...prev, ingredients }))}
            margemLucro={formData.margemLucro}
            onMargemChange={(margem) => setFormData((prev) => ({ ...prev, margemLucro: margem }))}
            /** <<< repasse da lista de insumos vinda do banco */
            insumosDisponiveis={insumosDisponiveis}
          />

          {/* Estoque por Cor e Tamanho */}
          <StockBySizeColor
            stockItems={formData.stockItems}
            onStockChange={(stockItems) => setFormData((prev) => ({ ...prev, stockItems }))}
            coresDisponiveis={coresDisponiveis}
            tamanhosDisponiveis={tamanhosDisponiveis}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple to-pink text-white"
            disabled={!formData.nome.trim()}
          >
            {editingProduct ? "Atualizar Produto" : "Salvar Produto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
