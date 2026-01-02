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
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: any, storeCount: number = 0): ProductResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      brand: entity.brand || null,
      category: entity.category,
      barcode: entity.barcode || null,
      sku: entity.sku,
      vatRate: entity.vatRate,
      desi: entity.desi || null,
      purchasePrice: Number(entity.purchasePrice) || 0,
      salePrice: Number(entity.salePrice) || 0,
      lastSalePrice: entity.lastSalePrice ? Number(entity.lastSalePrice) : null,
      isActive: entity.isActive,
      storeCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
