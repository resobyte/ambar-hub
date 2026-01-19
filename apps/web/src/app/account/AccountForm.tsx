'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { apiPatch } from '@/lib/api';
import { AuthUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2 } from 'lucide-react';

interface AccountFormProps {
  user: AuthUser;
}

export function AccountForm({ user }: AccountFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Profile State
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isPending, startTransition] = useTransition();
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const isProfileChanged =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    email !== user.email;

  const isPasswordValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileConfirmOpen(true);
  };

  const handleProfileConfirm = async () => {
    setProfileConfirmOpen(false);
    startTransition(async () => {
      try {
        await apiPatch(`/users/${user.id}`, {
          firstName,
          lastName,
          email,
        });
        toast({ title: 'Başarılı', description: 'Profil başarıyla güncellendi', variant: 'success' });
        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: error instanceof Error ? error.message : 'Profil güncellenemedi'
        });
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Şifreler eşleşmiyor' });
      return;
    }

    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Şifre en az 8 karakter olmalıdır' });
      return;
    }

    setPasswordConfirmOpen(true);
  };

  const handlePasswordConfirm = async () => {
    setPasswordConfirmOpen(false);
    startTransition(async () => {
      try {
        await apiPatch(`/users/${user.id}`, {
          password: newPassword,
        });
        toast({ title: 'Başarılı', description: 'Şifre başarıyla güncellendi', variant: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: error instanceof Error ? error.message : 'Şifre güncellenemedi'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Hesap Ayarları</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Profil Bilgileri</CardTitle>
          <CardDescription>Kişisel bilgilerinizi ve e-posta adresinizi güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || !isProfileChanged}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Profili Güncelle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifre Değiştir</CardTitle>
          <CardDescription>Hesap güvenliğiniz için şifrenizi güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Mevcut Şifre</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 8 karakter"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Yeni Şifreyi Onayla</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || !isPasswordValid}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={profileConfirmOpen} onOpenChange={setProfileConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profili Güncelle</AlertDialogTitle>
            <AlertDialogDescription>
              Profil bilgilerinizi güncellemek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleProfileConfirm}>Güncelle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={passwordConfirmOpen} onOpenChange={setPasswordConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şifre Değiştir</AlertDialogTitle>
            <AlertDialogDescription>
              Şifrenizi değiştirmek istediğinize emin misiniz? Bir sonraki girişinizde yeni şifreyi kullanmanız gerekecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordConfirm}>Şifre Değiştir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
