import { AuthLayout } from '@/components/layouts/AuthLayout';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
