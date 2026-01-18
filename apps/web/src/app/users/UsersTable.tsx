'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal, Input, Select, DataTable, DataTableColumn, Button, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/common/ToastContext';
import { apiGetPaginated, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { User, Role, PaginationMeta, SortConfig } from '@/types';

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
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ sortBy: 'createdAt', sortOrder: 'DESC' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: Role.OPERATION,
    isActive: true,
  });
  const [initialFormData, setInitialFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: Role.OPERATION,
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const formDataRef = useRef(formData);

  // Stable callbacks for modal to prevent focus loss
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiGetPaginated<User>('/users', {
        params: {
          page: currentPage,
          limit: 10,
          sortBy: sortConfig.sortBy,
          sortOrder: sortConfig.sortOrder,
        },
      });
      setUsers(response.data);
      setPagination(response.meta);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, sortConfig]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const openCreateModal = useCallback(() => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: Role.OPERATION,
      isActive: true,
    });
    setInitialFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: Role.OPERATION,
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: User) => {
    setEditingUser(user);
    const newData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    };
    setFormData(newData);
    setInitialFormData(newData);
    setFormError('');
    setIsModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((user: User) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const currentFormData = formDataRef.current;
      if (editingUser) {
        const updateData: Partial<UserFormData> = { ...currentFormData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await apiPatch(`/users/${editingUser.id}`, updateData);
        toast.success('Kullanıcı başarıyla güncellendi');
      } else {
        await apiPost('/users', currentFormData);
        toast.success('Kullanıcı başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await apiDelete(`/users/${deletingUser.id}`);
      toast.success('Kullanıcı başarıyla silindi');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Silme işlemi başarısız';
      toast.error(errorMessage);
    }
  };

  const updateFormField = useCallback(<K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const isFormValid = useMemo(() => {
    return formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      formData.email.trim().length > 0 &&
      (editingUser || formData.password.trim().length > 0);
  }, [formData.firstName, formData.lastName, formData.email, formData.password, editingUser]);

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || !editingUser);
  }, [isFormValid, isFormDirty, editingUser]);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(lowerTerm) ||
      user.lastName.toLowerCase().includes(lowerTerm) ||
      user.email.toLowerCase().includes(lowerTerm) ||
      user.role.toLowerCase().includes(lowerTerm)
    );
  });

  const columns: DataTableColumn<User>[] = [
    {
      key: 'firstName',
      header: 'Kullanıcı',
      sortable: true,
      render: (user) => (
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm mr-3">
            {user.firstName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: (user) => (
        <span className="text-muted-foreground">{getRoleLabel(user.role)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      sortable: true,
      render: (user) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.isActive
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-muted text-muted-foreground border-border'
          }`}>
          {user.isActive ? 'Aktif' : 'Pasif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      shrink: true,
      render: (user) => (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => openEditModal(user)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => openDeleteModal(user)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const modalTitle = editingUser ? 'Kullanıcı Düzenle' : 'Kullanıcı Ekle';
  const submitButtonText = editingUser ? 'Güncelle' : 'Oluştur';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Kullanıcılar</h2>
          <p className="text-sm text-muted-foreground mt-1">Ekip erişimini ve izinlerini yönetin</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Kullanıcı Ekle
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-muted/20 text-sm"
          />
        </div>
      </div>

      <DataTable<User>
        columns={columns}
        data={filteredUsers}
        keyExtractor={(user) => user.id}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        emptyMessage="Kullanıcı bulunamadı. Başlamak için ilk ekip üyenizi ekleyin."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={modalTitle}
        size="md"
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ad"
              value={formData.firstName}
              onChange={(e) => updateFormField('firstName', e.target.value)}
              required
              placeholder="Ad"
            />
            <Input
              label="Soyad"
              value={formData.lastName}
              onChange={(e) => updateFormField('lastName', e.target.value)}
              required
              placeholder="Soyad"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormField('email', e.target.value)}
            required
            placeholder="john@example.com"
          />
          <Input
            label={editingUser ? 'Şifre (mevcut şifreyi korumak için boş bırakın)' : 'Şifre'}
            type="password"
            required={!editingUser}
            value={formData.password}
            onChange={(e) => updateFormField('password', e.target.value)}
            placeholder="••••••••"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rol"
              value={formData.role}
              onChange={(e) => updateFormField('role', e.target.value as Role)}
              options={ROLE_OPTIONS}
            />
            <Select
              label="Durum"
              value={formData.isActive ? 'Active' : 'Inactive'}
              onChange={(e) => updateFormField('isActive', e.target.value === 'Active')}
              options={[
                { value: 'Active', label: 'Aktif' },
                { value: 'Inactive', label: 'Pasif' },
              ]}
            />
          </div>
          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              İptal
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : submitButtonText}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleConfirmDelete}
        title="Kullanıcıyı Sil"
        message={deletingUser ? `${deletingUser.firstName} ${deletingUser.lastName} kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` : ''}
        confirmText="Sil"
        cancelText="İptal"
      />
    </div>
  );
}
