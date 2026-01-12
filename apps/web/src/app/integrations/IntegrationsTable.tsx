'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrationStores,
  createIntegrationStore,
  updateIntegrationStore,
  deleteIntegrationStore,
  getStores,
  getActiveShippingProviders,
} from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { IntegrationStoreList } from '@/components/integrations/IntegrationStoreList';

interface Integration {
  id: string;
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
  storeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationStore {
  id: string;
  integrationId: string;
  storeId: string;
  storeName?: string;
  shippingProviderId: string | null;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  name: string;
}

interface ShippingProvider {
  id: string;
  name: string;
  type: 'ARAS';
  isActive: boolean;
}

interface IntegrationFormData {
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
}

interface StoreConfigData {
  storeId: string;
  shippingProviderId: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
}

const keyExtractor = (item: Integration) => item.id;

const INTEGRATION_TYPES = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'IKAS', label: 'Ikas' },
];

const DEFAULT_STORE_CONFIG: Omit<StoreConfigData, 'storeId' | 'shippingProviderId' | 'sellerId' | 'apiKey' | 'apiSecret'> = {
  crawlIntervalMinutes: 60,
  sendStock: true,
  sendPrice: true,
  sendOrderStatus: true,
  isActive: true,
};

export function IntegrationsTable() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
  const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [deletingIntegrationId, setDeletingIntegrationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: '',
    type: 'TRENDYOL',
    apiUrl: '',
    isActive: true,
  });
  const [initialFormData, setInitialFormData] = useState<IntegrationFormData>({
    name: '',
    type: 'TRENDYOL',
    apiUrl: '',
    isActive: true,
  });
  const [initialStoreConfigs, setInitialStoreConfigs] = useState<Map<string, StoreConfigData>>(new Map());
  const [initialSelectedStoreIds, setInitialSelectedStoreIds] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeConfigs, setStoreConfigs] = useState<Map<string, StoreConfigData>>(new Map());
  const formDataRef = useRef(formData);
  const { success, error } = useToast();

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getIntegrations(page, 10);
      setIntegrations(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      error('Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  }, [page, error]);

  const fetchStores = useCallback(async () => {
    try {
      const response = await getStores(1, 100);
      setStores(response.data);
    } catch (err) {
      error('Failed to fetch stores');
    }
  }, [error]);

  const fetchIntegrationStores = useCallback(async () => {
    try {
      const data = await getIntegrationStores();
      setIntegrationStores(data);
    } catch (err) {
      error('Failed to fetch integration stores');
    }
  }, [error]);

  const fetchShippingProviders = useCallback(async () => {
    try {
      const data = await getActiveShippingProviders();
      setShippingProviders(data);
    } catch (err) {
      error('Failed to fetch shipping providers');
    }
  }, [error]);

  useEffect(() => {
    fetchIntegrations();
    fetchStores();
    fetchIntegrationStores();
    fetchShippingProviders();
  }, [fetchIntegrations, fetchStores, fetchIntegrationStores, fetchShippingProviders]);

  const handleCreate = useCallback(() => {
    setEditingIntegration(null);
    const newData = {
      name: '',
      type: 'TRENDYOL' as const,
      apiUrl: '',
      isActive: true,
    };
    setFormData(newData);
    setInitialFormData(newData);
    setSelectedStoreIds([]);
    setInitialSelectedStoreIds([]);
    setStoreConfigs(new Map());
    setInitialStoreConfigs(new Map());
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleEdit = useCallback((integration: Integration) => {
    setEditingIntegration(integration);
    const newData = {
      name: integration.name,
      type: integration.type,
      apiUrl: integration.apiUrl,
      isActive: integration.isActive,
    };
    setFormData(newData);
    setInitialFormData(newData);

    const existingConfigs = integrationStores.filter(is => is && is.integrationId === integration.id);
    const storeIds = existingConfigs.map(is => is.storeId);
    setSelectedStoreIds(storeIds);

    const configsMap = new Map<string, StoreConfigData>();
    existingConfigs.forEach(is => {
      configsMap.set(is.storeId, {
        storeId: is.storeId,
        shippingProviderId: is.shippingProviderId || '',
        sellerId: is.sellerId,
        apiKey: is.apiKey,
        apiSecret: is.apiSecret,
        crawlIntervalMinutes: is.crawlIntervalMinutes,
        sendStock: is.sendStock,
        sendPrice: is.sendPrice,
        sendOrderStatus: is.sendOrderStatus,
        isActive: is.isActive,
      });
    });
    setStoreConfigs(configsMap);
    setInitialStoreConfigs(new Map(configsMap));
    setInitialSelectedStoreIds([...storeIds]);

    setIsModalOpen(true);
  }, [integrationStores]);

  const handleDelete = useCallback((id: string) => {
    setDeletingIntegrationId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      let integrationId: string;

      if (editingIntegration) {
        const updated = await updateIntegration(editingIntegration.id, currentFormData);
        integrationId = updated.data.id;
        success('Integration updated successfully');
      } else {
        const created = await createIntegration(currentFormData);
        integrationId = created.data.id;
        success('Integration created successfully');
      }

      const existingConfigs = integrationStores.filter(is => is && is.integrationId === (editingIntegration?.id || integrationId));
      const existingStoreIds = new Set(existingConfigs.map(is => is.storeId));

      for (const storeId of selectedStoreIds) {
        const config = storeConfigs.get(storeId);
        if (!config) continue;

        const existingConfig = existingConfigs.find(is => is.storeId === storeId);
        if (existingConfig) {
          await updateIntegrationStore(existingConfig.id, {
            shippingProviderId: config.shippingProviderId || undefined,
            sellerId: config.sellerId,
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            crawlIntervalMinutes: config.crawlIntervalMinutes,
            sendStock: config.sendStock,
            sendPrice: config.sendPrice,
            sendOrderStatus: config.sendOrderStatus,
            isActive: config.isActive,
          });
        } else {
          await createIntegrationStore({
            integrationId,
            storeId,
            shippingProviderId: config.shippingProviderId || undefined,
            sellerId: config.sellerId,
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            crawlIntervalMinutes: config.crawlIntervalMinutes,
            sendStock: config.sendStock,
            sendPrice: config.sendPrice,
            sendOrderStatus: config.sendOrderStatus,
            isActive: config.isActive,
          });
        }
        existingStoreIds.delete(storeId);
      }

      const storeIdsToRemove = Array.from(existingStoreIds);
      for (const storeId of storeIdsToRemove) {
        const configToRemove = existingConfigs.find(is => is.storeId === storeId);
        if (configToRemove) {
          await deleteIntegrationStore(configToRemove.id);
        }
      }

      setIsModalOpen(false);
      fetchIntegrations();
      fetchIntegrationStores();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  }, [editingIntegration, selectedStoreIds, storeConfigs, integrationStores, fetchIntegrations, fetchIntegrationStores, success, error]);

  const updateFormField = useCallback(<K extends keyof IntegrationFormData>(
    field: K,
    value: IntegrationFormData[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  const handleStoreSelectionChange = useCallback((storeId: string, selected: boolean) => {
    setSelectedStoreIds(prev => {
      const newSelection = selected
        ? [...prev, storeId]
        : prev.filter(id => id !== storeId);

      if (selected && !storeConfigs.has(storeId)) {
        setStoreConfigs(prev => new Map(prev).set(storeId, {
          ...DEFAULT_STORE_CONFIG,
          storeId,
          shippingProviderId: '',
          sellerId: '',
          apiKey: '',
          apiSecret: '',
        }));
      }

      return newSelection;
    });
  }, [storeConfigs]);

  const updateStoreConfig = useCallback(<K extends keyof Omit<StoreConfigData, 'storeId'>>(
    storeId: string,
    field: K,
    value: StoreConfigData[K]
  ) => {
    setStoreConfigs(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(storeId) || {
        ...DEFAULT_STORE_CONFIG,
        storeId,
        shippingProviderId: '',
        sellerId: '',
        apiKey: '',
        apiSecret: '',
      };
      newMap.set(storeId, { ...current, [field]: value });
      return newMap;
    });
  }, []);

  const connectedStoreIds = useMemo(() => {
    if (!editingIntegration) return [];
    return integrationStores
      .filter(is => is && is.integrationId === editingIntegration.id)
      .map(is => is.storeId);
  }, [integrationStores, editingIntegration]);

  const conflictingStoreIds = useMemo(() => {
    const currentType = formData.type;
    const currentIntegrationId = editingIntegration?.id;

    const sameTypeStoreIds = integrationStores
      .filter(is => {
        if (!is) return false;
        const integration = integrations.find(i => i.id === is.integrationId);
        return integration && integration.type === currentType && integration.id !== currentIntegrationId;
      })
      .map(is => is.storeId);

    return sameTypeStoreIds;
  }, [integrationStores, integrations, formData.type, editingIntegration]);

  const isFormValid = useMemo(() => {
    const integrationValid = formData.name.trim().length > 0 &&
      formData.apiUrl.trim().length > 0;

    const storeIdsToValidate = editingIntegration
      ? Array.from(new Set([...selectedStoreIds, ...connectedStoreIds]))
      : selectedStoreIds;

    const storeConfigsValid = storeIdsToValidate.every(storeId => {
      const config = storeConfigs.get(storeId);
      return config &&
        config.shippingProviderId.trim().length > 0 &&
        config.sellerId.trim().length > 0 &&
        config.apiKey.trim().length > 0 &&
        config.apiSecret.trim().length > 0;
    });

    return integrationValid && storeConfigsValid;
  }, [formData.name, formData.apiUrl, selectedStoreIds, storeConfigs, editingIntegration, connectedStoreIds]);

  const isFormDirty = useMemo(() => {
    const hasIntegrationChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);

    const hasStoreSelectionChanges =
      selectedStoreIds.length !== initialSelectedStoreIds.length ||
      selectedStoreIds.some(id => !initialSelectedStoreIds.includes(id)) ||
      initialSelectedStoreIds.some(id => !selectedStoreIds.includes(id));

    const hasStoreConfigChanges = selectedStoreIds.some(storeId => {
      const current = storeConfigs.get(storeId);
      const initial = initialStoreConfigs.get(storeId);

      if (!current && !initial) return false;
      if (!current || !initial) return true;

      return (
        current.shippingProviderId !== initial.shippingProviderId ||
        current.sellerId !== initial.sellerId ||
        current.apiKey !== initial.apiKey ||
        current.apiSecret !== initial.apiSecret ||
        current.crawlIntervalMinutes !== initial.crawlIntervalMinutes ||
        current.sendStock !== initial.sendStock ||
        current.sendPrice !== initial.sendPrice ||
        current.sendOrderStatus !== initial.sendOrderStatus ||
        current.isActive !== initial.isActive
      );
    });

    return hasIntegrationChanges || hasStoreSelectionChanges || hasStoreConfigChanges;
  }, [formData, initialFormData, selectedStoreIds, initialSelectedStoreIds, storeConfigs, initialStoreConfigs]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || !editingIntegration);
  }, [isFormValid, isFormDirty, editingIntegration]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingIntegrationId) return;
    try {
      await deleteIntegration(deletingIntegrationId);
      success('Integration deleted successfully');
      setIsDeleteModalOpen(false);
      fetchIntegrations();
      fetchIntegrationStores();
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  }, [deletingIntegrationId, fetchIntegrations, fetchIntegrationStores, success, error]);

  const getTypeLabel = useCallback((type: string) => {
    return INTEGRATION_TYPES.find(t => t.value === type)?.label || type;
  }, []);

  const modalTitle = useMemo(() =>
    editingIntegration ? 'Edit Integration' : 'Add Integration',
    [editingIntegration]
  );

  const submitButtonText = useMemo(() =>
    editingIntegration ? 'Update' : 'Create',
    [editingIntegration]
  );

  const columns = useMemo<Column<Integration>[]>(() => [
    { key: 'name', header: 'Name' },
    {
      key: 'type',
      header: 'Type',
      render: (row: Integration) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
          {getTypeLabel(row.type)}
        </span>
      ),
    },
    {
      key: 'storeCount',
      header: 'Stores',
      render: (row: Integration) => (
        <span className="text-muted-foreground">{row.storeCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Integration) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.isActive
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
      render: (row: Integration) => (
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
  ], [getTypeLabel, handleEdit, handleDelete]);

  const pagination = useMemo(() => ({
    page,
    limit: 10,
    total,
    totalPages: Math.ceil(total / 10),
  }), [page, total]);

  const allStoreOptions = useMemo(() =>
    (stores || []).map((s) => ({ value: s.id, label: s.name })),
    [stores]
  );

  const shippingProviderOptions = useMemo(() =>
    (shippingProviders || []).map((p) => ({ value: p.id, label: `${p.name} (${p.type})` })),
    [shippingProviders]
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage marketplace connections and sync settings</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Integration
        </Button>
      </div>

      <Table
        columns={columns}
        data={integrations}
        keyExtractor={keyExtractor}
        isLoading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No integrations yet. Connect your first marketplace to get started."
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Integration Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Integration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                required
                placeholder="Integration name"
              />
              <Select
                label="Type"
                value={formData.type}
                onChange={(e) => updateFormField('type', e.target.value as IntegrationFormData['type'])}
                options={INTEGRATION_TYPES}
                required
              />
              <Input
                label="API URL"
                value={formData.apiUrl}
                onChange={(e) => updateFormField('apiUrl', e.target.value)}
                type="url"
                required
                placeholder="https://api.example.com"
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
            </div>
          </div>

          {/* Store Configuration */}
          <div className="border-t border-border pt-4">
            <IntegrationStoreList
              stores={stores}
              selectedStoreIds={selectedStoreIds}
              connectedStoreIds={connectedStoreIds}
              conflictingStoreIds={conflictingStoreIds}
              storeConfigs={storeConfigs}
              shippingProviders={shippingProviders}
              integrationType={formData.type}
              onStoreSelectionChange={handleStoreSelectionChange}
              onConfigChange={updateStoreConfig}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
        title="Delete Integration"
        message="Are you sure you want to delete this integration? This action cannot be undone."
      />
    </>
  );
}
