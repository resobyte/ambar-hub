'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ConfirmModal } from '@/components/common/ConfirmModal';
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
      error('Failed to fetch shipping providers');
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
        success('Shipping provider updated successfully');
      } else {
        await createShippingProvider(currentFormData);
        success('Shipping provider created successfully');
      }

      setIsModalOpen(false);
      fetchShippingProviders();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  }, [editingProvider, fetchShippingProviders, success, error]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, name: newValue };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as 'ARAS';
    setFormData(prev => {
      const newData = { ...prev, type: newValue };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === 'Active';
    setFormData(prev => {
      const newData = { ...prev, isActive: newValue };
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

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProviderId) return;
    try {
      await deleteShippingProvider(deletingProviderId);
      success('Shipping provider deleted successfully');
      setIsDeleteModalOpen(false);
      fetchShippingProviders();
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  }, [deletingProviderId, fetchShippingProviders, success, error]);

  const modalTitle = useMemo(() =>
    editingProvider ? 'Edit Shipping Provider' : 'Add Shipping Provider',
    [editingProvider]
  );

  const submitButtonText = useMemo(() =>
    editingProvider ? 'Update' : 'Create',
    [editingProvider]
  );

  const columns = useMemo<Column<ShippingProvider>[]>(() => [
    { key: 'name', header: 'Name' },
    {
      key: 'type',
      header: 'Provider',
      render: (row: ShippingProvider) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
          {row.type}
        </span>
      ),
    },
    {
      key: 'integrationCount',
      header: 'Used by Integrations',
      render: (row: ShippingProvider) => <span>{row.integrationCount}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: ShippingProvider) => (
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
      header: 'Actions',
      align: 'right',
      shrink: true,
      render: (row: ShippingProvider) => (
        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
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
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={row.integrationCount > 0 ? 'Cannot delete: Used by integrations' : 'Delete'}
            disabled={row.integrationCount > 0}
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
      <div className="mb-4 flex justify-between items-center">
        {shippingProviders.length === 0 && !loading && (
          <p className="text-muted-foreground">Create shipping methods to use them in integrations.</p>
        )}
        <Button onClick={handleCreate}>
          <svg className="w-[18px] h-[18px] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Shipping
        </Button>
      </div>

      <Table
        columns={columns}
        data={shippingProviders}
        keyExtractor={keyExtractor}
        isLoading={loading}
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
            <Select
              label="Provider"
              value={formData.type}
              onChange={handleTypeChange}
              options={SHIPPING_TYPES}
              required
              disabled={!!editingProvider}
            />
            <Select
              label="Status"
              value={formData.isActive ? 'Active' : 'Passive'}
              onChange={handleIsActiveChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Passive', label: 'Passive' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2">
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
        title="Delete Shipping Provider"
        message="Are you sure you want to delete this shipping provider? This action cannot be undone."
      />
    </>
  );
}
