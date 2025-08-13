import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const reset = () => {
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) {
      toast.error(error.message || 'Erro ao entrar');
      return;
    }
    
    toast.success('Login realizado com sucesso');
    reset();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    
    setLoading(false);
    
    if (error) {
      toast.error(error.message || 'Erro ao cadastrar');
      return;
    }
    
    toast.success('Cadastro iniciado. Verifique seu e-mail para confirmar.');
    setMode('login');
  };

  if (session) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </CardTitle>
          <p className="text-muted-foreground">
            {mode === 'login' 
              ? 'Acesse o gerenciador de apresentações'
              : 'Crie uma conta para começar'
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') 
                : (mode === 'login' ? 'Entrar' : 'Criar conta')
              }
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  reset();
                }}
              >
                {mode === 'login' ? 'Precisa de uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}