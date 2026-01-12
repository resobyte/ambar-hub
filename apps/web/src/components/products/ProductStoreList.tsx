import { useState, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';

interface Store {
    id: string;
    name: string;
}

interface Integration {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
}

export interface StoreConfigData {
    storeId: string;
    storeSku: string;
    storeSalePrice: number;
    stockQuantity: number;
    isActive: boolean;
}

export interface IntegrationConfigData {
    integrationId: string;
    integrationSalePrice: number;
    isActive: boolean;
}

interface ProductStoreListProps {
    stores: Store[];
    selectedStoreIds: string[];
    connectedStoreIds: string[];
    storeConfigs: Map<string, StoreConfigData>;
    integrationConfigs: Map<string, Map<string, IntegrationConfigData>>;
    getStoreIntegrations: (storeId: string) => Integration[];
    onStoreSelectionChange: (storeId: string, selected: boolean) => void;
    onStoreConfigChange: <K extends keyof Omit<StoreConfigData, 'storeId'>>(
        storeId: string,
        field: K,
        value: StoreConfigData[K]
    ) => void;
    onIntegrationConfigChange: (
        storeId: string,
        integrationId: string,
        field: keyof Omit<IntegrationConfigData, 'integrationId'>,
        value: IntegrationConfigData[keyof Omit<IntegrationConfigData, 'integrationId'>]
    ) => void;
}

export function ProductStoreList({
    stores,
    selectedStoreIds,
    connectedStoreIds,
    storeConfigs,
    integrationConfigs,
    getStoreIntegrations,
    onStoreSelectionChange,
    onStoreConfigChange,
    onIntegrationConfigChange,
}: ProductStoreListProps) {
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

    const availableStores = useMemo(() =>
        stores.filter(s => !selectedStoreIds.includes(s.id) && !connectedStoreIds.includes(s.id)),
        [stores, selectedStoreIds, connectedStoreIds]
    );

    const activeStores = useMemo(() => {
        // Combine selected and connected stores
        const allIds = Array.from(new Set([...selectedStoreIds, ...connectedStoreIds]));
        return allIds.map(id => stores.find(s => s.id === id)).filter((s): s is Store => !!s);
    }, [selectedStoreIds, connectedStoreIds, stores]);

    const handleAddStore = (storeId: string) => {
        onStoreSelectionChange(storeId, true);
        setExpandedStoreId(storeId);
    };

    const handleRemoveStore = (storeId: string) => {
        onStoreSelectionChange(storeId, false);
        if (expandedStoreId === storeId) {
            setExpandedStoreId(null);
        }
    };

    const toggleExpand = (storeId: string) => {
        setExpandedStoreId(prev => prev === storeId ? null : storeId);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Store Configuration</h3>
                {availableStores.length > 0 && (
                    <div className="w-64">
                        <Select
                            value=""
                            onChange={(e) => handleAddStore(e.target.value)}
                            options={[
                                { value: '', label: '+ Add a store...' },
                                ...availableStores.map(s => ({ value: s.id, label: s.name }))
                            ]}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {activeStores.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/5">
                        <p className="text-sm text-muted-foreground">No stores configured. Add a store to set prices and stock.</p>
                    </div>
                )}

                {activeStores.map(store => {
                    const isConnected = connectedStoreIds.includes(store.id);
                    const config = storeConfigs.get(store.id);
                    const isExpanded = expandedStoreId === store.id;
                    const storeIntegrations = getStoreIntegrations(store.id);
                    const storeIntegrationConfigs = integrationConfigs.get(store.id);

                    if (!config && !isConnected) return null;

                    return (
                        <div key={store.id} className="border border-border rounded-lg overflow-hidden bg-card transition-all">
                            {/* Header */}
                            <div
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30 border-b border-border' : ''}`}
                                onClick={() => toggleExpand(store.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-foreground">{store.name}</span>
                                    {isConnected && (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
                                            Connected
                                        </span>
                                    )}
                                    {config && !config.isActive && (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-full font-medium">
                                            Passive
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isConnected && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveStore(store.id);
                                            }}
                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors mr-2"
                                            title="Remove store"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                    <svg
                                        className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Body */}
                            {isExpanded && config && (
                                <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-foreground">Store Details</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Status:</span>
                                            <div className="w-32">
                                                <Select
                                                    value={config.isActive ? 'Active' : 'Passive'}
                                                    onChange={(e) => onStoreConfigChange(store.id, 'isActive', e.target.value === 'Active')}
                                                    options={[
                                                        { value: 'Active', label: 'Active' },
                                                        { value: 'Passive', label: 'Passive' },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input
                                                label="Store SKU"
                                                value={config.storeSku}
                                                onChange={(e) => onStoreConfigChange(store.id, 'storeSku', e.target.value)}
                                                placeholder="Store-specific SKU"
                                            />
                                            <Input
                                                label="Store Sale Price"
                                                value={config.storeSalePrice}
                                                onChange={(e) => onStoreConfigChange(store.id, 'storeSalePrice', parseFloat(e.target.value) || 0)}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                            <Input
                                                label="Stock Quantity"
                                                value={config.stockQuantity}
                                                onChange={(e) => onStoreConfigChange(store.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {storeIntegrations.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-medium text-foreground">Integration Pricing</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {storeIntegrations.map(integration => {
                                                    const integrationConfig = storeIntegrationConfigs?.get(integration.id);
                                                    return (
                                                        <div key={integration.id} className="border border-border/60 rounded-lg overflow-hidden flex flex-col">
                                                            <div className="p-3 bg-muted/20 border-b border-border/50 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="Text-sm font-medium">{integration.name}</span>
                                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${integration.type === 'TRENDYOL'
                                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                        : integration.type === 'HEPSIBURADA'
                                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                            : integration.type === 'IKAS'
                                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                                        }`}>
                                                                        {integration.type}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="p-3 flex items-center gap-2 flex-1">
                                                                <div className="flex-1">
                                                                    <Input
                                                                        label="Integration Sale Price"
                                                                        value={integrationConfig?.integrationSalePrice ?? 0}
                                                                        onChange={(e) => onIntegrationConfigChange(store.id, integration.id, 'integrationSalePrice', parseFloat(e.target.value) || 0)}
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        placeholder="Optional override"
                                                                        className="h-9"
                                                                    />
                                                                </div>
                                                                <div className="w-24 pt-6">
                                                                    <Select
                                                                        value={integrationConfig?.isActive ? 'Active' : 'Passive'}
                                                                        onChange={(e) => onIntegrationConfigChange(store.id, integration.id, 'isActive', e.target.value === 'Active')}
                                                                        options={[
                                                                            { value: 'Active', label: 'Active' },
                                                                            { value: 'Passive', label: 'Passive' },
                                                                        ]}
                                                                        className="h-9"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
