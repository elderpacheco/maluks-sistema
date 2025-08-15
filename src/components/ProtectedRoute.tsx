import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  /** Conteúdo que só deve renderizar se o usuário estiver autenticado */
  children?: ReactNode;
};

/**
 * Rota protegida: se não houver usuário logado, redireciona para /login.
 * Se houver `children`, renderiza-os; senão renderiza um <Outlet /> (para rotas aninhadas).
 */
export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Enquanto carrega o estado de auth (evita flicker / redireciono indevido)
  if (loading) {
    return null; // pode trocar por um skeleton/spinner se quiser
  }

  // Sem usuário -> manda pro login e guarda origem
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Autenticado
  return children ?? <Outlet />;
}
