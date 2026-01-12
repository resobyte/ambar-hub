'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ConfirmModal } from '@/components/common/ConfirmModal';
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
      error('Failed to fetch warehouses');
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
        success('Warehouse updated successfully');
      } else {
        await createWarehouse(currentFormData);
        success('Warehouse created successfully');
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  }, [editingWarehouse, fetchWarehouses, success, error]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingWarehouseId) return;
    try {
      await deleteWarehouse(deletingWarehouseId);
      success('Warehouse deleted successfully');
      setIsDeleteModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      error(err.message || 'Delete failed');
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
    editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse',
    [editingWarehouse]
  );

  const submitButtonText = useMemo(() =>
    editingWarehouse ? 'Update' : 'Create',
    [editingWarehouse]
  );

  const columns = useMemo<Column<Warehouse>[]>(() => [
    { key: 'name', header: 'Name' },
    {
      key: 'storeCount',
      header: 'Stores',
      render: (row: Warehouse) => (
        <span className="text-muted-foreground">{row.storeCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Warehouse) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          row.isActive
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {row.isActive ? 'Active' : 'Passive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      shrink: true,
      render: (row: Warehouse) => (
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
            disabled={row.storeCount > 0}
            title={row.storeCount > 0 ? 'Cannot delete: Has linked stores' : 'Delete'}
            className={`p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors ${
              row.storeCount > 0 ? 'opacity-50 cursor-not-allowed' : ''
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
          <h2 className="text-2xl font-semibold text-foreground">Warehouses</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage storage locations for your inventory</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Warehouse
        </Button>
      </div>

      <Table
        columns={columns}
        data={warehouses}
        keyExtractor={keyExtractor}
        isLoading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No warehouses yet. Create your first warehouse to get started."
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            required
            placeholder="Enter warehouse name"
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => updateFormField('address', e.target.value)}
            placeholder="Enter warehouse address (optional)"
          />
          <Select
            label="Status"
            value={formData.isActive ? 'Active' : 'Passive'}
            onChange={(e) => updateFormField('isActive', e.target.value === 'Active')}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Passive', label: 'Passive' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>{submitButtonText}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleConfirmDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone."
      />
    </>
  );
}
