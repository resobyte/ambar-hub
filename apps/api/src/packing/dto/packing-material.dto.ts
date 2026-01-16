import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min, IsBoolean } from 'class-validator';
import { PackingMaterialType } from '../entities/packing-material.entity';

export class CreatePackingMaterialDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(PackingMaterialType)
    type: PackingMaterialType;

    @IsInt()
    @Min(0)
    stockQuantity: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    lowStockThreshold?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdatePackingMaterialDto extends CreatePackingMaterialDto { }
