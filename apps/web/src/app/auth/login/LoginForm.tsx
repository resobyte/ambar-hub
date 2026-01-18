'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDefaultRouteByRole } from '@/config/routes';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPending) return;

    setIsPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: result.error || 'Giriş başarısız',
        });
        setIsPending(false);
        return;
      }

      if (result.user) {
        toast({
          variant: "success",
          title: "Başarılı",
          description: 'Giriş başarılı',
        });
        const redirectUrl = callbackUrl || getDefaultRouteByRole(result.user.role);
        window.location.href = redirectUrl;
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
      });
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">E-posta Adresi</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          placeholder="ornek@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          type="password"
          showPasswordToggle
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending || !email || !password}
        className="w-full"
      >
        {isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </Button>
    </form>
  );
}


