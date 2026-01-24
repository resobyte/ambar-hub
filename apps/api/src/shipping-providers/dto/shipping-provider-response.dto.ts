import { ShippingProvider } from '../entities/shipping-provider.entity';

export class ShippingProviderResponseDto {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  storeCount: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ShippingProvider, storeCount: number = 0): ShippingProviderResponseDto {
    const dto = new ShippingProviderResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.isActive = entity.isActive;
    dto.storeCount = storeCount;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
