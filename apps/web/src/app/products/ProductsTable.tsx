'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStores,
  createProductStore,
  updateProductStore,
  deleteProductStore,
  getStores,
  getIntegrations,
  getIntegrationStores,
  getProductIntegrations,
  createProductIntegration,
  updateProductIntegration,
  deleteProductIntegration,
  getProductSetItems,
  updateProductSetItems,
  ProductSetItem,
} from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { ProductStoreList } from '@/components/products/ProductStoreList';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  vatRate: number;
  desi: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  lastSalePrice: number | null;
  isActive: boolean;
  storeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductStore {
  id: string;
  productId: string;
  storeId: string;
  storeName?: string;
  storeSku: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

interface IntegrationStore {
  id: string;
  integrationId: string;
  storeId: string;
  isActive: boolean;
  integration?: Integration;
}

interface ProductIntegration {
  id: string;
  productStoreId: string;
  integrationId: string;
  integrationSalePrice: number | null;
  isActive: boolean;
  integration?: Integration;
}

interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  sku: string;
  vatRate: number;
  desi: number;
  purchasePrice: number;
  salePrice: number;
  lastSalePrice: number;
  isActive: boolean;
  productType: 'SIMPLE' | 'SET';
  setPrice: number;
}

interface StoreConfigData {
  storeId: string;
  storeSku: string;
  storeSalePrice: number;
  stockQuantity: number;
  isActive: boolean;
}

interface IntegrationConfigData {
  integrationId: string;
  integrationSalePrice: number;
  isActive: boolean;
}

const keyExtractor = (item: Product) => item.id;

