import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

interface StockItem {
  id: number;
  cor: string;
  tamanho: string;
  quantidadeFabrica: number;
  quantidadeLoja: number;
}

interface StockBySizeColorProps {
  stockItems: StockItem[];
  onStockChange: (items: StockItem[]) => void;
  coresDisponiveis: Array<{ id: number; nome: string; ativa: boolean }>;
  tamanhosDisponiveis: Array<{ id: number; nome: string; ativo: boolean }>;
}

const StockBySizeColor = ({ 
  stockItems, 
  onStockChange, 
  coresDisponiveis, 
  tamanhosDisponiveis 
}: StockBySizeColorProps) => {
  const adicionarItem = () => {
    const novoItem: StockItem = {
      id: Date.now(),
      cor: "",
      tamanho: "",
      quantidadeFabrica: 0,
      quantidadeLoja: 0
    };
    onStockChange([...stockItems, novoItem]);
  };

  const removerItem = (id: number) => {
    onStockChange(stockItems.filter(item => item.id !== id));
  };

  const atualizarItem = (id: number, campo: keyof StockItem, valor: any) => {
    onStockChange(stockItems.map(item => 
      item.id === id ? { ...item, [campo]: valor } : item
    ));
  };

  const calcularTotalFabrica = () => {
    return stockItems.reduce((total, item) => total + item.quantidadeFabrica, 0);
  };

  const calcularTotalLoja = () => {
    return stockItems.reduce((total, item) => total + item.quantidadeLoja, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Estoque por Cor e Tamanho</CardTitle>
          <Button variant="outline" size="sm" onClick={adicionarItem}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stockItems.map((item) => (
          <div key={item.id} className="grid grid-cols-6 gap-4 items-end p-4 border rounded">
            <div>
              <Label>Cor</Label>
              <select 
                className="w-full p-2 border rounded"
                value={item.cor}
                onChange={(e) => atualizarItem(item.id, 'cor', e.target.value)}
              >
                <option value="">Selecione</option>
                {coresDisponiveis.filter(cor => cor.ativa).map(cor => (
                  <option key={cor.id} value={cor.nome}>{cor.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Tamanho</Label>
              <select 
                className="w-full p-2 border rounded"
                value={item.tamanho}
                onChange={(e) => atualizarItem(item.id, 'tamanho', e.target.value)}
              >
                <option value="">Selecione</option>
                {tamanhosDisponiveis.filter(tam => tam.ativo).map(tamanho => (
                  <option key={tamanho.id} value={tamanho.nome}>{tamanho.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Qtd Fábrica</Label>
              <Input
                type="number"
                value={item.quantidadeFabrica}
                onChange={(e) => atualizarItem(item.id, 'quantidadeFabrica', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Qtd Loja</Label>
              <Input
                type="number"
                value={item.quantidadeLoja}
                onChange={(e) => atualizarItem(item.id, 'quantidadeLoja', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Total</Label>
              <Badge variant="outline" className="w-full justify-center">
                {item.quantidadeFabrica + item.quantidadeLoja}
              </Badge>
            </div>
            
            <div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removerItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {stockItems.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhum item de estoque adicionado. Clique em "Adicionar" para começar.
          </div>
        )}

        {stockItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <Label className="text-sm text-muted-foreground">Total Fábrica</Label>
              <div className="text-xl font-bold text-blue-600">{calcularTotalFabrica()}</div>
            </div>
            <div className="text-center">
              <Label className="text-sm text-muted-foreground">Total Loja</Label>
              <div className="text-xl font-bold text-green-600">{calcularTotalLoja()}</div>
            </div>
            <div className="text-center">
              <Label className="text-sm text-muted-foreground">Total Geral</Label>
              <div className="text-xl font-bold text-purple">{calcularTotalFabrica() + calcularTotalLoja()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockBySizeColor;