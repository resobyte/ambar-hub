# SET Ürünlerinde Set Items Bilgisi Gelmiyor - Sorun Analizi ve Çözüm Planı

## Sorun

SET tipi ürünlerde "Ürün Güncelle" veya ürün detay sayfası açıldığında, set'in içindeki ürünlerin (component products) listesi gelmiyor.

## Kök Neden Analizi

### 1. Backend Sorunu

#### Product Entity'sinde Relation Eksikliği
**Dosya**: [`apps/api/src/products/entities/product.entity.ts`](apps/api/src/products/entities/product.entity.ts:77-78)

```typescript
// Mevcut durum - Sadece productStores relation var
@OneToMany(() => ProductStore, (ps) => ps.product, { cascade: true })
productStores: ProductStore[];

// EKSİK: setItems relation yok!
```

**ProductSetItem entity'sinde** setProduct ve componentProduct relations var ama Product entity'sinden setItems'e reverse relation yok.

#### findOne Metodunda Relation Yüklenmiyor
**Dosya**: [`apps/api/src/products/products.service.ts`](apps/api/src/products/products.service.ts:105-116)

```typescript
async findOne(id: string): Promise<ProductResponseDto> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['productStores'],  // Sadece productStores yükleniyor
  });
  // ...
}
```

**Sorun**: `setItems` relation'ı yüklenmiyor.

#### ProductResponseDto'da Field Eksikliği
**Dosya**: [`apps/api/src/products/dto/product-response.dto.ts`](apps/api/src/products/dto/product-response.dto.ts:1-48)

```typescript
export class ProductResponseDto {
  id: string;
  name: string;
  // ... diğer alanlar
  // EKSİK: productType, setPrice, setItems alanları yok
}
```

### 2. Frontend Sorunu

#### Product Interface'inde Alanlar Eksik
**Dosya**: [`apps/web/src/lib/api.ts`](apps/web/src/lib/api.ts:213-232)

```typescript
export interface Product {
  id: string;
  name: string;
  // ... diğer alanlar
  // EKSİK: productType, setPrice, setItems alanları yok
}
```

#### ProductDetailClient'da SET Yönetimi Yok
**Dosya**: [`apps/web/src/app/products/[id]/ProductDetailClient.tsx`](apps/web/src/app/products/[id]/ProductDetailClient.tsx:273-283)

```typescript
<TabsList>
  <TabsTrigger value="stores">Mağazalar</TabsTrigger>
  <TabsTrigger value="info">Detaylar</TabsTrigger>
  {/* EKSİK: SET ürünler için "Set İçeriği" tab'ı yok */}
</TabsList>
```

## Çözüm Planı

### Adım 1: Backend - Product Entity Güncellemesi

**Dosya**: `apps/api/src/products/entities/product.entity.ts`

```typescript
import { ProductSetItem } from './product-set-item.entity';

@Entity('products')
export class Product extends BaseEntity {
  // ... mevcut alanlar

  // SET ürünleri için relation
  @OneToMany(() => ProductSetItem, (psi) => psi.setProduct, { cascade: true })
  setItems: ProductSetItem[];

  // Component olarak kullanıldığı SET'ler
  @OneToMany(() => ProductSetItem, (psi) => psi.componentProduct)
  componentOfSets: ProductSetItem[];
}
```

### Adım 2: Backend - ProductSetItem Entity Güncellemesi

**Dosya**: `apps/api/src/products/entities/product-set-item.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_set_items')
export class ProductSetItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'set_product_id' })
  setProductId: string;

  @ManyToOne(() => Product, (p) => p.setItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'set_product_id' })
  setProduct: Product;

  @Column({ name: 'component_product_id' })
  componentProductId: string;

  @ManyToOne(() => Product, (p) => p.componentOfSets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_product_id' })
  componentProduct: Product;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_share', default: 0 })
  priceShare: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
```

### Adım 3: Backend - Service Metotları Güncellemesi

**Dosya**: `apps/api/src/products/products.service.ts`

```typescript
async findOne(id: string): Promise<ProductResponseDto> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['productStores', 'brand', 'category', 'setItems', 'setItems.componentProduct'],
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  return ProductResponseDto.fromEntity(product);
}

async update(
  id: string,
  updateProductDto: UpdateProductDto,
): Promise<ProductResponseDto> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['productStores', 'brand', 'category', 'setItems', 'setItems.componentProduct'],
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  Object.assign(product, updateProductDto);
  const updated = await this.productRepository.save(product);

  // Güncellenmiş ürünü tekrar relations ile yükle
  const reloaded = await this.productRepository.findOne({
    where: { id: updated.id },
    relations: ['productStores', 'brand', 'category', 'setItems', 'setItems.componentProduct'],
  });

  return ProductResponseDto.fromEntity(reloaded!);
}
```

### Adım 4: Backend - ProductResponseDto Güncellemesi

**Dosya**: `apps/api/src/products/dto/product-response.dto.ts`