const VAT_RATES = [
  { value: '1', label: '1%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: '20', label: '20%' },
];

const DEFAULT_STORE_CONFIG: Omit<StoreConfigData, 'storeId' | 'storeSku' | 'storeSalePrice' | 'stockQuantity'> = {
  isActive: true,
};

const DEFAULT_INTEGRATION_CONFIG: Omit<IntegrationConfigData, 'integrationId'> = {
  integrationSalePrice: 0,
  isActive: true,
};

const PRODUCT_TYPES = [
  { value: 'SIMPLE', label: 'Tekli Ürün' },
  { value: 'SET', label: 'Set Ürün' },
];

interface SetComponentData {
  componentProductId: string;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [productStores, setProductStores] = useState<ProductStore[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
  const [productIntegrations, setProductIntegrations] = useState<ProductIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    category: '',
    barcode: '',
    sku: '',
    vatRate: 20,
    desi: 0,
    purchasePrice: 0,
    salePrice: 0,
    lastSalePrice: 0,
    isActive: true,
    productType: 'SIMPLE',
    setPrice: 0,
  });
  const [setComponents, setSetComponents] = useState<SetComponentData[]>([]);
  const [initialFormData, setInitialFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    category: '',
    barcode: '',
    sku: '',
    vatRate: 20,
    desi: 0,
    purchasePrice: 0,
    salePrice: 0,
    lastSalePrice: 0,
    isActive: true,
    productType: 'SIMPLE',
    setPrice: 0,
  });
  const [initialStoreConfigs, setInitialStoreConfigs] = useState<Map<string, StoreConfigData>>(new Map());
  const [initialSelectedStoreIds, setInitialSelectedStoreIds] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeConfigs, setStoreConfigs] = useState<Map<string, StoreConfigData>>(new Map());
  const [integrationConfigs, setIntegrationConfigs] = useState<Map<string, Map<string, IntegrationConfigData>>>(new Map());
  const [initialIntegrationConfigs, setInitialIntegrationConfigs] = useState<Map<string, Map<string, IntegrationConfigData>>>(new Map());
  const formDataRef = useRef(formData);
  const { success, error } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProducts(page, 10);
      setProducts(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      error('Failed to fetch products');
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

  const fetchProductStores = useCallback(async () => {
    try {
      const data = await getProductStores();
      setProductStores(data);
    } catch (err) {
      error('Failed to fetch product stores');
    }
  }, [error]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await getIntegrations(1, 100);
      setIntegrations(response.data);
    } catch (err) {
      error('Failed to fetch integrations');
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

  const fetchProductIntegrations = useCallback(async () => {
    try {
      const data = await getProductIntegrations();
      setProductIntegrations(data);
    } catch (err) {
      error('Failed to fetch product integrations');
    }
  }, [error]);

  useEffect(() => {
    fetchProducts();
    fetchStores();
    fetchProductStores();
    fetchIntegrations();
    fetchIntegrationStores();
    fetchProductIntegrations();
  }, [fetchProducts, fetchStores, fetchProductStores, fetchIntegrations, fetchIntegrationStores, fetchProductIntegrations]);

  const getStoreIntegrations = useCallback((storeId: string): Integration[] => {
    return integrationStores
      .filter(is => is.storeId === storeId && is.isActive)
      .map(is => integrations.find(i => i.id === is.integrationId))
      .filter((i): i is Integration => !!i && i.isActive);
  }, [integrationStores, integrations]);

  const handleCreate = useCallback(() => {
    setEditingProduct(null);
    const newData = {
      name: '',
      brand: '',
      category: '',
      barcode: '',
      sku: '',
      vatRate: 20,
      desi: 0,
      purchasePrice: 0,
      salePrice: 0,
      lastSalePrice: 0,
      isActive: true,
      productType: 'SIMPLE' as const,
      setPrice: 0,
    };
    setFormData(newData);
    formDataRef.current = newData;
    setInitialFormData(newData);
    setSetComponents([]);
    setSelectedStoreIds([]);
    setInitialSelectedStoreIds([]);
    setStoreConfigs(new Map());
    setInitialStoreConfigs(new Map());
    setIntegrationConfigs(new Map());
    setInitialIntegrationConfigs(new Map());
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    const newData = {
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      barcode: product.barcode || '',
      sku: product.sku || '',
      vatRate: product.vatRate,
      desi: product.desi || 0,
      purchasePrice: product.purchasePrice || 0,
      salePrice: product.salePrice || 0,
      lastSalePrice: product.lastSalePrice || 0,
      isActive: product.isActive,
      productType: (product as any).productType || 'SIMPLE' as const,
      setPrice: (product as any).setPrice || 0,
    };
    setFormData(newData);
    formDataRef.current = newData;
    setInitialFormData(newData);

    // Load SET components if product is SET type
    if ((product as any).productType === 'SET') {
      getProductSetItems(product.id).then(items => {
        setSetComponents(items.map((item, index) => ({
          componentProductId: item.componentProductId,
          quantity: item.quantity,
          priceShare: item.priceShare,
          sortOrder: item.sortOrder ?? index,
        })));
      });
    } else {
      setSetComponents([]);
    }

    const existingConfigs = productStores.filter(ps => ps && ps.productId === product.id);
    const storeIds = existingConfigs.map(ps => ps.storeId);
    setSelectedStoreIds(storeIds);

    const configsMap = new Map<string, StoreConfigData>();
    existingConfigs.forEach(ps => {
      configsMap.set(ps.storeId, {
        storeId: ps.storeId,
        storeSku: ps.storeSku || '',
        storeSalePrice: ps.storeSalePrice || 0,
        stockQuantity: ps.stockQuantity,
        isActive: ps.isActive,
      });
    });
    setStoreConfigs(configsMap);
    setInitialStoreConfigs(new Map(configsMap));
    setInitialSelectedStoreIds([...storeIds]);

    const integrationConfigsMap = new Map<string, Map<string, IntegrationConfigData>>();
    existingConfigs.forEach(ps => {
      const storeIntegrations = productIntegrations.filter(
        pi => pi.productStoreId === ps.id
      );
      const storeMap = new Map<string, IntegrationConfigData>();
      storeIntegrations.forEach(pi => {
        storeMap.set(pi.integrationId, {
          integrationId: pi.integrationId,
          integrationSalePrice: pi.integrationSalePrice || 0,
          isActive: pi.isActive,
        });
      });
      integrationConfigsMap.set(ps.storeId, storeMap);
    });
    setIntegrationConfigs(integrationConfigsMap);
    setInitialIntegrationConfigs(new Map(integrationConfigsMap));

    setIsModalOpen(true);
  }, [productStores, productIntegrations]);

  const handleDelete = useCallback((id: string) => {
    setDeletingProductId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      let productId: string;

      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, currentFormData);
        productId = updated.data.id;
        success('Product updated successfully');
      } else {
        const created = await createProduct(currentFormData);
        productId = created.data.id;
        success('Product created successfully');
      }

      // Save SET components if product type is SET
      if (currentFormData.productType === 'SET' && setComponents.length > 0) {
        await updateProductSetItems(productId, setComponents.filter(c => c.componentProductId));
      }

      const existingConfigs = productStores.filter(ps => ps && ps.productId === (editingProduct?.id || productId));
      const existingStoreIds = new Set(existingConfigs.map(ps => ps.storeId));

      for (const storeId of selectedStoreIds) {
        const config = storeConfigs.get(storeId);
        if (!config) continue;

        const existingConfig = existingConfigs.find(ps => ps.storeId === storeId);
        let productStoreId: string;

        if (existingConfig) {
          await updateProductStore(existingConfig.id, {
            storeSku: config.storeSku || undefined,
            storeSalePrice: config.storeSalePrice || undefined,
            stockQuantity: config.stockQuantity,
            isActive: config.isActive,
          });
          productStoreId = existingConfig.id;
        } else {
          const created = await createProductStore({
            productId,
            storeId,
            storeSku: config.storeSku || undefined,
            storeSalePrice: config.storeSalePrice || undefined,
            stockQuantity: config.stockQuantity,
            isActive: config.isActive,
          });
          productStoreId = created.data.id;
        }
        existingStoreIds.delete(storeId);

        const storeIntegrationConfigs = integrationConfigs.get(storeId);
        if (storeIntegrationConfigs) {
          const existingProductIntegrations = productIntegrations.filter(
            pi => pi.productStoreId === (existingConfig?.id || productStoreId)
          );
          const existingIntegrationIds = new Set(existingProductIntegrations.map(pi => pi.integrationId));

          Array.from(storeIntegrationConfigs.entries()).forEach(async ([integrationId, integrationConfig]) => {
            const existingPI = existingProductIntegrations.find(pi => pi.integrationId === integrationId);
            if (existingPI) {
              await updateProductIntegration(existingPI.id, {
                integrationSalePrice: integrationConfig.integrationSalePrice || undefined,
                isActive: integrationConfig.isActive,
              });
              existingIntegrationIds.delete(integrationId);
            } else {
              await createProductIntegration({
                productStoreId,
                integrationId,
                integrationSalePrice: integrationConfig.integrationSalePrice || undefined,
                isActive: integrationConfig.isActive,
              });
            }
          });

          Array.from(existingIntegrationIds).forEach(async (integrationId) => {
            const piToRemove = existingProductIntegrations.find(pi => pi.integrationId === integrationId);
            if (piToRemove) {
              await deleteProductIntegration(piToRemove.id);
            }
          });
        }
      }

      const storeIdsToRemove = Array.from(existingStoreIds);
      for (const storeId of storeIdsToRemove) {
        const configToRemove = existingConfigs.find(ps => ps.storeId === storeId);
        if (configToRemove) {
          await deleteProductStore(configToRemove.id);
        }
      }

      setIsModalOpen(false);
      fetchProducts();
      fetchProductStores();
      fetchProductIntegrations();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  }, [editingProduct, selectedStoreIds, storeConfigs, integrationConfigs, productStores, productIntegrations, fetchProducts, fetchProductStores, fetchProductIntegrations, success, error]);

  const updateFormField = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
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
          storeSku: '',
          storeSalePrice: 0,
          stockQuantity: 0,
        }));
      }

      if (selected) {
        const storeIntegrations = getStoreIntegrations(storeId);
        setIntegrationConfigs(prev => {
          const newMap = new Map(prev);
          const integrationMap = new Map<string, IntegrationConfigData>();
          storeIntegrations.forEach(integration => {
            integrationMap.set(integration.id, {
              ...DEFAULT_INTEGRATION_CONFIG,
              integrationId: integration.id,
            });
          });
          newMap.set(storeId, integrationMap);
          return newMap;
        });
      } else {
        setIntegrationConfigs(prev => {
          const newMap = new Map(prev);
          newMap.delete(storeId);
          return newMap;
        });
      }

      return newSelection;
    });
  }, [storeConfigs, getStoreIntegrations]);

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
        storeSku: '',
        storeSalePrice: 0,
        stockQuantity: 0,
      };
      newMap.set(storeId, { ...current, [field]: value });
      return newMap;
    });
  }, []);

  const updateIntegrationConfig = useCallback((
    storeId: string,
    integrationId: string,
    field: keyof Omit<IntegrationConfigData, 'integrationId'>,
    value: IntegrationConfigData[keyof Omit<IntegrationConfigData, 'integrationId'>]
  ) => {
    setIntegrationConfigs(prev => {
      const newMap = new Map(prev);
      const storeMap = newMap.get(storeId) || new Map<string, IntegrationConfigData>();
      const current = storeMap.get(integrationId) || {
        ...DEFAULT_INTEGRATION_CONFIG,
        integrationId,
      };
      storeMap.set(integrationId, { ...current, [field]: value });
      newMap.set(storeId, storeMap);
      return newMap;
    });
  }, []);

  const connectedStoreIds = useMemo(() => {
    if (!editingProduct) return [];
    return productStores
      .filter(ps => ps && ps.productId === editingProduct.id)
      .map(ps => ps.storeId);
  }, [productStores, editingProduct]);

  const isFormValid = useMemo(() => {
    const productValid = formData.name.trim().length > 0;
    const storeIdsToValidate = editingProduct
      ? Array.from(new Set([...selectedStoreIds, ...connectedStoreIds]))
      : selectedStoreIds;
    const storeConfigsValid = storeIdsToValidate.every(storeId => {
      const config = storeConfigs.get(storeId);
      return config !== undefined;
    });
    return productValid && storeConfigsValid;
  }, [formData.name, selectedStoreIds, storeConfigs, editingProduct, connectedStoreIds]);

  const isFormDirty = useMemo(() => {
    const hasProductChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
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
        current.storeSku !== initial.storeSku ||
        current.storeSalePrice !== initial.storeSalePrice ||
        current.stockQuantity !== initial.stockQuantity ||
        current.isActive !== initial.isActive
      );
    });
    const hasIntegrationConfigChanges = selectedStoreIds.some(storeId => {
      const currentStoreMap = integrationConfigs.get(storeId);
      const initialStoreMap = initialIntegrationConfigs.get(storeId);
      if (!currentStoreMap && !initialStoreMap) return false;
      if (!currentStoreMap || !initialStoreMap) return true;
      const currentIntegrationIds = Array.from(currentStoreMap.keys());
      const initialIntegrationIds = Array.from(initialStoreMap.keys());
      if (currentIntegrationIds.length !== initialIntegrationIds.length) return true;
      if (currentIntegrationIds.some(id => !initialIntegrationIds.includes(id))) return true;
      if (initialIntegrationIds.some(id => !currentIntegrationIds.includes(id))) return true;
      return currentIntegrationIds.some(integrationId => {
        const current = currentStoreMap.get(integrationId);
        const initial = initialStoreMap.get(integrationId);
        return (
          current?.integrationSalePrice !== initial?.integrationSalePrice ||
          current?.isActive !== initial?.isActive
        );
      });
    });
    return hasProductChanges || hasStoreSelectionChanges || hasStoreConfigChanges || hasIntegrationConfigChanges;
  }, [formData, initialFormData, selectedStoreIds, initialSelectedStoreIds, storeConfigs, initialStoreConfigs, integrationConfigs, initialIntegrationConfigs]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || !editingProduct);
  }, [isFormValid, isFormDirty, editingProduct]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId);
      success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      fetchProducts();
      fetchProductStores();
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  }, [deletingProductId, fetchProducts, fetchProductStores, success, error]);

  const modalTitle = useMemo(() =>
    editingProduct ? 'Edit Product' : 'Add Product',
    [editingProduct]
  );

  const submitButtonText = useMemo(() =>
    editingProduct ? 'Update' : 'Create',
    [editingProduct]
  );

  const columns = useMemo<Column<Product>[]>(() => [
    { key: 'name', header: 'Name' },
    { key: 'brand', header: 'Brand' },
    { key: 'category', header: 'Category' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'storeCount',
      header: 'Stores',
      render: (row: Product) => (
        <span className="text-muted-foreground">{row.storeCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: Product) => (
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
      render: (row: Product) => (
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
  ], [handleEdit, handleDelete]);

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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog and pricing</p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Button>
      </div>

      <Table
        columns={columns}
        data={products}
        keyExtractor={keyExtractor}
        isLoading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No products yet. Add your first product to get started."
      />

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={modalTitle} size="full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                required
                placeholder="Product name"
              />
              <Input
                label="Brand"
                value={formData.brand}
                onChange={(e) => updateFormField('brand', e.target.value)}
                placeholder="Brand"
              />
              <Input
                label="Category"
                value={formData.category}
                onChange={(e) => updateFormField('category', e.target.value)}
                placeholder="Category"
              />
              <Input
                label="Barcode"
                value={formData.barcode}
                onChange={(e) => updateFormField('barcode', e.target.value)}
                placeholder="Barcode"
              />
              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) => updateFormField('sku', e.target.value)}
                placeholder="SKU"
              />
              <Select
                label="VAT Rate"
                value={String(formData.vatRate)}
                onChange={(e) => updateFormField('vatRate', parseFloat(e.target.value))}
                options={VAT_RATES}
              />
              <Input
                label="Desi"
                value={formData.desi}
                onChange={(e) => updateFormField('desi', parseFloat(e.target.value) || 0)}
                type="number"
                min="0"
                step="0.1"
                placeholder="Weight/Volume"
              />
              <Input
                label="Purchase Price"
                value={formData.purchasePrice}
                onChange={(e) => updateFormField('purchasePrice', parseFloat(e.target.value) || 0)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <Input
                label="Sale Price"
                value={formData.salePrice}
                onChange={(e) => updateFormField('salePrice', parseFloat(e.target.value) || 0)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <Input
                label="Last Sale Price"
                value={formData.lastSalePrice}
                onChange={(e) => updateFormField('lastSalePrice', parseFloat(e.target.value) || 0)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <Select
                label="Ürün Tipi"
                value={formData.productType}
                onChange={(e) => updateFormField('productType', e.target.value as 'SIMPLE' | 'SET')}
                options={PRODUCT_TYPES}
              />
              {formData.productType === 'SET' && (
                <Input
                  label="Set Fiyatı"
                  value={formData.setPrice}
                  onChange={(e) => updateFormField('setPrice', parseFloat(e.target.value) || 0)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              )}
              <div className="md:col-span-3">
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
          </div>

          {/* SET Components - only visible for SET type */}
          {formData.productType === 'SET' && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Set Bileşenleri</h3>
              <div className="space-y-3">
                {setComponents.map((comp, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <Select
                        label="Ürün"
                        value={comp.componentProductId}
                        onChange={(e) => {
                          const newComps = [...setComponents];
                          newComps[index].componentProductId = e.target.value;
                          setSetComponents(newComps);
                        }}
                        options={products.filter(p => (p as any).productType !== 'SET').map(p => ({ value: p.id, label: p.name }))}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        label="Adet"
                        type="number"
                        min="1"
                        value={comp.quantity}
                        onChange={(e) => {
                          const newComps = [...setComponents];
                          newComps[index].quantity = parseInt(e.target.value) || 1;
                          setSetComponents(newComps);
                        }}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        label="Fiyat Payı"
                        type="number"
                        min="0"
                        step="0.01"
                        value={comp.priceShare}
                        onChange={(e) => {
                          const newComps = [...setComponents];
                          newComps[index].priceShare = parseFloat(e.target.value) || 0;
                          setSetComponents(newComps);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSetComponents(setComponents.filter((_, i) => i !== index))}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-md mt-5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSetComponents([...setComponents, { componentProductId: '', quantity: 1, priceShare: 0, sortOrder: setComponents.length }])}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Bileşen Ekle
                </Button>
                {setComponents.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Toplam Fiyat Payı: {setComponents.reduce((sum, c) => sum + c.priceShare, 0).toFixed(2)} TL
                    {formData.setPrice > 0 && ` / Set Fiyatı: ${formData.setPrice.toFixed(2)} TL`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Store Configuration */}
          <div className="border-t border-border pt-4">
            <ProductStoreList
              stores={stores}
              selectedStoreIds={selectedStoreIds}
              connectedStoreIds={connectedStoreIds}
              storeConfigs={storeConfigs}
              integrationConfigs={integrationConfigs}
              getStoreIntegrations={getStoreIntegrations}
              onStoreSelectionChange={handleStoreSelectionChange}
              onStoreConfigChange={updateStoreConfig}
              onIntegrationConfigChange={updateIntegrationConfig}
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
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </>
  );
}
