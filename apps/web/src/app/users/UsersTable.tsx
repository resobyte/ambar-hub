'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { User, Role } from '@/types';
import { apiGetPaginated, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useTableQuery } from '@/hooks/use-table-query';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2, Plus, Pencil, Trash2, Search, User as UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}

const ROLE_OPTIONS = [
  { value: Role.PLATFORM_OWNER, label: 'Platform Owner' },
  { value: Role.OPERATION, label: 'Operation' },
  { value: Role.MANAGER, label: 'Manager' },
  { value: Role.ACCOUNTING, label: 'Accounting' },
];

const getRoleLabel = (role: Role): string => {
  return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
};

export function UsersTable() {
  const { toast } = useToast();

  // Table Query Hook
  // Table Query Hook for URL state
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useTableQuery({
    defaultPageSize: 10,
  });

  // Local State for Data
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGetPaginated<User>('/users', {
        params: {
          page,
          limit: pageSize,
        }
      });
      setUsers(res.data);
      setTotalItems(res.meta.total);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Kullanıcılar yüklenemedi'
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, toast]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: Role.OPERATION,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: Role.OPERATION,
      isActive: true,
    });
    setEditingUser(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // Password not populated for security
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData: Partial<UserFormData> = { ...formData };
        if (!updateData.password) delete updateData.password;

        await apiPatch(`/users/${editingUser.id}`, updateData);
        toast({ title: 'Başarılı', description: 'Kullanıcı güncellendi', variant: 'success' });
      } else {
        await apiPost('/users', formData);
        toast({ title: 'Başarılı', description: 'Kullanıcı oluşturuldu', variant: 'success' });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'İşlem başarısız'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await apiDelete(`/users/${deletingUser.id}`);
      toast({ title: 'Başarılı', description: 'Kullanıcı silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'Silme işlemi başarısız'
      });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(user =>
      user.firstName.toLowerCase().includes(lower) ||
      user.lastName.toLowerCase().includes(lower) ||
      user.email.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Kullanıcılar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Kullanıcı Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {user.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{getRoleLabel(user.role)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={user.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{editingUser ? 'Şifre (Boş bırakılabilir)' : 'Şifre'}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '••••••••' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select
                  value={formData.isActive ? 'active' : 'passive'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="passive">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser && `${deletingUser.firstName} ${deletingUser.lastName} kullanıcısını silmek üzeresiniz. Bu işlem geri alınamaz.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