```typescript
import { ProductSetItem } from '../entities/product-set-item.entity';

export class ProductResponseDto {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  barcode: string | null;
  sku: string;
  vatRate: number;
  desi: number | null;
  purchasePrice: number;
  salePrice: number;
  lastSalePrice: number | null;
  isActive: boolean;
  storeCount: number;
  totalStockQuantity: number;
  totalSellableQuantity: number;
  totalReservableQuantity: number;
  createdAt: string;
  updatedAt: string;

  // YENİ: SET ürün bilgileri
  productType: 'SIMPLE' | 'SET';
  setPrice: number | null;
  setItems?: ProductSetItemResponseDto[];

  static fromEntity(entity: any, storeCount: number = 0): ProductResponseDto {
    const productStores = entity.productStores || [];
    const totalStockQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.stockQuantity) || 0), 0);
    const totalSellableQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.sellableQuantity) || 0), 0);
    const totalReservableQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.reservableQuantity) || 0), 0);

    return {
      id: entity.id,
      name: entity.name,
      brand: entity.brand?.name || null,
      category: entity.category?.name || '',
      barcode: entity.barcode || null,
      sku: entity.sku,
      vatRate: entity.vatRate,
      desi: entity.desi || null,
      purchasePrice: Number(entity.purchasePrice) || 0,
      salePrice: Number(entity.salePrice) || 0,
      lastSalePrice: entity.lastSalePrice ? Number(entity.lastSalePrice) : null,
      isActive: entity.isActive,
      storeCount: storeCount || productStores.length,
      totalStockQuantity,
      totalSellableQuantity,
      totalReservableQuantity,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // YENİ
      productType: entity.productType,
      setPrice: entity.setPrice ? Number(entity.setPrice) : null,
      setItems: entity.setItems?.map((item: ProductSetItem) => ({
        id: item.id,
        componentProductId: item.componentProductId,
        componentProductName: item.componentProduct?.name || '',
        quantity: item.quantity,
        priceShare: Number(item.priceShare),
        sortOrder: item.sortOrder,
      })) || [],
    };
  }
}

export interface ProductSetItemResponseDto {
  id: string;
  componentProductId: string;
  componentProductName: string;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}
```

### Adım 5: Frontend - Product Interface Güncellemesi

**Dosya**: `apps/web/src/lib/api.ts`

```typescript
export interface ProductSetItem {
  id: string;
  componentProductId: string;
  componentProductName: string;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  brand: Brand | null;
  category: Category | null;
  barcode: string | null;
  sku: string | null;
  vatRate: number;
  desi: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  lastSalePrice: number | null;
  isActive: boolean;
  storeCount: number;
  totalStockQuantity: number;
  totalSellableQuantity: number;
  totalReservableQuantity: number;
  createdAt: string;
  updatedAt: string;

  // YENİ: SET ürün bilgileri
  productType?: 'SIMPLE' | 'SET';
  setPrice?: number | null;
  setItems?: ProductSetItem[];
}
```

### Adım 6: Frontend - ProductDetailClient Güncellemesi

**Dosya**: `apps/web/src/app/products/[id]/ProductDetailClient.tsx`

```typescript
// State'e ekle
const [setItems, setSetItems] = useState<ProductSetItem[]>([]);
const [allProducts, setAllProducts] = useState<Product[]>([]);

// fetchData'ya ekle
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const [productRes, storesRes, productStoresRes, allProductsRes] = await Promise.all([
      getProduct(productId),
      getStores(1, 100),
      getProductStores(productId),
      getProducts(1, 1000), // Tüm ürünleri getir (SET item seçimi için)
    ]);

    setProduct(productRes.data);
    setStores(storesRes.data || []);
    setProductStores(productStoresRes || []);
    setAllProducts(allProductsRes.data || []);
    setSetItems(productRes.data.setItems || []);
  } catch (error: any) {
    toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Veri yüklenemedi' });
  } finally {
    setLoading(false);
  }
}, [productId, toast]);

// Tabs'a yeni tab ekle
<TabsList>
  <TabsTrigger value="stores">Mağazalar</TabsTrigger>
  {product?.productType === 'SET' && (
    <TabsTrigger value="set-items">Set İçeriği</TabsTrigger>
  )}
  <TabsTrigger value="info">Detaylar</TabsTrigger>
</TabsList>

// Set Items Tab Content
<TabsContent value="set-items">
  <Card>
    <CardHeader>
      <div className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Set Ürünleri</CardTitle>
          <CardDescription>
            Bu set'in içindeki ürünleri yönetin
          </CardDescription>
        </div>
        <Button onClick={handleAddSetItem}>
          <Plus className="w-4 h-4 mr-2" />
          Ürün Ekle
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      {setItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Henüz set ürünü eklenmemiş</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sıra</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead className="text-right">Adet</TableHead>
              <TableHead className="text-right">Fiyat Payı</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.sortOrder + 1}</TableCell>
                <TableCell className="font-medium">{item.componentProductName}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.priceShare} ₺</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSetItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

## Özet

### Sorun
SET ürünlerde ürün detayı getirildiğinde set'in içindeki ürünler (setItems) gelmiyor.

### Nedenler
1. Backend'de Product entity'sinde `setItems` relation'ı yok
2. `findOne` ve `update` metodlarında `setItems` relation'ı yüklenmiyor
3. `ProductResponseDto`'da `productType`, `setPrice`, `setItems` alanları yok
4. Frontend'de `Product` interface'inde bu alanlar yok
5. Frontend'de SET ürünleri için UI tab'ı yok

### Çözüm
1. Backend entity'lerde relation'ları ekle
2. Service metodlarında relation'ları yükle
3. DTO'ya gerekli alanları ekle
4. Frontend interface'ini güncelle
5. Frontend'de SET yönetim UI'ı ekle
