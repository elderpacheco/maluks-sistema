import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [login, setLogin] = useState("");   // pode ser email ou username
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(login, senha);
    setLoading(false);

    if (error) {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    navigate("/dashboard"); // ajuste a rota de pós-login
  };

  // ... teu JSX do formulário, chamando onSubmit no form
}
