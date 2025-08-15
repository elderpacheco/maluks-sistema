import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const normalizeEmail = (v: string) => {
  const clean = v.trim();
  return clean.includes('@') ? clean : `${clean.toLowerCase()}@maluks.local`;
};

const Auth = () => {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState({
    usuarioOuEmail: '',   // pode ser email OU apelido
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    nome: '',
    usuarioOuEmail: '',   // pode ser email OU apelido
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const email = normalizeEmail(loginForm.usuarioOuEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginForm.password.trim(),
      });

      if (error) {
        setError("Usuário ou senha incorretos");
        toast({ title: "Erro ao fazer login", description: "Usuário ou senha incorretos", variant: "destructive" });
        return;
      }

      if (data.user) {
        toast({ title: "Login realizado!", description: "Bem-vindo ao sistema Maluks." });
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado');
      toast({ title: "Erro inesperado", description: "Ocorreu um erro ao tentar fazer login.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      const email = normalizeEmail(signupForm.usuarioOuEmail);

      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupForm.password.trim(),
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: signupForm.nome.trim(),
            usuario: signupForm.usuarioOuEmail.trim()
          }
        }
      });

      if (error) {
        setError(error.message);
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
        return;
      }

      if (data.user) {
        if (data.session) {
          toast({ title: "Conta criada!", description: "Sua conta foi criada com sucesso." });
          navigate('/');
        } else {
          toast({ title: "Verifique seu email", description: "Enviamos um link de confirmação para seu email." });
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado');
      toast({ title: "Erro inesperado", description: "Ocorreu um erro ao tentar criar a conta.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple/10 via-pink/5 to-purple/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
            Maluks Moda Íntima
          </CardTitle>
          <CardDescription>Sistema de Gestão - Entre em sua conta</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-usuario">Usuário ou e-mail</Label>
                  <Input
                    id="login-usuario"
                    type="text"
                    placeholder="seuemail@dominio.com ou apelido"
                    value={loginForm.usuarioOuEmail}
                    onChange={(e) => setLoginForm({ ...loginForm, usuarioOuEmail: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome</Label>
                  <Input
                    id="signup-nome"
                    type="text"
                    placeholder="Seu nome"
                    value={signupForm.nome}
                    onChange={(e) => setSignupForm({ ...signupForm, nome: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-usuario">E-mail ou usuário</Label>
                  <Input
                    id="signup-usuario"
                    type="text"
                    placeholder="seuemail@dominio.com ou apelido"
                    value={signupForm.usuarioOuEmail}
                    onChange={(e) => setSignupForm({ ...signupForm, usuarioOuEmail: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-gradient-to-r from-purple to-pink text-white" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
