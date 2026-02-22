import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>(
    location.pathname === '/auth/verify' ? 'verify' : 'login',
  );
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, verifyEmailOtp, resendVerification } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.pathname === '/auth/verify') {
      setMode('verify');
    }
  }, [location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = mode === 'login'
      ? await signIn(email, password)
      : mode === 'signup'
        ? await signUp(email, password)
        : await verifyEmailOtp(email, otp);

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else if (mode === 'signup') {
      toast({
        title: 'Conta criada!',
        description: 'Verifica o teu email e introduz o código para confirmar a conta.',
      });
      navigate(`/auth/verify?email=${encodeURIComponent(email)}`);
    } else if (mode === 'verify') {
      toast({
        title: 'Email verificado!',
        description: 'Conta confirmada com sucesso.',
      });
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Indica o email para reenviar o código de verificação.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await resendVerification(email.trim());
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao reenviar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Código reenviado',
      description: 'Verifica o teu email para obter um novo código.',
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-severity-high/10">
            <AlertTriangle className="h-6 w-6 text-severity-high" />
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Verificar Email'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Entra na tua conta para gerir reportes'
              : mode === 'signup'
                ? 'Cria uma conta para acompanhar os teus reportes'
                : 'Introduz o código de 6 dígitos enviado para o teu email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            {mode !== 'verify' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}
            {mode === 'verify' && (
              <div className="space-y-2">
                <Label htmlFor="otp">Código de verificação</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-9"
                    required
                    minLength={6}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A processar...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Verificar código'}
            </Button>
            {mode === 'verify' && (
              <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleResendVerification}>
                Reenviar código
              </Button>
            )}
          </form>
          <div className="mt-4 text-center text-sm">
            {mode !== 'verify' ? (
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary hover:underline"
              >
                {mode === 'login' ? 'Não tens conta? Cria uma' : 'Já tens conta? Entra'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode('login');
                  navigate('/auth');
                }}
                className="text-primary hover:underline"
              >
                Voltar ao login
              </button>
            )}
          </div>
          {mode !== 'verify' && (
            <div className="mt-2 text-center text-sm">
              <button
                onClick={() => {
                  setMode('verify');
                  navigate(email ? `/auth/verify?email=${encodeURIComponent(email)}` : '/auth/verify');
                }}
                className="text-primary hover:underline"
              >
                Já tenho código de verificação
              </button>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao mapa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
