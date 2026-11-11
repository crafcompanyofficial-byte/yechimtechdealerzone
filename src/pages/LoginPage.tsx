import { useEffect, useState, type FormEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/app/AuthLayout';
import { FormField } from '@/components/app/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { homeOf, useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.member?.role ?? null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (status === 'ready') navigate(from && from !== '/' ? from : homeOf(role), { replace: true });
  }, [status, role, from, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const message = await login(name, password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <AuthLayout title={t("Do'kon kabineti", 'Кабинет магазина')} description={t('Login va parolingizni kiriting', 'Введите логин и пароль')}>
      <form onSubmit={submit}>
        <FieldGroup>
          <FormField label={t('Login', 'Логин')} htmlFor="login-name">
            <Input id="login-name" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label={t('Parol', 'Пароль')} htmlFor="login-password">
            <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormField>
          {error ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner /> : null}
            {t('Kirish', 'Войти')}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
