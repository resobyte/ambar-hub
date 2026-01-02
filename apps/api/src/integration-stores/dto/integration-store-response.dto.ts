import { IntegrationStore } from '../entities/integration-store.entity';

export class IntegrationStoreResponseDto {
  id: string;
  integrationId: string;
  storeId: string;
  shippingProviderId: string | null;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeName?: string;
  integrationName?: string;

  static fromEntity(
    entity: IntegrationStore,
    storeName?: string,
    integrationName?: string,
  ): IntegrationStoreResponseDto {
    const dto = new IntegrationStoreResponseDto();
    dto.id = entity.id;
    dto.integrationId = entity.integrationId;
    dto.storeId = entity.storeId;
    dto.shippingProviderId = entity.shippingProviderId;
    dto.sellerId = entity.sellerId;
    dto.apiKey = entity.apiKey;
    dto.apiSecret = entity.apiSecret;
    dto.crawlIntervalMinutes = entity.crawlIntervalMinutes;
    dto.sendStock = entity.sendStock;
    dto.sendPrice = entity.sendPrice;
    dto.sendOrderStatus = entity.sendOrderStatus;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.storeName = storeName || entity.store?.name;
    dto.integrationName = integrationName || entity.integration?.name;
    return dto;
  }
}
