import { ProductIntegration } from '../entities/product-integration.entity';

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

  static fromEntity(entity: ProductIntegration, integrationName?: string, integrationType?: string): ProductIntegrationResponseDto {
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
    };
  }
}
