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

  static fromEntity(entity: any, storeCount: number = 0): ProductResponseDto {
    const productStores = entity.productStores || [];
    const totalStockQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.stockQuantity) || 0), 0);
    const totalSellableQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.sellableQuantity) || 0), 0);
    const totalReservableQuantity = productStores.reduce((sum: number, ps: any) => sum + (Number(ps.reservableQuantity) || 0), 0);

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
      storeCount: storeCount || productStores.length,
      totalStockQuantity,
      totalSellableQuantity,
      totalReservableQuantity,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
