import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ConsumableType, ConsumableUnit } from '../entities/consumable.entity';

export class CreateConsumableDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsEnum(ConsumableType)
    type: ConsumableType;

    @IsEnum(ConsumableUnit)
    unit: ConsumableUnit;

    @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
    @IsNumber()
    @Min(0)
    @IsOptional()
    minStockLevel?: number;

    @IsUUID()
    @IsOptional()
    parentId?: string;

    @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
    @IsNumber()
    @Min(0)
    @IsOptional()
    conversionQuantity?: number;
}

export class UpdateConsumableDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsEnum(ConsumableType)
    @IsOptional()
    type?: ConsumableType;

    @IsEnum(ConsumableUnit)
    @IsOptional()
    unit?: ConsumableUnit;

    @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
    @IsNumber()
    @Min(0)
    @IsOptional()
    minStockLevel?: number;

    @IsOptional()
    isActive?: boolean;

    @IsUUID()
    @IsOptional()
    parentId?: string;

    @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
    @IsNumber()
    @Min(0)
    @IsOptional()
    conversionQuantity?: number;
}
