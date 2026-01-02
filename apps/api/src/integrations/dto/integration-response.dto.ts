import { Integration } from '../entities/integration.entity';
import { IntegrationType } from '../entities/integration.entity';

export class IntegrationResponseDto {
  id: string;
  name: string;
  type: IntegrationType;
  apiUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeCount?: number;

  static fromEntity(
    entity: Integration,
    storeCount?: number,
  ): IntegrationResponseDto {
    const dto = new IntegrationResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.apiUrl = entity.apiUrl;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.storeCount = storeCount;
    return dto;
  }
}

export class IntegrationWithStoresResponseDto extends IntegrationResponseDto {
  integrationStores: Array<{
    id: string;
    storeId: string;
    storeName: string;
    sellerId: string;
    crawlIntervalMinutes: number;
    sendStock: boolean;
    sendPrice: boolean;
    sendOrderStatus: boolean;
    isActive: boolean;
  }>;
}
