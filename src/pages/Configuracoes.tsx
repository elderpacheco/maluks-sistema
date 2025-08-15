import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Settings, Palette, Ruler, Tag, Edit, Trash2, Package2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ----------------- Tipos ----------------- */
type UUID = string;

type Cor = {
  id: UUID;
  nome: string;
  hex_code: string;
  ativo: boolean;
  created_at: string;
};

type Tamanho = {
  id: UUID;
  nome: string;
  descricao: string | null;
  ordem: number | null;
  ativo: boolean;
  created_at: string;
};

type Categoria = {
  id: UUID;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  qtde_produtos?: number | null; // opcional (se tiver a função de resumo)
};

type Unidade = {
  id: UUID;
  nome: string;
  abreviacao: string | null;
  ativo: boolean;
  created_at: string;
};

type InsumoResumo = {
  id: UUID;
  nome: string;
  unidade: string;
  unidade_abrev: string | null;
  valor_unitario: number;
  quantidade_atual: number;
  fornecedor: string | null;
  ativo: boolean;
};

type Empresa = {
  id: string; // "singleton"
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
  whatsapp_vendas: string | null;
};

/* ----------------- Utils ----------------- */
const brl = (v: number | null | undefined) =>
  (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ===================================================== */
/*                      COMPONENTE                       */
/* ===================================================== */

export default function Configuracoes() {
  const { toast } = useToast();

  // busca
  const [searchTerm, setSearchTerm] = useState("");

  // tabs dialogs
  const [isCorDialogOpen, setIsCorDialogOpen] = useState(false);
  const [isTamanhoDialogOpen, setIsTamanhoDialogOpen] = useState(false);
  const [isCategoriaDialogOpen, setIsCategoriaDialogOpen] = useState(false);
  const [isUnidadeDialogOpen, setIsUnidadeDialogOpen] = useState(false);

  // loading
  const [loading, setLoading] = useState(false);

  // dados
  const [cores, setCores] = useState<Cor[]>([]);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<Unidade[]>([]);
  const [insumos, setInsumos] = useState<InsumoResumo[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  // forms (controlados)
  const [corNome, setCorNome] = useState("");
  const [corHex, setCorHex] = useState("#000000");

  const [tamNome, setTamNome] = useState("");
  const [tamOrdem, setTamOrdem] = useState<number | "">("");
  const [tamDesc, setTamDesc] = useState("");

  const [catNome, setCatNome] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [uniNome, setUniNome] = useState("");
  const [uniAbrev, setUniAbrev] = useState("");

  // empresa (inputs controlados)
  const [eNome, setENome] = useState("");
  const [eCnpj, setECnpj] = useState("");
  const [eTelefone, setETelefone] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eEndereco, setEEndereco] = useState("");
  const [eCidade, setECidade] = useState("");
  const [eCep, setECep] = useState("");
  const [eWhats, setEWhats] = useState("");

  /* --------- Carregamentos --------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        loadCores(),
        loadTamanhos(),
        loadCategorias(),
        loadUnidadesMedida(),
        loadInsumos(),
        loadEmpresa(),
      ]);
      setLoading(false);
    })();
  }, []);

  const loadCores = async () => {
    const { data, error } = await supabase.from("cores").select("*").order("nome", { ascending: true });
    if (error) return console.error("Erro cores:", error);
    setCores((data || []) as Cor[]);
  };

  const loadTamanhos = async () => {
    const { data, error } = await supabase.from("tamanhos").select("*").order("ordem", { ascending: true }).order("nome");
    if (error) return console.error("Erro tamanhos:", error);
    setTamanhos((data || []) as Tamanho[]);
  };

  const loadCategorias = async () => {
    // se existir a função de resumo, podemos chamar via RPC; senão, lê direto da tabela
    const { data, error } = await supabase
      .from("categorias_produto")
      .select("*")
      .order("nome", { ascending: true });
    if (error) return console.error("Erro categorias:", error);
    setCategorias((data || []) as Categoria[]);
  };

  const loadUnidadesMedida = async () => {
    const { data, error } = await supabase.from("unidades_medida").select("*").order("nome");
    if (error) return console.error("Erro unidades:", error);
    setUnidadesMedida((data || []) as Unidade[]);
  };

  const loadInsumos = async () => {
    // Leitura da VIEW de resumo (somente leitura)
    const { data, error } = await supabase
      .from("vw_insumos_resumo")
      .select("id, nome, unidade, unidade_abrev, valor_unitario, quantidade_atual, fornecedor, ativo")
      .order("nome", { ascending: true });
    if (error) return console.error("Erro insumos:", error);
    setInsumos((data || []) as InsumoResumo[]);
  };

  const loadEmpresa = async () => {
    const { data, error } = await supabase.from("empresa_config").select("*").limit(1).maybeSingle();
    if (error) return console.error("Erro empresa:", error);
    if (data) {
      setEmpresa(data as Empresa);
      setENome(data.nome || "");
      setECnpj(data.cnpj || "");
      setETelefone(data.telefone || "");
      setEEmail(data.email || "");
      setEEndereco(data.endereco || "");
      setECidade(data.cidade || "");
      setECep(data.cep || "");
      setEWhats(data.whatsapp_vendas || "");
    } else {
      // primeira vez: deixa formulário vazio
      setEmpresa(null);
    }
  };

  /* --------- Saves / Deletes --------- */
  const handleSaveCor = async () => {
    if (!corNome.trim() || !corHex.trim()) {
      toast({ title: "Informe nome e cor", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("cores").insert({ nome: corNome.trim(), hex_code: corHex.trim(), ativo: true });
    if (error) {
      toast({ title: "Erro ao salvar cor", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cor salva!" });
    setIsCorDialogOpen(false);
    setCorNome("");
    setCorHex("#000000");
    await loadCores();
  };

  const handleDeleteCor = async (id: UUID) => {
    if (!confirm("Excluir esta cor?")) return;
    const { error } = await supabase.from("cores").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    await loadCores();
  };

  const handleSaveTamanho = async () => {
    if (!tamNome.trim()) {
      toast({ title: "Informe o nome do tamanho", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("tamanhos")
      .insert({ nome: tamNome.trim(), descricao: tamDesc.trim() || null, ordem: tamOrdem === "" ? null : Number(tamOrdem), ativo: true });
    if (error) {
      toast({ title: "Erro ao salvar tamanho", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tamanho salvo!" });
    setIsTamanhoDialogOpen(false);
    setTamNome(""); setTamOrdem(""); setTamDesc("");
    await loadTamanhos();
  };

  const handleDeleteTamanho = async (id: UUID) => {
    if (!confirm("Excluir este tamanho?")) return;
    const { error } = await supabase.from("tamanhos").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    await loadTamanhos();
  };

  const handleSaveCategoria = async () => {
    if (!catNome.trim()) {
      toast({ title: "Informe o nome da categoria", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("categorias_produto")
      .insert({ nome: catNome.trim(), descricao: catDesc.trim() || null, ativo: true });
    if (error) {
      toast({ title: "Erro ao salvar categoria", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Categoria salva!" });
    setIsCategoriaDialogOpen(false);
    setCatNome(""); setCatDesc("");
    await loadCategorias();
  };

  const handleDeleteCategoria = async (id: UUID) => {
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categorias_produto").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    await loadCategorias();
  };

  const handleSaveUnidade = async () => {
    if (!uniNome.trim()) {
      toast({ title: "Informe o nome da unidade", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("unidades_medida").insert({ nome: uniNome.trim(), abreviacao: uniAbrev.trim() || null, ativo: true });
    if (error) {
      toast({ title: "Erro ao salvar unidade", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unidade salva!" });
    setIsUnidadeDialogOpen(false);
    setUniNome(""); setUniAbrev("");
    await loadUnidadesMedida();
  };

  const handleDeleteUnidade = async (id: UUID) => {
    if (!confirm("Excluir esta unidade?")) return;
    const { error } = await supabase.from("unidades_medida").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    await loadUnidadesMedida();
  };

  const handleSaveConfiguracoes = async () => {
    const row: Empresa = {
      id: "singleton",
      nome: eNome || null,
      cnpj: eCnpj || null,
      telefone: eTelefone || null,
      email: eEmail || null,
      endereco: eEndereco || null,
      cidade: eCidade || null,
      cep: eCep || null,
      whatsapp_vendas: eWhats || null,
    };
    const { error } = await supabase.from("empresa_config").upsert(row, { onConflict: "id" });
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: "Configurações salvas!" });
    await loadEmpresa();
  };

  /* --------- Filtros locais --------- */
  const filteredCores = useMemo(
    () => cores.filter((c) => c.nome.toLowerCase().includes(searchTerm.toLowerCase())),
    [cores, searchTerm]
  );

  const filteredTamanhos = useMemo(
    () =>
      tamanhos.filter(
        (t) =>
          t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.descricao || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [tamanhos, searchTerm]
  );

  const filteredCategorias = useMemo(
    () =>
      categorias.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.descricao || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [categorias, searchTerm]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-muted-foreground">Gerencie cores, tamanhos, categorias e dados da empresa</p>
        </div>
      </div>

      <Tabs defaultValue="cores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cores">Cores</TabsTrigger>
          <TabsTrigger value="tamanhos">Tamanhos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
        </TabsList>

        {/* ---------------------- CORES ---------------------- */}
        <TabsContent value="cores">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar cores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <Dialog open={isCorDialogOpen} onOpenChange={setIsCorDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Cor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Cor</DialogTitle>
                    <DialogDescription>Crie uma nova cor para usar nos produtos.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Nome da Cor</Label>
                      <Input value={corNome} onChange={(e) => setCorNome(e.target.value)} placeholder="Ex: Rosa Claro" />
                    </div>

                    <div>
                      <Label>Código da Cor (Hex)</Label>
                      <div className="flex gap-2">
                        <Input value={corHex} onChange={(e) => setCorHex(e.target.value)} placeholder="#ff69b4" />
                        <input type="color" value={corHex} onChange={(e) => setCorHex(e.target.value)} className="w-12 h-10 border rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCorDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveCor} className="bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                      Salvar Cor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple" />
                  Cores Disponíveis
                </CardTitle>
                <CardDescription>{filteredCores.length} cor(es) encontrada(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código Hex</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCores.map((cor) => (
                      <TableRow key={cor.id}>
                        <TableCell>
                          <div className="w-8 h-8 rounded border border-gray-300" style={{ backgroundColor: cor.hex_code }} />
                        </TableCell>
                        <TableCell className="font-medium">{cor.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{cor.hex_code}</TableCell>
                        <TableCell>
                          <Badge variant={cor.ativo ? "secondary" : "outline"}>{cor.ativo ? "Ativa" : "Inativa"}</Badge>
                        </TableCell>
                        <TableCell>{new Date(cor.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDeleteCor(cor.id)}>
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
          </div>
        </TabsContent>

        {/* ---------------------- TAMANHOS ---------------------- */}
        <TabsContent value="tamanhos">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar tamanhos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <Dialog open={isTamanhoDialogOpen} onOpenChange={setIsTamanhoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Tamanho
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Tamanho</DialogTitle>
                    <DialogDescription>Crie um novo tamanho para usar nos produtos.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome do Tamanho</Label>
                        <Input value={tamNome} onChange={(e) => setTamNome(e.target.value)} placeholder="Ex: XGG" />
                      </div>
                      <div>
                        <Label>Ordem</Label>
                        <Input type="number" value={tamOrdem} onChange={(e) => setTamOrdem(e.target.value === "" ? "" : Number(e.target.value))} placeholder="7" />
                      </div>
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Input value={tamDesc} onChange={(e) => setTamDesc(e.target.value)} placeholder="Ex: Extra Extra Grande" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsTamanhoDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveTamanho} className="bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                      Salvar Tamanho
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-purple" />
                  Tamanhos Disponíveis
                </CardTitle>
                <CardDescription>{filteredTamanhos.length} tamanho(s) encontrado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTamanhos.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline">{t.ordem ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>{t.descricao ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={t.ativo ? "secondary" : "outline"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDeleteTamanho(t.id)}>
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
          </div>
        </TabsContent>

        {/* ---------------------- CATEGORIAS ---------------------- */}
        <TabsContent value="categorias">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar categorias..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <Dialog open={isCategoriaDialogOpen} onOpenChange={setIsCategoriaDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                    <DialogDescription>Crie uma nova categoria para organizar os produtos.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Nome da Categoria</Label>
                      <Input value={catNome} onChange={(e) => setCatNome(e.target.value)} placeholder="Ex: Pijama" />
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Ex: Pijamas e camisolas" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCategoriaDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveCategoria} className="bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                      Salvar Categoria
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple" />
                  Categorias de Produtos
                </CardTitle>
                <CardDescription>{filteredCategorias.length} categoria(s) encontrada(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Produtos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategorias.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.descricao ?? "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{c.qtde_produtos ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.ativo ? "secondary" : "outline"}>{c.ativo ? "Ativa" : "Inativa"}</Badge>
                        </TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDeleteCategoria(c.id)}>
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
          </div>
        </TabsContent>

        {/* ---------------------- UNIDADES + INSUMOS ---------------------- */}
        <TabsContent value="unidades">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar unidades..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <Dialog open={isUnidadeDialogOpen} onOpenChange={setIsUnidadeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple to-pink text-white border-0 hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Unidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Unidade de Medida</DialogTitle>
                    <DialogDescription>Crie uma nova unidade de medida para usar nos insumos.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Unidade</Label>
                        <Input value={uniNome} onChange={(e) => setUniNome(e.target.value)} placeholder="Ex: Metro" />
                      </div>
                      <div>
                        <Label>Abreviação</Label>
                        <Input value={uniAbrev} onChange={(e) => setUniAbrev(e.target.value)} placeholder="Ex: m" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsUnidadeDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveUnidade} className="bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                      Salvar Unidade
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-purple" />
                  Unidades de Medida
                </CardTitle>
                <CardDescription>
                  {unidadesMedida.filter((u) => u.nome.toLowerCase().includes(searchTerm.toLowerCase())).length} unidade(s) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Abreviação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unidadesMedida
                      .filter((u) => u.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.nome}</TableCell>
                          <TableCell>{u.abreviacao ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={u.ativo ? "secondary" : "outline"}>{u.ativo ? "Ativa" : "Inativa"}</Badge>
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-center">
                              <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDeleteUnidade(u.id)}>
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

            {/* Lista de Insumos (somente leitura) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple" />
                  Insumos Cadastrados
                </CardTitle>
                <CardDescription>{insumos.length} insumo(s) cadastrado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insumos.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.nome}</TableCell>
                        <TableCell>{i.unidade_abrev ? `${i.unidade} (${i.unidade_abrev})` : i.unidade}</TableCell>
                        <TableCell>{brl(i.valor_unitario)}</TableCell>
                        <TableCell>
                          {i.quantidade_atual} {i.unidade_abrev || ""}
                        </TableCell>
                        <TableCell>{i.fornecedor || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={i.ativo ? "secondary" : "outline"}>{i.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------- EMPRESA ---------------------- */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Configure as informações da sua empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input id="nomeEmpresa" value={eNome} onChange={(e) => setENome(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" value={eCnpj} onChange={(e) => setECnpj(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={eTelefone} onChange={(e) => setETelefone(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={eEndereco} onChange={(e) => setEEndereco(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" value={eCidade} onChange={(e) => setECidade(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" value={eCep} onChange={(e) => setECep(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="whatsappVendas">WhatsApp para Vendas</Label>
                  <Input id="whatsappVendas" value={eWhats} onChange={(e) => setEWhats(e.target.value)} />
                  <p className="text-sm text-muted-foreground mt-1">Número usado para enviar notificações de vendas</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveConfiguracoes} className="bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
