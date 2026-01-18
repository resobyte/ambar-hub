'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, Input, Select, Modal, Badge, DataTable, DataTableColumn } from '@/components/ui';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  storeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseFormData {
  name: string;
  address?: string;
  isActive: boolean;
}

const keyExtractor = (item: Warehouse) => item.id;

export function WarehousesTable() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({ name: '', address: '', isActive: true });
  const [initialFormData, setInitialFormData] = useState<WarehouseFormData>({ name: '', address: '', isActive: true });
  const formDataRef = useRef(formData);
  const { success, error } = useToast();

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWarehouses(page, 10);
      setWarehouses(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      error('Depolar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, error]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleCreate = useCallback(() => {
    setEditingWarehouse(null);
    const newData = { name: '', address: '', isActive: true };
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

  const handleEdit = useCallback((warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    const newData = { name: warehouse.name, address: warehouse.address || '', isActive: warehouse.isActive };
    setFormData(newData);
    setInitialFormData(newData);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingWarehouseId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, currentFormData);
        success('Depo başarıyla güncellendi');
      } else {
        await createWarehouse(currentFormData);
        success('Depo başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      error(err.message || 'İşlem başarısız');
    }
  }, [editingWarehouse, fetchWarehouses, success, error]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingWarehouseId) return;
    try {
      await deleteWarehouse(deletingWarehouseId);
      success('Depo başarıyla silindi');
      setIsDeleteModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      error(err.message || 'Silme işlemi başarısız');
    }
  }, [deletingWarehouseId, fetchWarehouses, success, error]);

  const updateFormField = useCallback(<K extends keyof WarehouseFormData>(
    field: K,
    value: WarehouseFormData[K]
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
    return isFormValid && (isFormDirty || !editingWarehouse);
  }, [isFormValid, isFormDirty, editingWarehouse]);

  const modalTitle = useMemo(() =>
    editingWarehouse ? 'Depo Düzenle' : 'Depo Ekle',
    [editingWarehouse]
  );

  const submitButtonText = useMemo(() =>
    editingWarehouse ? 'Güncelle' : 'Oluştur',
    [editingWarehouse]
  );

  const columns = useMemo<DataTableColumn<Warehouse>[]>(() => [
    { key: 'name', header: 'Ad', sortable: true },
    {
      key: 'storeCount',
      header: 'Mağazalar',
      render: (row: Warehouse) => (
        <span className="text-muted-foreground">{row.storeCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (row: Warehouse) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      shrink: true,
      render: (row: Warehouse) => (
        <div className="flex items-center justify-end space-x-1">
          <Button
            variant="ghost"
            size="sm"
            icon="edit"
            onClick={() => handleEdit(row)}
            title="Düzenle"
          />
          <Button
            variant="danger"
            kind="text"
            size="sm"
            icon="delete"
            onClick={() => handleDelete(row.id)}
            disabled={row.storeCount > 0}
            title={row.storeCount > 0 ? 'Silinemez: Bağlı mağazalar var' : 'Sil'}
          />
        </div>
      ),
    },
  ], [handleEdit, handleDelete]);

  const pagination = useMemo(() => ({
    page,
    limit: 10,
    total,
    totalPages: Math.ceil(total / 10),
  }), [page, total]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Depolar</h2>
          <p className="text-sm text-muted-foreground mt-1">Envanteriniz için depolama konumlarını yönetin</p>
        </div>
        <Button onClick={handleCreate} icon="plus">
          Depo Ekle
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={warehouses}
        keyExtractor={keyExtractor}
        isLoading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="Henüz depo yok. Başlamak için ilk deponuzu oluşturun."
      />


      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="medium">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ad"
            value={formData.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            required
            placeholder="Depo adı girin"
          />
          <Input
            label="Adres"
            value={formData.address}
            onChange={(e) => updateFormField('address', e.target.value)}
            placeholder="Depo adresi girin (opsiyonel)"
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
            <Button type="button" variant="secondary" onClick={handleModalClose}>
              İptal
            </Button>
            <Button type="submit" disabled={!canSubmit}>{submitButtonText}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        title="Depo Sil"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Bu depoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleDeleteModalClose}>
              İptal
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
