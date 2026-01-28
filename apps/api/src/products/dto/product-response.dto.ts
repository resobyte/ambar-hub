import { ProductSetItem } from '../entities/product-set-item.entity';

export interface ProductSetItemResponseDto {
  id: string;
  componentProductId: string;
  componentProductName: string;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}

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
  
  // SET ürün bilgileri
  productType: 'SIMPLE' | 'SET';
  setPrice: number | null;
  setItems?: ProductSetItemResponseDto[];

  static fromEntity(entity: any, storeCount: number = 0): ProductResponseDto {
    const productStores = entity.productStores || [];
    
    // Use global stock from Product entity directly
    const totalStockQuantity = Number(entity.stockQuantity) || 0;
    const totalSellableQuantity = Number(entity.sellableQuantity) || 0;
    const totalReservableQuantity = Number(entity.reservedQuantity) || 0;

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
