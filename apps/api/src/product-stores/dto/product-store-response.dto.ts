import { ProductStore } from '../entities/product-store.entity';

export class ProductStoreResponseDto {
  id: string;
  productId: string;
  productName?: string;
  productBarcode?: string;
  productSku?: string;
  storeId: string;
  storeName?: string;
  storeType?: string;
  storeSku: string | null;
  storeBarcode: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  sellableQuantity: number;
  reservableQuantity: number;
  committedQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ProductStore): ProductStoreResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name,
      productBarcode: entity.product?.barcode,
      productSku: entity.product?.sku,
      storeId: entity.storeId,
      storeName: entity.store?.name,
      storeType: entity.store?.type,
      storeSku: entity.storeSku || null,
      storeBarcode: entity.storeBarcode || null,
      storeSalePrice: entity.storeSalePrice ? Number(entity.storeSalePrice) : null,
      stockQuantity: entity.stockQuantity || 0,
      sellableQuantity: entity.sellableQuantity || 0,
      reservableQuantity: entity.reservableQuantity || 0,
      committedQuantity: entity.committedQuantity || 0,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
