import { Store } from '../entities/store.entity';

export class StoreResponseDto {
  id: string;
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Store): StoreResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      proxyUrl: entity.proxyUrl,
      warehouseId: entity.warehouseId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
