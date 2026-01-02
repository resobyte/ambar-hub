export class ProductStoreResponseDto {
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

  static fromEntity(entity: any, storeName?: string): ProductStoreResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      storeId: entity.storeId,
      storeName,
      storeSku: entity.storeSku || null,
      storeSalePrice: entity.storeSalePrice ? Number(entity.storeSalePrice) : null,
      stockQuantity: entity.stockQuantity || 0,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
