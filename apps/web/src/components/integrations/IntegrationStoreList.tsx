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

  // Şirket Konfigürasyonu
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;

  // Fatura Ayarları (Invoice Settings)
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;

  // E-Arşiv Ayarları
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveHavaleAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;


  // E-Fatura Ayarları
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceHavaleAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;

  // Toplu Faturalama Ayarları
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;

  // İade Gider Pusulası Ayarları
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  // Mikro İhracat Ayarları
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;
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
        <h3 className="text-sm font-semibold text-foreground">Mağaza Konfigürasyonu</h3>
        {availableStores.length > 0 && (
          <div className="w-64">
            <Select
              value=""
              onChange={(e) => handleAddStore(e.target.value)}
              options={[
                { value: '', label: '+ Mağaza ekle...' },
                ...availableStores.map(s => {
                  const hasConflict = conflictingStoreIds.includes(s.id);
                  return {
                    value: s.id,
                    label: hasConflict ? `${s.name} (Çakışma Var)` : s.name,
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
            <p className="text-sm text-muted-foreground">Bağlı mağaza yok. Yapılandırmak için bir mağaza ekleyin.</p>
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
                      title="Mağazayı kaldır"
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
                    <h4 className="text-sm font-medium text-foreground">Konfigürasyon</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Durum:</span>
                      <div className="w-32">
                        <Select
                          value={config.isActive ? 'Active' : 'Passive'}
                          onChange={(e) => onConfigChange(store.id, 'isActive', e.target.value === 'Active')}
                          options={[
                            { value: 'Active', label: 'Aktif' },
                            { value: 'Passive', label: 'Pasif' },
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
                      Kargo Firması *
                    </label>
                    <Select
                      value={config.shippingProviderId || ''}
                      onChange={(e) => onConfigChange(store.id, 'shippingProviderId', e.target.value)}
                      options={shippingProviderOptions.length > 0 ? shippingProviderOptions : [{ value: '', label: 'Kargo firması bulunamadı' }]}
                      disabled={shippingProviderOptions.length === 0}
                    />
                    {shippingProviderOptions.length === 0 && (
                      <p className="text-xs text-destructive mt-1">Önce kargo firması oluşturun</p>
                    )}
                  </div>

                  {/* API Credentials */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      API Bilgileri
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                      <Input
                        label="Satıcı ID"
                        value={config.sellerId}
                        onChange={(e) => onConfigChange(store.id, 'sellerId', e.target.value)}
                        required
                        placeholder="Satıcı ID girin"
                      />
                      <Input
                        label="API Anahtarı"
                        value={config.apiKey}
                        onChange={(e) => onConfigChange(store.id, 'apiKey', e.target.value)}
                        required
                        placeholder="API anahtarı girin"
                      />
                      <div className="md:col-span-2">
                        <Input
                          label="API Gizli Anahtar"
                          value={config.apiSecret}
                          onChange={(e) => onConfigChange(store.id, 'apiSecret', e.target.value)}
                          type="password"
                          required
                          placeholder="API gizli anahtarı girin"
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
                      Eşitleme Ayarları
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">Eşitleme Aralığı</label>
                          <Input
                            value={config.crawlIntervalMinutes}
                            onChange={(e) => onConfigChange(store.id, 'crawlIntervalMinutes', parseInt(e.target.value) || 1)}
                            type="number"
                            min="1"
                            required
                            placeholder="Dakika"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm text-muted-foreground block mb-2">Eşitlenecek Veriler</label>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendStock}
                                onChange={(e) => onConfigChange(store.id, 'sendStock', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Stok Miktarı</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendPrice}
                                onChange={(e) => onConfigChange(store.id, 'sendPrice', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Fiyat Bilgisi</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendOrderStatus}
                                onChange={(e) => onConfigChange(store.id, 'sendOrderStatus', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Sipariş Durumu</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Şirket Konfigürasyonu */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Şirket Konfigürasyonu
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Marka Kodu"
                          value={config.brandCode || ''}
                          onChange={(e) => onConfigChange(store.id, 'brandCode', e.target.value)}
                          placeholder="Marka kodu girin"
                        />
                        <Input
                          label="Şirket Kodu"
                          value={config.companyCode || ''}
                          onChange={(e) => onConfigChange(store.id, 'companyCode', e.target.value)}
                          placeholder="Şirket kodu girin"
                        />
                        <Input
                          label="Şube Kodu"
                          value={config.branchCode || ''}
                          onChange={(e) => onConfigChange(store.id, 'branchCode', e.target.value)}
                          placeholder="Şube kodu girin"
                        />
                        <Input
                          label="Merkez Kodu (CoCode)"
                          value={config.coCode || ''}
                          onChange={(e) => onConfigChange(store.id, 'coCode', e.target.value)}
                          placeholder="Merkez kodu girin"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Fatura Ayarları
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                      {/* Genel Ayarlar */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Fatura Hareket Kodu"
                          value={config.invoiceTransactionCode || ''}
                          onChange={(e) => onConfigChange(store.id, 'invoiceTransactionCode', e.target.value)}
                          placeholder="FTS-101"
                        />
                        {integrationType === 'TRENDYOL' && (
                          <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer mt-6">
                              <input
                                type="checkbox"
                                checked={config.hasMicroExport || false}
                                onChange={(e) => onConfigChange(store.id, 'hasMicroExport', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Mikro İhracat</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Mikro İhracat Ayarları - Sadece mikro ihracat açıksa göster */}
                      {config.hasMicroExport && (
                        <div className="border-t border-border pt-4">
                          <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 rounded">Mikro İhracat</span>
                            Ayarları
                          </h5>
                          {/* Genel */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input
                              label="Fatura Hareket Kodu"
                              value={config.microExportTransactionCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'microExportTransactionCode', e.target.value)}
                              placeholder="FTS-102"
                            />
                            <Input
                              label="Muhasebe Hesap Kodu"
                              value={config.microExportAccountCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'microExportAccountCode', e.target.value)}
                              placeholder="120.05.001"
                            />
                            <Input
                              label="Azerbaycan Hesap Kodu"
                              value={config.microExportAzAccountCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'microExportAzAccountCode', e.target.value)}
                              placeholder="120.05.002"
                            />
                          </div>

                          {/* E-Arşiv */}
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">E-Arşiv</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Input
                                label="Seri No"
                                value={config.microExportEArchiveSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportEArchiveSerialNo', e.target.value)}
                                placeholder="MEA"
                              />
                              <Input
                                label="Sıra No"
                                value={config.microExportEArchiveSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportEArchiveSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>

                          {/* Toplu Faturalama */}
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">Toplu Faturalama</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Input
                                label="Seri No"
                                value={config.microExportBulkSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportBulkSerialNo', e.target.value)}
                                placeholder="MTF"
                              />
                              <Input
                                label="Sıra No"
                                value={config.microExportBulkSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportBulkSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>

                          {/* İade Gider Pusulası */}
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">İade Gider Pusulası</span>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Input
                                label="Seri No"
                                value={config.microExportRefundSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportRefundSerialNo', e.target.value)}
                                placeholder="MGP"
                              />
                              <Input
                                label="Sıra No"
                                value={config.microExportRefundSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'microExportRefundSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-3 italic">
                            Not: Mikro ihracat siparişlerinde bu ayarlar kullanılır. Cari kart kodu dinamik olarak belirlenir.
                          </p>
                        </div>
                      )}

                      {/* E-Arşiv Ayarları */}
                      <div className="border-t border-border pt-4">
                        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">E-Arşiv</span>
                          Ayarları
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.eArchiveBulkCustomer || false}
                                onChange={(e) => onConfigChange(store.id, 'eArchiveBulkCustomer', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Torba Cari</span>
                            </label>
                          </div>
                          <Input
                            label="Cari Kart Kodu"
                            value={config.eArchiveCardCode || ''}
                            onChange={(e) => onConfigChange(store.id, 'eArchiveCardCode', e.target.value)}
                            placeholder="HepsiBurada"
                          />
                          {integrationType === 'IKAS' && (
                            <Input
                              label="E-Arşiv Havale Cari Kodu"
                              value={config.eArchiveHavaleCardCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'eArchiveHavaleCardCode', e.target.value)}
                              placeholder="HavaleKodu"
                            />
                          )}
                          <Input
                            label="Muhasebe Hesap Kodu"
                            value={config.eArchiveAccountCode || ''}
                            onChange={(e) => onConfigChange(store.id, 'eArchiveAccountCode', e.target.value)}
                            placeholder="120.03.002"
                          />
                          {integrationType === 'IKAS' && (
                            <Input
                              label="E-Arşiv Havale Muhasebe Kodu"
                              value={config.eArchiveHavaleAccountCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'eArchiveHavaleAccountCode', e.target.value)}
                              placeholder="120.03.XXX"
                            />
                          )}
                          <Input
                            label="Seri No"
                            value={config.eArchiveSerialNo || ''}
                            onChange={(e) => onConfigChange(store.id, 'eArchiveSerialNo', e.target.value)}
                            placeholder="EEA"
                          />
                          <Input
                            label="Sıra No (Sayaç)"
                            value={config.eArchiveSequenceNo || ''}
                            onChange={(e) => onConfigChange(store.id, 'eArchiveSequenceNo', e.target.value)}
                            placeholder="000000001"
                          />
                        </div>
                      </div>

                      {/* E-Fatura Ayarları */}
                      <div className="border-t border-border pt-4">
                        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">E-Fatura</span>
                          Ayarları
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.eInvoiceBulkCustomer || false}
                                onChange={(e) => onConfigChange(store.id, 'eInvoiceBulkCustomer', e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                              />
                              <span className="text-sm">Torba Cari</span>
                            </label>
                          </div>
                          <Input
                            label="Cari Kart Kodu"
                            value={config.eInvoiceCardCode || ''}
                            onChange={(e) => onConfigChange(store.id, 'eInvoiceCardCode', e.target.value)}
                            placeholder="HPSB00001"
                          />
                          <Input
                            label="Muhasebe Hesap Kodu"
                            value={config.eInvoiceAccountCode || ''}
                            onChange={(e) => onConfigChange(store.id, 'eInvoiceAccountCode', e.target.value)}
                            placeholder="120.03.002"
                          />
                          {integrationType === 'IKAS' && (
                            <Input
                              label="E-Fatura Havale Muhasebe Kodu"
                              value={config.eInvoiceHavaleAccountCode || ''}
                              onChange={(e) => onConfigChange(store.id, 'eInvoiceHavaleAccountCode', e.target.value)}
                              placeholder="120.03.XXX"
                            />
                          )}
                          <Input
                            label="Seri No"
                            value={config.eInvoiceSerialNo || ''}
                            onChange={(e) => onConfigChange(store.id, 'eInvoiceSerialNo', e.target.value)}
                            placeholder="EEF"
                          />
                          <Input
                            label="Sıra No (Sayaç)"
                            value={config.eInvoiceSequenceNo || ''}
                            onChange={(e) => onConfigChange(store.id, 'eInvoiceSequenceNo', e.target.value)}
                            placeholder="000000001"
                          />
                        </div>
                      </div>

                      {/* Toplu Faturalama Ayarları */}
                      <div className="border-t border-border pt-4">
                        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">Toplu Faturalama</span>
                          Ayarları
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <span className="text-xs text-muted-foreground">E-Arşiv</span>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Seri No"
                                value={config.bulkEArchiveSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'bulkEArchiveSerialNo', e.target.value)}
                                placeholder="TEA"
                              />
                              <Input
                                label="Sıra No"
                                value={config.bulkEArchiveSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'bulkEArchiveSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-xs text-muted-foreground">E-Fatura</span>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Seri No"
                                value={config.bulkEInvoiceSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'bulkEInvoiceSerialNo', e.target.value)}
                                placeholder="TEF"
                              />
                              <Input
                                label="Sıra No"
                                value={config.bulkEInvoiceSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'bulkEInvoiceSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* İade Gider Pusulası Ayarları */}
                      <div className="border-t border-border pt-4">
                        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">İade Gider Pusulası</span>
                          Ayarları
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <span className="text-xs text-muted-foreground">E-Arşiv</span>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Seri No"
                                value={config.refundExpenseVoucherEArchiveSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'refundExpenseVoucherEArchiveSerialNo', e.target.value)}
                                placeholder="GEF"
                              />
                              <Input
                                label="Sıra No"
                                value={config.refundExpenseVoucherEArchiveSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'refundExpenseVoucherEArchiveSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-xs text-muted-foreground">E-Fatura</span>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Seri No"
                                value={config.refundExpenseVoucherEInvoiceSerialNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'refundExpenseVoucherEInvoiceSerialNo', e.target.value)}
                                placeholder="GEA"
                              />
                              <Input
                                label="Sıra No"
                                value={config.refundExpenseVoucherEInvoiceSequenceNo || ''}
                                onChange={(e) => onConfigChange(store.id, 'refundExpenseVoucherEInvoiceSequenceNo', e.target.value)}
                                placeholder="000000001"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Not: E-Fatura iade gider pusulası Uyumsoft&apos;a gönderilmez, sadece sistemde kayıt oluşturulur.
                        </p>
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
