import { ProductIntegration } from '../entities/product-integration.entity';

export interface ProductInfo {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
}

export interface StoreInfo {
  id: string;
  name: string;
  storeSalePrice: number | null;
}

export class ProductIntegrationResponseDto {
  id: string;
  productStoreId: string;
  integrationId: string;
  integrationName?: string;
  integrationType?: string;
  integrationSalePrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: ProductInfo;
  store?: StoreInfo;

  static fromEntity(
    entity: ProductIntegration,
    integrationName?: string,
    integrationType?: string,
    product?: ProductInfo,
    store?: StoreInfo,
  ): ProductIntegrationResponseDto {
    return {
      id: entity.id,
      productStoreId: entity.productStoreId,
      integrationId: entity.integrationId,
      integrationName,
      integrationType,
      integrationSalePrice: entity.integrationSalePrice,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      product,
      store,
    };
  }
}
