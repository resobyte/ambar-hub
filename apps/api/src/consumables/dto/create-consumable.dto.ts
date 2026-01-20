import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ConsumableType, ConsumableUnit } from '../entities/consumable.entity';

export class CreateConsumableDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsEnum(ConsumableType)
    type: ConsumableType;

    @IsEnum(ConsumableUnit)
    unit: ConsumableUnit;

    @IsNumber()
    @Min(0)
    @IsOptional()
    minStockLevel?: number;
}

export class UpdateConsumableDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsEnum(ConsumableType)
    @IsOptional()
    type?: ConsumableType;

    @IsEnum(ConsumableUnit)
    @IsOptional()
    unit?: ConsumableUnit;

    @IsNumber()
    @Min(0)
    @IsOptional()
    minStockLevel?: number;

    @IsOptional()
    isActive?: boolean;
}
