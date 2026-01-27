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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown } from 'lucide-react';
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
  getProductSetItems,
  updateProductSetItems,
  getBrands,
  getCategories,
  Brand,
  Category,
  Product,
  ProductFilters,
} from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Pencil, Trash2, Plus, Upload, Download, Search, ExternalLink } from 'lucide-react';


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

const VAT_RATES = [
  { value: '1', label: '1%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: '20', label: '20%' },
];

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

function ProductCombobox({ products, value, onChange }: {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductCache, setSelectedProductCache] = useState<Product | null>(null);
  const isSearching = search.length >= 2;

  // Arama yapıldığında tüm ürünleri getir
  useEffect(() => {
    if (isSearching) {
      const fetchProducts = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?page=1&limit=100&name=${encodeURIComponent(search)}`, {
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success && data.data) {
            // Sadece SIMPLE ürünleri filtrele
            setAllProducts(data.data.filter((p: Product) => (p as any).productType !== 'SET'));
          }
        } catch (error) {
          console.error('Failed to fetch products:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchProducts();
    } else {
      setAllProducts([]);
    }
  }, [isSearching, search]);

  // value değiştiğinde seçili ürünü bul ve cache'le
  useEffect(() => {
    if (value) {
      const found = products.find((p) => p.id === value) || allProducts.find((p) => p.id === value);
      if (found) {
        setSelectedProductCache(found);
      }
    } else {
      setSelectedProductCache(null);
    }
  }, [value, products, allProducts]);

  // Arama yoksa mevcut products listesini kullan
  const filteredProducts = isSearching ? allProducts : products;
  // Seçili ürünü cache'ten bul (öncelikli), yoksa listelerden ara
  const selectedProduct = selectedProductCache || [...products, ...allProducts].find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : "Ürün seçin..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <div className="p-3 border-b">
            <Input
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className="h-[250px] overflow-y-auto"
            onWheel={(e) => {
              e.stopPropagation();
              e.currentTarget.scrollTop += e.deltaY;
            }}
          >
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Yükleniyor...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search.length >= 2 ? 'Ürün bulunamadı.' : 'Aramak için en az 2 karakter girin.'}
              </div>
            ) : (
              <div>
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductCache(product);
                      onChange(product.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground
                      flex items-center gap-2 transition-colors border-b border-border last:border-b-0
                      ${value === product.id ? 'bg-accent' : ''}
                    `}
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        value === product.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{product.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        SKU: {product.sku || '-'} | Barkod: {product.barcode || '-'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
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
  const [initialSetComponents, setInitialSetComponents] = useState<SetComponentData[]>([]);
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

  useEffect(() => {
    fetchProducts();
    fetchBrandsAndCategories();
  }, [fetchProducts, fetchBrandsAndCategories]);

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

    // Ürün SET tipindeyse ve setItems zaten geldiyse kullan, yoksa API'dan al
    const setItems = (product as any).setItems;
    const mappedSetItems = (Array.isArray(setItems) && setItems.length > 0 ? setItems : []).map((item, index) => ({
      componentProductId: item.componentProductId,
      quantity: item.quantity,
      priceShare: item.priceShare,
      sortOrder: item.sortOrder ?? index,
    }));
    
    if ((product as any).productType === 'SET' && Array.isArray(setItems) && setItems.length > 0) {
      setSetComponents(mappedSetItems);
      setInitialSetComponents(mappedSetItems);
    } else if ((product as any).productType === 'SET') {
      // setItems gelmediyse API'den al (fallback)
      getProductSetItems(product.id).then(items => {
        if (Array.isArray(items)) {
          const mapped = items.map((item, index) => ({
            componentProductId: item.componentProductId,
            quantity: item.quantity,
            priceShare: item.priceShare,
            sortOrder: item.sortOrder ?? index,
          }));
          setSetComponents(mapped);
          setInitialSetComponents(mapped);
        } else {
          setSetComponents([]);
          setInitialSetComponents([]);
        }
      }).catch(() => {
        setSetComponents([]);
        setInitialSetComponents([]);
      });
    } else {
      setSetComponents([]);
      setInitialSetComponents([]);
    }

    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingProductId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentFormData = formDataRef.current;
      let productId: string;
      const isNewProduct = !editingProduct;

      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, currentFormData);
        productId = updated.data.id;
        toast({ title: 'Başarılı', description: 'Ürün başarıyla güncellendi', variant: 'success' });
      } else {
        const created = await createProduct(currentFormData);
        productId = created.data.id;
        toast({
          title: 'Başarılı',
          description: 'Ürün oluşturuldu. Mağazaya eklemek için ürün detayına gidin.',
          variant: 'success',
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.href = `/products/${productId}`}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Detaya Git
            </Button>
          ),
        });
      }

      if (currentFormData.productType === 'SET' && setComponents.length > 0) {
        await updateProductSetItems(productId, setComponents.filter(c => c.componentProductId));
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'İşlem başarısız' });
    }
  }, [editingProduct, fetchProducts, toast, setComponents]);

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


  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0;
  }, [formData.name]);

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // setComponents değiştiyse de güncelleme yapılabilir olmalı
  // Yeni ürün düzenleniyorsa ve setComponents boş değilse, değişiklik var sayılır
  const hasSetComponentsChanged = useMemo(() => {
    if (!editingProduct) return false;
    // initialSetComponents henüz yüklenmediyse (boş array), setComponents doluysa değişiklik var
    if (initialSetComponents.length === 0 && setComponents.length > 0) return true;
    return JSON.stringify(setComponents) !== JSON.stringify(initialSetComponents);
  }, [setComponents, initialSetComponents, editingProduct]);

  const canSubmit = useMemo(() => {
    return isFormValid && (isFormDirty || hasSetComponentsChanged || !editingProduct);
  }, [isFormValid, isFormDirty, hasSetComponentsChanged, editingProduct]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId);
      toast({ title: 'Başarılı', description: 'Ürün başarıyla silindi', variant: 'success' });
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'Silme başarısız' });
    }
  }, [deletingProductId, fetchProducts, toast]);

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
                          onClick={() => window.location.href = `/products/${product.id}`}
                          title="Detaya Git"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
                          title="Sil"
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
                        <ProductCombobox
                          products={products.filter((p) => (p as any).productType !== 'SET')}
                          value={comp.componentProductId}
                          onChange={(value) => {
                            const newComps = [...setComponents];
                            newComps[index].componentProductId = value;
                            setSetComponents(newComps);
                          }}
                        />
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

            {/* Info message about store configuration */}
            {!editingProduct && (
              <div className="border-t border-border pt-4">
                <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                  <p className="text-sm">
                    Ürünü oluşturduktan sonra, ürün detay sayfasından mağazalara ekleyebilirsiniz.
                  </p>
                </div>
              </div>
            )}

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
