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
  const [isStoreConfigModalOpen, setIsStoreConfigModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [configIntegrationId, setConfigIntegrationId] = useState<string | null>(null);
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

  const handleStoreConfigModalClose = useCallback(() => {
    setIsStoreConfigModalOpen(false);
    setConfigIntegrationId(null);
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

    // Load existing store configs
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

      // Handle store configurations
      const existingConfigs = integrationStores.filter(is => is && is.integrationId === (editingIntegration?.id || integrationId));
      const existingStoreIds = new Set(existingConfigs.map(is => is.storeId));

      // Create or update store configs
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

      // Remove stores that are no longer selected
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

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField('name', e.target.value);
  }, [updateFormField]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFormField('type', e.target.value as IntegrationFormData['type']);
  }, [updateFormField]);

  const handleApiUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField('apiUrl', e.target.value);
  }, [updateFormField]);

  const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFormField('isActive', e.target.value === 'Active');
  }, [updateFormField]);

  const handleStoreSelectionChange = useCallback((storeId: string, selected: boolean) => {
    setSelectedStoreIds(prev => {
      const newSelection = selected
        ? [...prev, storeId]
        : prev.filter(id => id !== storeId);

      // Add default config for newly selected store
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

  // Get store IDs already connected to this integration
  const connectedStoreIds = useMemo(() => {
    if (!editingIntegration) return [];
    return integrationStores
      .filter(is => is && is.integrationId === editingIntegration.id)
      .map(is => is.storeId);
  }, [integrationStores, editingIntegration]);

  // Get store IDs that already have an integration of the same type (business rule)
  const conflictingStoreIds = useMemo(() => {
    const currentType = formData.type;
    const currentIntegrationId = editingIntegration?.id;

    // Find all integration stores with the same type
    const sameTypeStoreIds = integrationStores
      .filter(is => {
        if (!is) return false;
        // Find the integration for this store
        const integration = integrations.find(i => i.id === is.integrationId);
        return integration && integration.type === currentType && integration.id !== currentIntegrationId;
      })
      .map(is => is.storeId);

    return sameTypeStoreIds;
  }, [integrationStores, integrations, formData.type, editingIntegration]);

  const isFormValid = useMemo(() => {
    // Integration form validation
    const integrationValid = formData.name.trim().length > 0 &&
                           formData.apiUrl.trim().length > 0;

    // Store configs validation - validate both selected and connected stores
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
    // Check integration-level changes
    const hasIntegrationChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);

    // Check store selection changes
    const hasStoreSelectionChanges =
      selectedStoreIds.length !== initialSelectedStoreIds.length ||
      selectedStoreIds.some(id => !initialSelectedStoreIds.includes(id)) ||
      initialSelectedStoreIds.some(id => !selectedStoreIds.includes(id));

    // Check store config changes
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
    { key: 'apiUrl', header: 'API URL' },
    {
      key: 'storeCount',
      header: 'Stores',
      render: (row: Integration) => <span>{row.storeCount}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Integration) => (
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
      render: (row: Integration) => (
        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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

  // Filter store options to exclude already connected stores
  const storeOptions = useMemo(() =>
    (stores || [])
      .filter(s => !connectedStoreIds.includes(s.id))
      .map((s) => ({ value: s.id, label: s.name })),
    [stores, connectedStoreIds]
  );

  // Get all store options including connected ones for display
  const allStoreOptions = useMemo(() =>
    (stores || []).map((s) => ({ value: s.id, label: s.name })),
    [stores]
  );

  // Shipping provider options
  const shippingProviderOptions = useMemo(() =>
    (shippingProviders || []).map((p) => ({ value: p.id, label: `${p.name} (${p.type})` })),
    [shippingProviders]
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleCreate}>
          <svg className="w-[18px] h-[18px] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
            <Select
              label="Type"
              value={formData.type}
              onChange={handleTypeChange}
              options={INTEGRATION_TYPES}
              required
            />
            <Input
              label="API URL"
              value={formData.apiUrl}
              onChange={handleApiUrlChange}
              type="url"
              required
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

          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-semibold mb-3">Store Configuration</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {allStoreOptions.map(option => {
                const isSelected = selectedStoreIds.includes(option.value);
                const isConnected = connectedStoreIds.includes(option.value);
                const hasConflict = conflictingStoreIds.includes(option.value);
                const config = storeConfigs.get(option.value);
                const isDisabled = isConnected || hasConflict;

                // Get conflict reason
                const conflictReason = hasConflict
                  ? `This store already has a ${formData.type} integration`
                  : '';

                return (
                  <div key={option.value} className={`border border-border rounded-lg p-3 ${isConnected ? 'bg-muted/50' : ''} ${hasConflict ? 'bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className={`flex items-center space-x-2 ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        title={conflictReason}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || isConnected}
                          disabled={isDisabled}
                          onChange={(e) => !isDisabled && handleStoreSelectionChange(option.value, e.target.checked)}
                          className="w-4 h-4 rounded border-border disabled:opacity-50"
                        />
                        <span className="font-medium">{option.label}</span>
                        {isConnected && (
                          <span className="text-xs text-muted-foreground ml-2">(Connected)</span>
                        )}
                        {hasConflict && !isConnected && (
                          <span className="text-xs text-destructive ml-2" title={conflictReason}>
                            Already has {formData.type}
                          </span>
                        )}
                      </label>
                    </div>

                    {((isSelected && !isConnected) || (isConnected && config)) && (
                      <div className={`ml-6 mt-3 space-y-3 ${config && !config.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Store Configuration</span>
                          <Select
                            value={config!.isActive ? 'Active' : 'Passive'}
                            onChange={(e) => updateStoreConfig(option.value, 'isActive', e.target.value === 'Active')}
                            options={[
                              { value: 'Active', label: 'Active' },
                              { value: 'Passive', label: 'Passive' },
                            ]}
                          />
                        </div>

                        {/* Shipping Selection */}
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Shipping Provider *</label>
                          <Select
                            value={config!.shippingProviderId || ''}
                            onChange={(e) => updateStoreConfig(option.value, 'shippingProviderId', e.target.value)}
                            options={shippingProviderOptions.length > 0 ? shippingProviderOptions : [{ value: '', label: 'No shipping providers available' }]}
                            disabled={shippingProviderOptions.length === 0}
                          />
                          {shippingProviderOptions.length === 0 && (
                            <p className="text-xs text-destructive mt-1">
                              Create shipping providers first
                            </p>
                          )}
                        </div>

                        {/* Integration Credentials */}
                        <div className="border-t border-border pt-3">
                          <h4 className="text-sm font-medium mb-2">Integration Credentials</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                              label="Seller ID"
                              value={config!.sellerId}
                              onChange={(e) => updateStoreConfig(option.value, 'sellerId', e.target.value)}
                              required
                            />
                            <Input
                              label="API Key"
                              value={config!.apiKey}
                              onChange={(e) => updateStoreConfig(option.value, 'apiKey', e.target.value)}
                              required
                            />
                            <Input
                              label="API Secret"
                              value={config!.apiSecret}
                              onChange={(e) => updateStoreConfig(option.value, 'apiSecret', e.target.value)}
                              type="password"
                              required
                            />
                          </div>
                        </div>

                        {/* Sync Settings */}
                        <div className="border-t border-border pt-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Interval (min)</label>
                              <Input
                                value={config!.crawlIntervalMinutes}
                                onChange={(e) => updateStoreConfig(option.value, 'crawlIntervalMinutes', parseInt(e.target.value) || 1)}
                                type="number"
                                min="1"
                                required
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`stock-${option.value}`}
                                checked={config!.sendStock}
                                onChange={(e) => updateStoreConfig(option.value, 'sendStock', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <label htmlFor={`stock-${option.value}`} className="text-xs">Stock</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`price-${option.value}`}
                                checked={config!.sendPrice}
                                onChange={(e) => updateStoreConfig(option.value, 'sendPrice', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <label htmlFor={`price-${option.value}`} className="text-xs">Price</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`order-${option.value}`}
                                checked={config!.sendOrderStatus}
                                onChange={(e) => updateStoreConfig(option.value, 'sendOrderStatus', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <label htmlFor={`order-${option.value}`} className="text-xs">Order Status</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
        title="Delete Integration"
        message="Are you sure you want to delete this integration? This action cannot be undone."
      />
    </>
  );
}
