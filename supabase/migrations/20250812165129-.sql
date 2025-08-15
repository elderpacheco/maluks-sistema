-- Criar tabela para unidades de medida
CREATE TABLE public.unidades_medida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  abreviacao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir unidades de medida padrão
INSERT INTO public.unidades_medida (nome, abreviacao) VALUES 
  ('Metro', 'm'),
  ('Centímetro', 'cm'),
  ('Quilograma', 'kg'),
  ('Grama', 'g'),
  ('Litro', 'l'),
  ('Mililitro', 'ml'),
  ('Unidade', 'un'),
  ('Pacote', 'pct'),
  ('Rolo', 'rl'),
  ('Folha', 'fl');

-- Criar tabela para insumos
CREATE TABLE public.insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade_medida_id UUID NOT NULL REFERENCES public.unidades_medida(id),
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir alguns insumos de exemplo
INSERT INTO public.insumos (nome, unidade_medida_id, preco_unitario, estoque_atual, estoque_minimo, fornecedor) 
SELECT 
  'Lycra Estampada', um.id, 18.50, 50.0, 10.0, 'Fornecedor A'
FROM public.unidades_medida um WHERE um.abreviacao = 'm'
UNION ALL
SELECT 
  'Elástico 15mm', um.id, 3.20, 100.0, 20.0, 'Fornecedor B'
FROM public.unidades_medida um WHERE um.abreviacao = 'm'
UNION ALL
SELECT 
  'Linha de Costura', um.id, 4.50, 25.0, 5.0, 'Fornecedor C'
FROM public.unidades_medida um WHERE um.abreviacao = 'rl'
UNION ALL
SELECT 
  'Enchimento Fibra', um.id, 12.00, 10.0, 2.0, 'Fornecedor D'
FROM public.unidades_medida um WHERE um.abreviacao = 'kg';

-- Habilitar RLS
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Allow all operations on unidades_medida" 
ON public.unidades_medida 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on insumos" 
ON public.insumos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_unidades_medida_updated_at
  BEFORE UPDATE ON public.unidades_medida
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insumos_updated_at
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();