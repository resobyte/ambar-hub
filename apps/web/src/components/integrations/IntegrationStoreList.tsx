import { useState, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';

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

export interface StoreConfigData {
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

interface IntegrationStoreListProps {
  stores: Store[];
  selectedStoreIds: string[];
  connectedStoreIds: string[];
  conflictingStoreIds: string[];
  storeConfigs: Map<string, StoreConfigData>;
  shippingProviders: ShippingProvider[];
  integrationType: string;
  onStoreSelectionChange: (storeId: string, selected: boolean) => void;
  onConfigChange: <K extends keyof Omit<StoreConfigData, 'storeId'>>(
    storeId: string,
    field: K,
    value: StoreConfigData[K]
  ) => void;
}

export function IntegrationStoreList({
  stores,
  selectedStoreIds,
  connectedStoreIds,
  conflictingStoreIds,
  storeConfigs,
  shippingProviders,
  integrationType,
  onStoreSelectionChange,
  onConfigChange,
}: IntegrationStoreListProps) {
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const shippingProviderOptions = useMemo(() =>
    (shippingProviders || []).map((p) => ({ value: p.id, label: `${p.name} (${p.type})` })),
    [shippingProviders]
  );

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
                ...availableStores.map(s => {
                   const hasConflict = conflictingStoreIds.includes(s.id);
                   return {
                     value: s.id,
                     label: hasConflict ? `${s.name} (Has Conflict)` : s.name,
                     disabled: hasConflict
                   };
                })
              ]}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {activeStores.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/5">
            <p className="text-sm text-muted-foreground">No stores connected. Add a store to configure.</p>
          </div>
        )}

        {activeStores.map(store => {
          const isConnected = connectedStoreIds.includes(store.id);
          const config = storeConfigs.get(store.id);
          const isExpanded = expandedStoreId === store.id;
          
          if (!config && !isConnected) return null; // Should not happen if logic is correct

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
                     <h4 className="text-sm font-medium text-foreground">Configuration</h4>
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <div className="w-32">
                          <Select
                            value={config.isActive ? 'Active' : 'Passive'}
                            onChange={(e) => onConfigChange(store.id, 'isActive', e.target.value === 'Active')}
                            options={[
                              { value: 'Active', label: 'Active' },
                              { value: 'Passive', label: 'Passive' },
                            ]}
                          />
                        </div>
                     </div>
                  </div>

                  {/* Shipping Provider */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Shipping Provider *
                    </label>
                    <Select
                      value={config.shippingProviderId || ''}
                      onChange={(e) => onConfigChange(store.id, 'shippingProviderId', e.target.value)}
                      options={shippingProviderOptions.length > 0 ? shippingProviderOptions : [{ value: '', label: 'No shipping providers available' }]}
                      disabled={shippingProviderOptions.length === 0}
                    />
                    {shippingProviderOptions.length === 0 && (
                      <p className="text-xs text-destructive mt-1">Create shipping providers first</p>
                    )}
                  </div>

                  {/* API Credentials */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                       </svg>
                       API Credentials
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                      <Input
                        label="Seller ID"
                        value={config.sellerId}
                        onChange={(e) => onConfigChange(store.id, 'sellerId', e.target.value)}
                        required
                        placeholder="Enter seller ID"
                      />
                      <Input
                        label="API Key"
                        value={config.apiKey}
                        onChange={(e) => onConfigChange(store.id, 'apiKey', e.target.value)}
                        required
                        placeholder="Enter API key"
                      />
                      <div className="md:col-span-2">
                        <Input
                          label="API Secret"
                          value={config.apiSecret}
                          onChange={(e) => onConfigChange(store.id, 'apiSecret', e.target.value)}
                          type="password"
                          required
                          placeholder="Enter API secret"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sync Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync Settings
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">Sync Interval</label>
                          <Input
                            value={config.crawlIntervalMinutes}
                            onChange={(e) => onConfigChange(store.id, 'crawlIntervalMinutes', parseInt(e.target.value) || 1)}
                            type="number"
                            min="1"
                            required
                            placeholder="Minutes"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground block mb-2">Data to Sync</label>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendStock}
                                onChange={(e) => onConfigChange(store.id, 'sendStock', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Stock Quantity</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendPrice}
                                onChange={(e) => onConfigChange(store.id, 'sendPrice', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Price Information</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendOrderStatus}
                                onChange={(e) => onConfigChange(store.id, 'sendOrderStatus', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Order Status</span>
                            </label>
                          </div>
                        </div>
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
