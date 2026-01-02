'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDefaultRouteByRole } from '@/config/routes';
import { useToast } from '@/components/common/ToastContext';
import { Button, Input } from '@/components/common';

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const toast = useToast();

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
        toast.error(result.error || 'Login failed');
        setIsPending(false);
        return;
      }

      if (result.user) {
        toast.success('Login successful');
        const redirectUrl = callbackUrl || getDefaultRouteByRole(result.user.role);
        window.location.href = redirectUrl;
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setIsPending(false);
    }
  };

  const emailIcon = (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const passwordIcon = (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        type="email"
        label="Email Address"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
        placeholder="admin@example.com"
        icon={emailIcon}
      />

      <Input
        type="password"
        label="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isPending}
        placeholder="••••••••"
        icon={passwordIcon}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center text-muted-foreground cursor-pointer">
          <input type="checkbox" className="mr-2 rounded border-input text-primary focus:ring-primary" />
          Remember me
        </label>
        <a href="#" className="text-primary hover:text-primary-dark font-medium transition-colors">Forgot password?</a>
      </div>

      <Button
        type="submit"
        disabled={isPending || !email || !password}
        isLoading={isPending}
        className="w-full py-3"
      >
        Sign In
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account? <a href="#" className="text-primary font-medium hover:underline">Contact Support</a>
      </div>
    </form>
  );
}
