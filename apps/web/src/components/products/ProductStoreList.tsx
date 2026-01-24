import { useState, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';

interface Store {
    id: string;
    name: string;
    type?: string;
}

export interface StoreConfigData {
    storeId: string;
    storeSku: string;
    storeSalePrice: number;
    stockQuantity: number;
    sellableQuantity?: number;
    reservableQuantity?: number;
    isActive: boolean;
}

interface ProductStoreListProps {
    stores: Store[];
    selectedStoreIds: string[];
    connectedStoreIds: string[];
    storeConfigs: Map<string, StoreConfigData>;
    onStoreSelectionChange: (storeId: string, selected: boolean) => void;
    onStoreConfigChange: <K extends keyof Omit<StoreConfigData, 'storeId'>>(
        storeId: string,
        field: K,
        value: StoreConfigData[K]
    ) => void;
}

export function ProductStoreList({
    stores,
    selectedStoreIds,
    connectedStoreIds,
    storeConfigs,
    onStoreSelectionChange,
    onStoreConfigChange,
}: ProductStoreListProps) {
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

    const availableStores = useMemo(() =>
        stores.filter(s => !selectedStoreIds.includes(s.id) && !connectedStoreIds.includes(s.id)),
        [stores, selectedStoreIds, connectedStoreIds]
    );

    const activeStores = useMemo(() => {
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

    const getStoreTypeBadge = (type?: string) => {
        if (!type) return null;
        const colors: Record<string, string> = {
            TRENDYOL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            HEPSIBURADA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            IKAS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            MANUAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[type] || colors.MANUAL}`}>
                {type}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Mağaza Konfigürasyonu</h3>
                {availableStores.length > 0 && (
                    <div className="w-64">
                        <Select
                            value=""
                            onChange={(e) => handleAddStore(e.target.value)}
                            options={[
                                { value: '', label: '+ Mağaza ekle...' },
                                ...availableStores.map(s => ({ value: s.id, label: s.name }))
                            ]}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {activeStores.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/5">
                        <p className="text-sm text-muted-foreground">Mağaza yapılandırılmamış. Fiyat ve stok belirlemek için bir mağaza ekleyin.</p>
                    </div>
                )}

                {activeStores.map(store => {
                    const isConnected = connectedStoreIds.includes(store.id);
                    const config = storeConfigs.get(store.id);
                    const isExpanded = expandedStoreId === store.id;

                    if (!config && !isConnected) return null;

                    return (
                        <div key={store.id} className="border border-border rounded-lg overflow-hidden bg-card transition-all">
                            <div
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30 border-b border-border' : ''}`}
                                onClick={() => toggleExpand(store.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-foreground">{store.name}</span>
                                    {getStoreTypeBadge(store.type)}
                                    {isConnected && (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
                                            Bağlı
                                        </span>
                                    )}
                                    {config && !config.isActive && (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-full font-medium">
                                            Pasif
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

                            {isExpanded && config && (
                                <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-foreground">Mağaza Detayları</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Durum:</span>
                                            <div className="w-32">
                                                <Select
                                                    value={config.isActive ? 'Active' : 'Passive'}
                                                    onChange={(e) => onStoreConfigChange(store.id, 'isActive', e.target.value === 'Active')}
                                                    options={[
                                                        { value: 'Active', label: 'Aktif' },
                                                        { value: 'Passive', label: 'Pasif' },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input
                                                label="Mağaza SKU"
                                                value={config.storeSku}
                                                onChange={(e) => onStoreConfigChange(store.id, 'storeSku', e.target.value)}
                                                placeholder="Mağazaya özel SKU"
                                            />
                                            <Input
                                                label="Mağaza Satış Fiyatı"
                                                value={config.storeSalePrice}
                                                onChange={(e) => onStoreConfigChange(store.id, 'storeSalePrice', parseFloat(e.target.value) || 0)}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />

                                            <div className="flex flex-col gap-1">
                                                <Input
                                                    label="Stok Miktarı"
                                                    value={config.stockQuantity}
                                                    onChange={(e) => onStoreConfigChange(store.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                />
                                                {(config.sellableQuantity !== undefined || config.reservableQuantity !== undefined) && (
                                                    <div className="flex gap-2 text-xs mt-1">
                                                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded" title="Satılabilir Stok">
                                                            Sat: {config.sellableQuantity || 0}
                                                        </span>
                                                        <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded" title="Rezerve Edilebilir Stok">
                                                            Rez: {config.reservableQuantity || 0}
                                                        </span>
                                                    </div>
                                                )}
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
    );
}
