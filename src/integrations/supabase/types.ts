export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes_interessados: {
        Row: {
          avisado: boolean
          cor: string
          data_pedido: string
          id: string
          nome: string
          produto_id: string
          tamanho: string
          telefone: string
        }
        Insert: {
          avisado?: boolean
          cor: string
          data_pedido?: string
          id?: string
          nome: string
          produto_id: string
          tamanho: string
          telefone: string
        }
        Update: {
          avisado?: boolean
          cor?: string
          data_pedido?: string
          id?: string
          nome?: string
          produto_id?: string
          tamanho?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_interessados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_interessados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          data_devolucao: string
          id: string
          motivo: string | null
          nota_id: string
          produto_id: string
          quantidade_devolvida: number
          tamanho: string
        }
        Insert: {
          data_devolucao?: string
          id?: string
          motivo?: string | null
          nota_id: string
          produto_id: string
          quantidade_devolvida: number
          tamanho: string
        }
        Update: {
          data_devolucao?: string
          id?: string
          motivo?: string | null
          nota_id?: string
          produto_id?: string
          quantidade_devolvida?: number
          tamanho?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          cor: string | null
          created_at: string | null
          estoque_fabrica: number | null
          estoque_loja: number | null
          estoque_minimo: number
          id: string
          produto_id: string | null
          quantidade_atual: number
          quantidade_fabrica: number | null
          quantidade_loja: number
          tamanho: string | null
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          estoque_fabrica?: number | null
          estoque_loja?: number | null
          estoque_minimo?: number
          id?: string
          produto_id?: string | null
          quantidade_atual?: number
          quantidade_fabrica?: number | null
          quantidade_loja?: number
          tamanho?: string | null
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          estoque_fabrica?: number | null
          estoque_loja?: number | null
          estoque_minimo?: number
          id?: string
          produto_id?: string | null
          quantidade_atual?: number
          quantidade_fabrica?: number | null
          quantidade_loja?: number
          tamanho?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_produto_fk"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_fk"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produtos_fk"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produtos_fk"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          preco_unitario: number
          unidade_medida_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          preco_unitario?: number
          unidade_medida_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          preco_unitario?: number
          unidade_medida_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_unidade_medida_id_fkey"
            columns: ["unidade_medida_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_nota: {
        Row: {
          id: string
          nota_id: string
          produto_id: string
          quantidade: number
          tamanho: string
          valor_total_item: number
          valor_unitario: number
        }
        Insert: {
          id?: string
          nota_id: string
          produto_id: string
          quantidade: number
          tamanho: string
          valor_total_item: number
          valor_unitario: number
        }
        Update: {
          id?: string
          nota_id?: string
          produto_id?: string
          quantidade?: number
          tamanho?: string
          valor_total_item?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nota_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nota_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nota_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda_direta: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          produto_id: string
          quantidade: number
          referencia: string
          tamanho: string
          valor_total: number
          valor_unitario: number
          venda_id: string
        }
        Insert: {
          cor: string
          created_at?: string
          id?: string
          nome: string
          produto_id: string
          quantidade: number
          referencia: string
          tamanho: string
          valor_total: number
          valor_unitario: number
          venda_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          produto_id?: string
          quantidade?: number
          referencia?: string
          tamanho?: string
          valor_total?: number
          valor_unitario?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_direta_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas_diretas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          data_criacao: string
          id: string
          numero_nota: number
          observacoes: string | null
          status: Database["public"]["Enums"]["nota_status"]
          updated_at: string
          valor_total: number
          vendedora_id: string
        }
        Insert: {
          data_criacao?: string
          id?: string
          numero_nota?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          updated_at?: string
          valor_total?: number
          vendedora_id: string
        }
        Update: {
          data_criacao?: string
          id?: string
          numero_nota?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          updated_at?: string
          valor_total?: number
          vendedora_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_vendedora_id_fkey"
            columns: ["vendedora_id"]
            isOneToOne: false
            referencedRelation: "vendedoras"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["produto_categoria"] | null
          cor: string | null
          created_at: string
          custo_producao: number
          descricao: string | null
          estoque_minimo: number
          id: string
          margem_lucro: number | null
          nome: string | null
          preco: number | null
          preco_venda: number
          referencia: string | null
          status: Database["public"]["Enums"]["produto_status"]
          tamanho: string | null
          tamanhos: string[] | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["produto_categoria"] | null
          cor?: string | null
          created_at?: string
          custo_producao?: number
          descricao?: string | null
          estoque_minimo?: number
          id?: string
          margem_lucro?: number | null
          nome?: string | null
          preco?: number | null
          preco_venda?: number
          referencia?: string | null
          status?: Database["public"]["Enums"]["produto_status"]
          tamanho?: string | null
          tamanhos?: string[] | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["produto_categoria"] | null
          cor?: string | null
          created_at?: string
          custo_producao?: number
          descricao?: string | null
          estoque_minimo?: number
          id?: string
          margem_lucro?: number | null
          nome?: string | null
          preco?: number | null
          preco_venda?: number
          referencia?: string | null
          status?: Database["public"]["Enums"]["produto_status"]
          tamanho?: string | null
          tamanhos?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          empresa: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          abreviacao: string
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          abreviacao: string
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          abreviacao?: string
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendas_diretas: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data_venda: string
          desconto: number | null
          forma_pagamento: string | null
          id: string
          numero_venda: number
          observacoes: string | null
          status: string
          updated_at: string
          valor_final: number
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_venda?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_final?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_venda?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_final?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diretas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedoras: {
        Row: {
          data_cadastro: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["vendedora_status"]
          telefone: string
          updated_at: string
        }
        Insert: {
          data_cadastro?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["vendedora_status"]
          telefone: string
          updated_at?: string
        }
        Update: {
          data_cadastro?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["vendedora_status"]
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_produtos_resumo: {
        Row: {
          ativo: boolean | null
          categoria: Database["public"]["Enums"]["produto_categoria"] | null
          cor: string | null
          custo_producao: number | null
          descricao: string | null
          id: string | null
          nome: string | null
          preco_venda: number | null
          referencia: string | null
          tamanho: string | null
          total_atual: number | null
          total_fabrica: number | null
          total_loja: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      nota_status: "aberta" | "fechada" | "cancelada"
      produto_categoria: "Sutiã" | "Calcinha" | "Conjunto" | "Outros"
      produto_status: "ativo" | "inativo"
      vendedora_status: "ativa" | "inativa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      nota_status: ["aberta", "fechada", "cancelada"],
      produto_categoria: ["Sutiã", "Calcinha", "Conjunto", "Outros"],
      produto_status: ["ativo", "inativo"],
      vendedora_status: ["ativa", "inativa"],
    },
  },
} as const
