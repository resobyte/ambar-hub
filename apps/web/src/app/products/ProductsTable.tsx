'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import {
  getProducts,
  importProducts,
  downloadImportTemplate,
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
  getBrands,
  getCategories,
  Brand,
  Category,
  Product,
  ProductFilters,
} from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { ProductStoreList } from '@/components/products/ProductStoreList';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Pencil, Trash2, Plus, Upload, Download, Search } from 'lucide-react';


interface ProductStore {
  id: string;
  productId: string;
  storeId: string;
  storeName?: string;
  storeSku: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  sellableQuantity: number;
  reservableQuantity: number;
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
  brandId: string;
  categoryId: string;
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
  sellableQuantity?: number;
  reservableQuantity?: number;
  isActive: boolean;
}

interface IntegrationConfigData {
  integrationId: string;
  integrationSalePrice: number;
  isActive: boolean;
}

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
  // URL-synced table query state
  const { page, pageSize, filters: urlFilters, setPage, setPageSize, setFilter } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 10,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [productStores, setProductStores] = useState<ProductStore[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
  const [productIntegrations, setProductIntegrations] = useState<ProductIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Filter values from URL
  const filterName = urlFilters.name || '';
  const filterIsActive = urlFilters.isActive || '';
  const filterBrandId = urlFilters.brandId || '';
  const filterCategoryId = urlFilters.categoryId || '';

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brandId: '',
    categoryId: '',
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
    brandId: '',
    categoryId: '',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const limit = 10;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await importProducts(file);
      if (res.errors && res.errors.length > 0) {
        toast({ variant: 'destructive', title: 'Uyarı', description: `Bazı satırlar yüklenemedi: ${res.errors.length} hata.` });
        console.error(res.errors);
      } else {
        toast({ title: 'Başarılı', description: `${res.success} ürün başarıyla yüklendi.`, variant: 'success' });
      }
      fetchProducts();
      fetchBrandsAndCategories();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'Dosya yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'urun_yukleme_sablonu.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'Şablon indirilemedi' });
    }
  };

  const filters: ProductFilters = useMemo(() => ({
    name: filterName || undefined,
    isActive: filterIsActive || undefined,
    brandId: filterBrandId || undefined,
    categoryId: filterCategoryId || undefined,
  }), [filterName, filterIsActive, filterBrandId, filterCategoryId]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProducts(page, pageSize, filters);
      setProducts(response.data);
      setTotal(response.meta.total);
      setTotalPages(Math.ceil(response.meta.total / pageSize));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ürünler yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, toast]);

  const fetchBrandsAndCategories = useCallback(async () => {
    try {
      const [brandsRes, categoriesRes] = await Promise.all([getBrands(), getCategories()]);
      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Tanımlamalar yüklenemedi' });
    }
  }, [toast]);

  const fetchStores = useCallback(async () => {
    try {
      const response = await getStores(1, 100);
      setStores(response.data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Mağazalar yüklenemedi' });
    }
  }, [toast]);

  const fetchProductStores = useCallback(async () => {
    try {
      const data = await getProductStores();
      setProductStores(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ürün-mağaza bağlantıları yüklenemedi' });
    }
  }, [toast]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await getIntegrations(1, 100);
      setIntegrations(response.data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Entegrasyonlar yüklenemedi' });
    }
  }, [toast]);

  const fetchIntegrationStores = useCallback(async () => {
    try {
      const data = await getIntegrationStores();
      setIntegrationStores(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Entegrasyon-mağaza bağlantıları yüklenemedi' });
    }
  }, [toast]);

  const fetchProductIntegrations = useCallback(async () => {
    try {
      const data = await getProductIntegrations();
      setProductIntegrations(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ürün-entegrasyon bağlantıları yüklenemedi' });
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
    fetchStores();
    fetchProductStores();
    fetchIntegrations();
    fetchIntegrationStores();
    fetchProductIntegrations();
    fetchBrandsAndCategories();
  }, [fetchProducts, fetchStores, fetchProductStores, fetchIntegrations, fetchIntegrationStores, fetchProductIntegrations, fetchBrandsAndCategories]);

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
      brandId: '',
      categoryId: '',
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

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    const newData = {
      name: product.name,
      brandId: product.brand?.id || '',
      categoryId: product.category?.id || '',
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
        sellableQuantity: ps.sellableQuantity,
        reservableQuantity: ps.reservableQuantity,
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
        toast({ title: 'Başarılı', description: 'Ürün başarıyla güncellendi', variant: 'success' });
      } else {
        const created = await createProduct(currentFormData);
        productId = created.data.id;
        toast({ title: 'Başarılı', description: 'Ürün başarıyla oluşturuldu', variant: 'success' });
      }

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
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'İşlem başarısız' });
    }
  }, [editingProduct, selectedStoreIds, storeConfigs, integrationConfigs, productStores, productIntegrations, fetchProducts, fetchProductStores, fetchProductIntegrations, toast, setComponents]);

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
          sellableQuantity: 0,
          reservableQuantity: 0,
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
        sellableQuantity: 0,
        reservableQuantity: 0,
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
      toast({ title: 'Başarılı', description: 'Ürün başarıyla silindi', variant: 'success' });
      setIsDeleteModalOpen(false);
      fetchProducts();
      fetchProductStores();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'Silme başarısız' });
    }
  }, [deletingProductId, fetchProducts, fetchProductStores, toast]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ürünler</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Excel Yükle
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate} title="Örnek Excel Şablonu İndir">
            <Download className="w-4 h-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Ürün Ekle
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ürün Adı</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={filterName}
                  onChange={(e) => setFilter('name', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Durum</Label>
              <Combobox
                options={[
                  { value: '', label: 'Tümü' },
                  { value: 'true', label: 'Aktif' },
                  { value: 'false', label: 'Pasif' },
                ]}
                value={filterIsActive}
                onValueChange={(v) => setFilter('isActive', v)}
                placeholder="Tümü"
                searchPlaceholder="Ara..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Marka</Label>
              <Combobox
                options={[
                  { value: '', label: 'Tümü' },
                  ...brands.map(b => ({ value: b.id, label: b.name }))
                ]}
                value={filterBrandId}
                onValueChange={(v) => setFilter('brandId', v)}
                placeholder="Tümü"
                searchPlaceholder="Marka ara..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Kategori</Label>
              <Combobox
                options={[
                  { value: '', label: 'Tümü' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={filterCategoryId}
                onValueChange={(v) => setFilter('categoryId', v)}
                placeholder="Tümü"
                searchPlaceholder="Kategori ara..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Marka</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>Fiyatlar</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Mağazalar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Henüz ürün yok. İlk ürününüzü ekleyin.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        {product.sku && <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.brand?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{product.barcode || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                          <span className="text-xs">Alış:</span>
                          <span className="text-xs font-medium">{product.purchasePrice ? `₺${product.purchasePrice.toLocaleString('tr-TR')}` : '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <span className="text-xs">Satış:</span>
                          <span className="text-xs font-medium">{product.salePrice ? `₺${product.salePrice.toLocaleString('tr-TR')}` : '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground w-16">Stok:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{product.totalStockQuantity}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground w-16">Satılabilir:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{product.totalSellableQuantity}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground w-16">Rezerve:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">{product.totalReservableQuantity}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.storeCount}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}
                        className={product.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Ürün Düzenle' : 'Ürün Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Information */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Ürün Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ürün Adı</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    required
                    placeholder="Ürün adı"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marka</Label>
                  <Select value={formData.brandId} onValueChange={(v) => updateFormField('brandId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Marka Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => updateFormField('categoryId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Barkod</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => updateFormField('barcode', e.target.value)}
                    placeholder="Barkod"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => updateFormField('sku', e.target.value)}
                    placeholder="SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>KDV Oranı</Label>
                  <Select value={String(formData.vatRate)} onValueChange={(v) => updateFormField('vatRate', parseFloat(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Desi</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.desi}
                    onChange={(e) => updateFormField('desi', parseFloat(e.target.value) || 0)}
                    placeholder="Weight/Volume"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alış Fiyatı</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => updateFormField('purchasePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Satış Fiyatı</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => updateFormField('salePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Son Satış Fiyatı</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.lastSalePrice}
                    onChange={(e) => updateFormField('lastSalePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ürün Tipi</Label>
                  <Select value={formData.productType} onValueChange={(v) => updateFormField('productType', v as 'SIMPLE' | 'SET')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.productType === 'SET' && (
                  <div className="space-y-2">
                    <Label>Set Fiyatı</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.setPrice}
                      onChange={(e) => updateFormField('setPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                )}
                <div className="md:col-span-3 space-y-2">
                  <Label>Durum</Label>
                  <Select value={formData.isActive ? 'active' : 'passive'} onValueChange={(v) => updateFormField('isActive', v === 'active')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="passive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <div className="flex-1 space-y-2">
                        <Label>Ürün</Label>
                        <Select
                          value={comp.componentProductId}
                          onValueChange={(v) => {
                            const newComps = [...setComponents];
                            newComps[index].componentProductId = v;
                            setSetComponents(newComps);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Ürün seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter(p => (p as any).productType !== 'SET').map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Adet</Label>
                        <Input
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
                      <div className="w-32 space-y-2">
                        <Label>Fiyat Payı</Label>
                        <Input
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5"
                        onClick={() => setSetComponents(setComponents.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSetComponents([...setComponents, { componentProductId: '', quantity: 1, priceShare: 0, sortOrder: setComponents.length }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
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
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={!canSubmit}>{editingProduct ? 'Güncelle' : 'Oluştur'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürün Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
