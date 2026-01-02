import { Warehouse } from '../entities/warehouse.entity';

export class WarehouseResponseDto {
  id: string;
  name: string;
  address: string | null;
  storeCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Warehouse, storeCount: number = 0): WarehouseResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      address: entity.address,
      storeCount,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
