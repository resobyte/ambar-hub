'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getWarehouses,
} from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';

interface Store {
  id: string;
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StoreFormData {
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
}

const keyExtractor = (item: Store) => item.id;

export function StoresTable() {
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({ name: '', proxyUrl: '', warehouseId: '', isActive: true });
  const [initialFormData, setInitialFormData] = useState<StoreFormData>({ name: '', proxyUrl: '', warehouseId: '', isActive: true });
  const formDataRef = useRef(formData);
  const { success, error } = useToast();

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStores(page, 10);
      setStores(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      error('Mağazalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, error]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await getWarehouses(1, 100);
      setWarehouses(response.data);
    } catch (err) {
      error('Depolar yüklenemedi');
    }
  }, [error]);

  useEffect(() => {
    fetchStores();
    fetchWarehouses();
  }, [fetchStores, fetchWarehouses]);

  const handleCreate = useCallback(() => {
    setEditingStore(null);
    const newData = { name: '', proxyUrl: '', warehouseId: '', isActive: true };
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

  const handleEdit = useCallback((store: Store) => {
    setEditingStore(store);
    const newData = { name: store.name, proxyUrl: store.proxyUrl, warehouseId: store.warehouseId, isActive: store.isActive };
    setFormData(newData);
    setInitialFormData(newData);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingStoreId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      if (editingStore) {
        await updateStore(editingStore.id, currentFormData);
        success('Mağaza başarıyla güncellendi');
      } else {
        await createStore(currentFormData);
        success('Mağaza başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (err: any) {
      error(err.message || 'İşlem başarısız');
    }
  }, [editingStore, fetchStores, success, error]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingStoreId) return;
    try {
      await deleteStore(deletingStoreId);
      success('Mağaza başarıyla silindi');
      setIsDeleteModalOpen(false);
      fetchStores();
    } catch (err: any) {
      error(err.message || 'Silme işlemi başarısız');
    }
  }, [deletingStoreId, fetchStores, success, error]);

  const updateFormField = useCallback(<K extends keyof StoreFormData>(
    field: K,
    value: StoreFormData[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0 && formData.proxyUrl.trim().length > 0 && formData.warehouseId.length > 0;
  }, [formData.name, formData.proxyUrl, formData.warehouseId]);

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || !editingStore);
  }, [isFormValid, isFormDirty, editingStore]);

  const modalTitle = useMemo(() =>
    editingStore ? 'Mağaza Düzenle' : 'Mağaza Ekle',
    [editingStore]
  );

  const submitButtonText = useMemo(() =>
    editingStore ? 'Güncelle' : 'Oluştur',
    [editingStore]
  );

  const getWarehouseName = useCallback((warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse?.name || 'Bilinmiyor';
  }, [warehouses]);

  const columns = useMemo<Column<Store>[]>(() => [
    { key: 'name', header: 'Ad' },
    {
      key: 'warehouseId',
      header: 'Depo',
      render: (row: Store) => (
        <span className="text-muted-foreground">{getWarehouseName(row.warehouseId)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (row: Store) => (
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
      render: (row: Store) => (
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
  ], [getWarehouseName, handleEdit, handleDelete]);

  const pagination = useMemo(() => ({
    page,
    limit: 10,
    total,
    totalPages: Math.ceil(total / 10),
  }), [page, total]);

  const warehouseOptions = useMemo(() =>
    (warehouses || []).map((w) => ({ value: w.id, label: w.name })),
    [warehouses]
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Mağazalar</h2>
          <p className="text-sm text-muted-foreground mt-1">Satış kanallarınızı ve pazaryerlerinizi yönetin</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Mağaza Ekle
        </Button>
      </div>

      <Table
        columns={columns}
        data={stores}
        keyExtractor={keyExtractor}
        isLoading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="Henüz mağaza yok. Başlamak için ilk pazaryerinizi bağlayın."
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ad"
            value={formData.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            required
            placeholder="Mağaza adı girin"
          />
          <Input
            label="Proxy URL"
            value={formData.proxyUrl}
            onChange={(e) => updateFormField('proxyUrl', e.target.value)}
            type="url"
            required
            placeholder="https://example.com"
          />
          <Select
            label="Depo"
            value={formData.warehouseId}
            onChange={(e) => updateFormField('warehouseId', e.target.value)}
            options={warehouseOptions}
            required
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
        title="Mağaza Sil"
        message="Bu mağazayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </>
  );
}
