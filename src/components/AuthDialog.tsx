import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void;
}

export default function AuthDialog({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro ao entrar');
      return;
    }
    toast.success('Login realizado com sucesso');
    onAuthSuccess?.();
    onOpenChange(false);
    reset();
  };

  const handleSignup = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="off"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Precisa de uma conta?' : 'Já tem uma conta?'}
            </Button>
            {mode === 'login' ? (
              <Button onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            ) : (
              <Button onClick={handleSignup} disabled={loading}>
                {loading ? 'Enviando...' : 'Cadastrar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
