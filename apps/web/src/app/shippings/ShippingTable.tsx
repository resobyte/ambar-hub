'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui';
import { DataTable, DataTableColumn } from '@/components/ui';
import { Modal } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select } from '@/components/ui';
import { ConfirmModal } from '@/components/ui';
import {
  getShippingProviders,
  createShippingProvider,
  updateShippingProvider,
  deleteShippingProvider,
} from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';

interface ShippingProvider {
  id: string;
  name: string;
  type: 'ARAS';
  isActive: boolean;
  integrationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ShippingFormData {
  name: string;
  type: 'ARAS';
  isActive: boolean;
}

const keyExtractor = (item: ShippingProvider) => item.id;

const SHIPPING_TYPES = [
  { value: 'ARAS', label: 'ARAS' },
];

export function ShippingTable() {
  const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ShippingProvider | null>(null);
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShippingFormData>({
    name: '',
    type: 'ARAS',
    isActive: true,
  });
  const [initialFormData, setInitialFormData] = useState<ShippingFormData>({
    name: '',
    type: 'ARAS',
    isActive: true,
  });
  const formDataRef = useRef(formData);
  const { success, error } = useToast();

  const fetchShippingProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShippingProviders();
      setShippingProviders(data);
    } catch (err) {
      error('Kargo firmaları yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchShippingProviders();
  }, [fetchShippingProviders]);

  const handleCreate = useCallback(() => {
    setEditingProvider(null);
    const newData = { name: '', type: 'ARAS' as const, isActive: true };
    setFormData(newData);
    setInitialFormData(newData);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleEdit = useCallback((provider: ShippingProvider) => {
    setEditingProvider(provider);
    const newData = {
      name: provider.name,
      type: provider.type,
      isActive: provider.isActive,
    };
    setFormData(newData);
    setInitialFormData(newData);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingProviderId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      if (editingProvider) {
        await updateShippingProvider(editingProvider.id, {
          name: currentFormData.name,
          isActive: currentFormData.isActive,
        });
        success('Kargo firması başarıyla güncellendi');
      } else {
        await createShippingProvider(currentFormData);
        success('Kargo firması başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      fetchShippingProviders();
    } catch (err: any) {
      error(err.message || 'İşlem başarısız');
    }
  }, [editingProvider, fetchShippingProviders, success, error]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProviderId) return;
    try {
      await deleteShippingProvider(deletingProviderId);
      success('Kargo firması başarıyla silindi');
      setIsDeleteModalOpen(false);
      fetchShippingProviders();
    } catch (err: any) {
      error(err.message || 'Silme işlemi başarısız');
    }
  }, [deletingProviderId, fetchShippingProviders, success, error]);

  const updateFormField = useCallback(<K extends keyof ShippingFormData>(
    field: K,
    value: ShippingFormData[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0;
  }, [formData.name]);

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || !editingProvider);
  }, [isFormValid, isFormDirty, editingProvider]);

  const modalTitle = useMemo(() =>
    editingProvider ? 'Kargo Firması Düzenle' : 'Kargo Firması Ekle',
    [editingProvider]
  );

  const submitButtonText = useMemo(() =>
    editingProvider ? 'Güncelle' : 'Oluştur',
    [editingProvider]
  );

  const columns = useMemo<DataTableColumn<ShippingProvider>[]>(() => [
    { key: 'name', header: 'Ad' },
    {
      key: 'type',
      header: 'Sağlayıcı',
      render: (row: ShippingProvider) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
          {row.type}
        </span>
      ),
    },
    {
      key: 'integrationCount',
      header: 'Kullanım',
      render: (row: ShippingProvider) => (
        <span className="text-muted-foreground">{row.integrationCount} {row.integrationCount === 1 ? 'entegrasyon' : 'entegrasyon'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (row: ShippingProvider) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.isActive
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-muted text-muted-foreground border-border'
          }`}>
          {row.isActive ? 'Aktif' : 'Pasif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      shrink: true,
      render: (row: ShippingProvider) => (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={row.integrationCount > 0}
            title={row.integrationCount > 0 ? 'Silinemez: Entegrasyonlar tarafından kullanılıyor' : 'Sil'}
            className={`p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors ${row.integrationCount > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ], [handleEdit, handleDelete]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Kargo Firmaları</h2>
          <p className="text-sm text-muted-foreground mt-1">Sipariş gönderimi için kargo firmalarını yönetin</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Kargo Ekle
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={shippingProviders}
        keyExtractor={keyExtractor}
        isLoading={loading}
        emptyMessage="Henüz kargo firması yok. Başlamak için ilk firmanızı ekleyin."
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ad"
            value={formData.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            required
            placeholder="Firma adı girin"
          />
          <Select
            label="Sağlayıcı Tipi"
            value={formData.type}
            onChange={(e) => updateFormField('type', e.target.value as ShippingFormData['type'])}
            options={SHIPPING_TYPES}
            required
            disabled={!!editingProvider}
          />
          <Select
            label="Durum"
            value={formData.isActive ? 'Active' : 'Passive'}
            onChange={(e) => updateFormField('isActive', e.target.value === 'Active')}
            options={[
              { value: 'Active', label: 'Aktif' },
              { value: 'Passive', label: 'Pasif' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              İptal
            </Button>
            <Button type="submit" disabled={!canSubmit}>{submitButtonText}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleConfirmDelete}
        title="Kargo Firmasını Sil"
        message="Bu kargo firmasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </>
  );
}
