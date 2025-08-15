import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Package, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProductForm from "@/components/ProductForm";

/* ===================== Tipos ===================== */
interface StockItem {
  id?: string;
  cor: string;
  tamanho: string;
  quantidadeFabrica: number;
  quantidadeLoja: number;
}

export interface IngredientItem {
  id: number;
  insumo: string;          // nome do insumo (único)
  quantidade: number;      // quantidade usada por 1 unidade do produto
  unidade: string;
  valorUnitario: number;   // opcional (pode vir do cadastro de insumos)
  valorTotal: number;      // quantidade * valorUnitario (UI)
}

interface ProductData {
  id?: string;
  referencia: string;
  nome: string;
  categoria: string;
  valor: number;              // preco_venda
  stockItems: StockItem[];
  ingredients: IngredientItem[];
  margemLucro: number;
}

// catálogos vindos do banco
type CorCat = { id: string; nome: string; ativa?: boolean; hex_code?: string | null };
type TamCat = { id: string; nome: string; ativo?: boolean; ordem?: number | null };
type CatCat = { id: string; nome: string; ativa?: boolean };
type InsumoOpcao = { nome: string; unidade: string; unidade_abrev: string | null; valor_unitario: number };

/* ================================================= */

const Produtos = () => {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);

  const [produtos, setProdutos] = useState<ProductData[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Catálogos (agora do banco)
  const [coresDisponiveis, setCoresDisponiveis] = useState<CorCat[]>([]);
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<TamCat[]>([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CatCat[]>([]);
  const [insumosDisponiveis, setInsumosDisponiveis] = useState<InsumoOpcao[]>([]);

  /** Pequeno paraquedas: valores conhecidos do ENUM (ajuste conforme seu enum real) */
  const CATEGORIA_ENUM_VALIDAS = new Set([
    "Sutiã","Calcinha","Cueca","Nadador","Pijama","Lingerie","Outros","Cotton"
  ]);
  const normalizarCategoria = (c: string) => {
    const val = String(c || "").trim();
    return CATEGORIA_ENUM_VALIDAS.has(val) ? val : "Outros";
  };

  /** ---------- Carregar produtos do Supabase ---------- */
  const carregarProdutos = async () => {
    setCarregando(true);

    const { data, error } = await supabase
      .from("produtos")
      .select(`
        id, referencia, nome, categoria, preco_venda, status, ativo,
        insumos, margem_lucro,
        estoque:estoque!estoque_produto_id_fkey (
          id, cor, tamanho, estoque_fabrica, estoque_loja
        )
      `)
      .eq("status", "ativo")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
      setProdutos([]);
      setCarregando(false);
      return;
    }

    const mapped: ProductData[] = (data ?? []).map((p: any) => ({
      id: p.id,
      referencia: p.referencia ?? "",
      nome: p.nome ?? "",
      categoria: p.categoria ?? "Outros",
      valor: Number(p.preco_venda ?? 0),
      margemLucro: Number(p.margem_lucro ?? 0),
      ingredients: Array.isArray(p.insumos) ? (p.insumos as IngredientItem[]) : [],
      stockItems: (p.estoque ?? []).map((e: any) => ({
        id: e.id,
        cor: e.cor ?? "",
        tamanho: e.tamanho ?? "",
        quantidadeFabrica: Number(e.estoque_fabrica ?? 0),
        quantidadeLoja: Number(e.estoque_loja ?? 0),
      })),
    }));

    setProdutos(mapped);
    setCarregando(false);
  };

  /** ---------- Carregar catálogos (cores, tamanhos, categorias, insumos) ---------- */
  const carregarCatalogos = async () => {
    const [cores, tamanhos, categorias] = await Promise.all([
      supabase.from("cores").select("id,nome,hex_code,ativo").eq("ativo", true).order("nome"),
      supabase.from("tamanhos").select("id,nome,ordem,ativo").eq("ativo", true).order("ordem").order("nome"),
      supabase.from("categorias_produto").select("id,nome,ativo").eq("ativo", true).order("nome"),
    ]);

    if (!cores.error) {
      setCoresDisponiveis((cores.data ?? []).map((c: any) => ({
        id: c.id, nome: c.nome, ativa: c.ativo, hex_code: c.hex_code
      })));
    }
    if (!tamanhos.error) {
      setTamanhosDisponiveis((tamanhos.data ?? []).map((t: any) => ({
        id: t.id, nome: t.nome, ativo: t.ativo, ordem: t.ordem
      })));
    }
    if (!categorias.error) {
      setCategoriasDisponiveis((categorias.data ?? []).map((c: any) => ({
        id: c.id, nome: c.nome, ativa: c.ativo
      })));
    }

    // ---------- Insumos: tenta a VIEW; se falhar, faz fallback para a tabela ----------
    const view = await supabase
      .from("vw_insumos_resumo")
      .select("nome,unidade,unidade_abrev,valor_unitario")
      .order("nome");

    if (!view.error && Array.isArray(view.data)) {
      setInsumosDisponiveis(view.data as InsumoOpcao[]);
    } else {
      const tbl = await supabase
        .from("insumos")
        .select(`
          nome,
          valor_unitario,
          unidades_medida:unidade_medida_id ( nome, abreviacao )
        `)
        .neq("ativo", false)
        .order("nome");

      if (!tbl.error) {
        const arr: InsumoOpcao[] = (tbl.data ?? []).map((r: any) => ({
          nome: r.nome,
          unidade: r.unidades_medida?.nome ?? "",
          unidade_abrev: r.unidades_medida?.abreviacao ?? null,
          valor_unitario: Number(r.valor_unitario ?? 0),
        }));
        setInsumosDisponiveis(arr);
      } else {
        console.error("Erro ao carregar insumos:", view.error || tbl.error);
        toast({
          title: "Não foi possível carregar insumos",
          description: (view.error || tbl.error)?.message || "Verifique permissões/RLS.",
          variant: "destructive",
        });
        setInsumosDisponiveis([]);
      }
    }
  };

  useEffect(() => {
    carregarProdutos();
    carregarCatalogos();

    // Realtime opcional: quando alterar catálogos em outras telas, atualiza aqui
    const ch = supabase
      .channel("catalogos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cores" }, carregarCatalogos)
      .on("postgres_changes", { event: "*", schema: "public", table: "tamanhos" }, carregarCatalogos)
      .on("postgres_changes", { event: "*", schema: "public", table: "categorias_produto" }, carregarCatalogos)
      .on("postgres_changes", { event: "*", schema: "public", table: "insumos" }, carregarCatalogos)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  /** ---------- Consumo de insumos: só quando aumenta o total ---------- */
  const consumirInsumos = async (ingredients: IngredientItem[] | undefined, unidadesNovas: number) => {
    const linhas = (ingredients ?? [])
      .map(i => ({
        nome: String(i.insumo || "").trim(),
        qtdPorUnidade: Number(i.quantidade || 0),
      }))
      .filter(i => i.nome && i.qtdPorUnidade > 0);

    if (!linhas.length || unidadesNovas <= 0) return;

    try {
      const nomes = Array.from(new Set(linhas.map(l => l.nome)));
      const { data: rows, error } = await supabase
        .from("insumos")
        .select("id, nome, quantidade")
        .in("nome", nomes);
      if (error) throw error;

      const byName: Record<string, { id: string; quantidade: number }> = {};
      (rows ?? []).forEach((r: any) => {
        byName[String(r.nome).trim()] = { id: r.id, quantidade: Number(r.quantidade || 0) };
      });

      for (const l of linhas) {
        const alvo = byName[l.nome];
        if (!alvo) continue;

        const consumo = unidadesNovas * l.qtdPorUnidade;
        const novoSaldo = Math.max(0, Number(alvo.quantidade) - consumo);

        const { error: upErr } = await supabase
          .from("insumos")
          .update({ quantidade: novoSaldo })
          .eq("id", alvo.id);
        if (upErr) throw upErr;
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Falha ao atualizar insumos",
        description: e?.message ?? "Não foi possível ajustar os estoques de insumos.",
        variant: "destructive",
      });
    }
  };

  /** ---------- Salvar (criar/editar) ---------- */
  const handleSaveProduto = async (produtoData: ProductData) => {
    try {
      const norm = (v: any) => String(v ?? "").trim();

      const linhas = (produtoData.stockItems ?? [])
        .map((s) => ({
          cor: norm(s.cor),
          tamanho: norm(s.tamanho),
          estoque_fabrica: Number(s.quantidadeFabrica ?? 0),
          estoque_loja: Number(s.quantidadeLoja ?? 0),
        }))
        .filter((s) => s.cor && s.tamanho);

      const linhasParaManter = linhas.filter((s) => (s.estoque_fabrica + s.estoque_loja) > 0);
      const keysManter = new Set(linhasParaManter.map((s) => `${s.cor}||${s.tamanho}`));
      const keysZeradas = new Set(
        linhas
          .filter((s) => (s.estoque_fabrica + s.estoque_loja) === 0)
          .map((s) => `${s.cor}||${s.tamanho}`)
      );

      const novoTotalUnidades = linhasParaManter.reduce((a, s) => a + s.estoque_fabrica + s.estoque_loja, 0);

      // Paraquedas do enum
      const categoriaSegura = normalizarCategoria(produtoData.categoria);
      if (categoriaSegura !== produtoData.categoria) {
        toast({
          title: "Categoria ajustada",
          description: `Valor "${produtoData.categoria}" não existe no ENUM; salvando como "${categoriaSegura}".`,
        });
      }

      if (produtoData.id) {
        const { error: upErr } = await supabase
          .from("produtos")
          .update({
            referencia: produtoData.referencia,
            nome: produtoData.nome,
            categoria: categoriaSegura as any,
            preco_venda: Number(produtoData.valor ?? 0),
            status: "ativo",
            ativo: true,
            tamanhos: Array.from(new Set(linhasParaManter.map((s) => s.tamanho))),
            insumos: produtoData.ingredients ?? [],
            margem_lucro: Number(produtoData.margemLucro ?? 0),
          })
          .eq("id", produtoData.id);
        if (upErr) throw upErr;

        const { data: atuais, error: curErr } = await supabase
          .from("estoque")
          .select("id, cor, tamanho, estoque_fabrica, estoque_loja")
          .eq("produto_id", produtoData.id);
        if (curErr) throw curErr;

        const prevTotalUnidades = (atuais ?? []).reduce(
          (a: number, r: any) => a + Number(r.estoque_fabrica || 0) + Number(r.estoque_loja || 0),
          0
        );

        const toDeleteIds =
          (atuais ?? [])
            .filter((r: any) => {
              const key = `${r.cor}||${r.tamanho}`;
              return !keysManter.has(key) || keysZeradas.has(key);
            })
            .map((r: any) => r.id);

        if (toDeleteIds.length) {
          const { error: delErr } = await supabase.from("estoque").delete().in("id", toDeleteIds);
          if (delErr) throw delErr;
        }

        if (linhasParaManter.length) {
          const variacoes = linhasParaManter.map((s) => ({
            produto_id: produtoData.id,
            cor: s.cor,
            tamanho: s.tamanho,
            estoque_fabrica: s.estoque_fabrica,
            estoque_loja: s.estoque_loja,
          }));
          const { error: estErr } = await supabase
            .from("estoque")
            .upsert(variacoes, { onConflict: "produto_id,cor,tamanho" });
          if (estErr) throw estErr;
        }

        // 🔻 Só consome insumos quando aumenta o total
        const deltaAumento = Math.max(0, novoTotalUnidades - prevTotalUnidades);
        if (deltaAumento > 0) {
          await consumirInsumos(produtoData.ingredients, deltaAumento);
        }

        toast({ title: "Produto atualizado!", description: "Variações e insumos salvos." });
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("produtos")
          .insert({
            referencia: produtoData.referencia,
            nome: produtoData.nome,
            categoria: categoriaSegura as any,
            preco_venda: Number(produtoData.valor ?? 0),
            status: "ativo",
            ativo: true,
            tamanhos: Array.from(new Set(linhasParaManter.map((s) => s.tamanho))),
            insumos: produtoData.ingredients ?? [],
            margem_lucro: Number(produtoData.margemLucro ?? 0),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        const produtoId = inserted!.id as string;

        if (linhasParaManter.length) {
          const variacoes = linhasParaManter.map((s) => ({
            produto_id: produtoId,
            cor: s.cor,
            tamanho: s.tamanho,
            estoque_fabrica: s.estoque_fabrica,
            estoque_loja: s.estoque_loja,
          }));
          const { error: estErr } = await supabase
            .from("estoque")
            .upsert(variacoes, { onConflict: "produto_id,cor,tamanho" });
          if (estErr) throw estErr;
        }

        // 🔻 Consumo inicial = total informado no cadastro
        const deltaInicial = Math.max(0, novoTotalUnidades);
        if (deltaInicial > 0) {
          await consumirInsumos(produtoData.ingredients, deltaInicial);
        }

        toast({ title: "Produto salvo!", description: "Cadastrado com sucesso." });
      }

      setEditingProduct(null);
      setIsFormOpen(false);
      await carregarProdutos();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao salvar",
        description: e.message ?? "Falha ao salvar produto.",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (produto: ProductData) => {
    setEditingProduct(produto);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (id?: string) => {
    if (!id) return;
    try {
      await supabase.from("estoque").delete().eq("produto_id", id);
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Produto excluído!", description: "Removido com sucesso." });
      await carregarProdutos();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao excluir",
        description: e.message ?? "Falha ao excluir produto.",
        variant: "destructive",
      });
    }
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const filteredProdutos = produtos.filter(
    (produto) =>
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.referencia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularTotalEstoque = (produto: ProductData) =>
    produto.stockItems.reduce(
      (total, item) => total + (item.quantidadeFabrica || 0) + (item.quantidadeLoja || 0),
      0
    );

  const calcularTotalFabrica = (produto: ProductData) =>
    produto.stockItems.reduce((total, item) => total + (item.quantidadeFabrica || 0), 0);

  const calcularTotalLoja = (produto: ProductData) =>
    produto.stockItems.reduce((total, item) => total + (item.quantidadeLoja || 0), 0);

  const getCoresUnicas = (produto: ProductData) =>
    [...new Set(produto.stockItems.map((item) => item.cor))].filter((cor) => cor);

  const getTamanhosUnicos = (produto: ProductData) =>
    [...new Set(produto.stockItems.map((item) => item.tamanho))].filter((t) => t);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Produtos
          </h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={carregarProdutos} disabled={carregando}>
            <Package className="mr-2 h-4 w-4" />
            {carregando ? "Atualizando..." : "Atualizar Lista"}
          </Button>

          <Button
            onClick={handleNewProduct}
            className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple" />
            Lista de Produtos
          </CardTitle>
          <CardDescription>
            {carregando ? "Carregando..." : `${filteredProdutos.length} produto(s) encontrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cores</TableHead>
                <TableHead>Tamanhos</TableHead>
                <TableHead className="text-center">Fábrica</TableHead>
                <TableHead className="text-center">Loja</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.referencia}</TableCell>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{produto.categoria}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {getCoresUnicas(produto).map((cor) => (
                        <Badge key={cor} variant="secondary" className="text-xs">
                          {cor}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {getTamanhosUnicos(produto).map((tamanho) => (
                        <Badge key={tamanho} variant="outline" className="text-xs">
                          {tamanho}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={calcularTotalFabrica(produto) > 10 ? "secondary" : "destructive"}>
                      {calcularTotalFabrica(produto)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={calcularTotalLoja(produto) > 5 ? "secondary" : "destructive"}>
                      {calcularTotalLoja(produto)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{calcularTotalEstoque(produto)}</Badge>
                  </TableCell>
                  <TableCell>R$ {Number(produto.valor).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProduct(produto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(produto.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduto}
        editingProduct={editingProduct}
        // catálogos do banco
        coresDisponiveis={coresDisponiveis}
        tamanhosDisponiveis={tamanhosDisponiveis}
        categoriasDisponiveis={categoriasDisponiveis}
        insumosDisponiveis={insumosDisponiveis}
      />
    </div>
  );
};

export default Produtos;
