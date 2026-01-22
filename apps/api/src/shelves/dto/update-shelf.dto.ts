import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { ShelfType } from '../enums/shelf-type.enum';

export class UpdateShelfDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsEnum(ShelfType)
    @IsOptional()
    type?: ShelfType;

    @IsUUID()
    @IsOptional()
    warehouseId?: string;

    @IsUUID()
    @IsOptional()
    parentId?: string;

    @IsNumber()
    @IsOptional()
    globalSlot?: number;

    @IsNumber()
    @IsOptional()
    rafId?: number;

    @IsBoolean()
    @IsOptional()
    isSellable?: boolean;

    @IsBoolean()
    @IsOptional()
    isPickable?: boolean;

    @IsBoolean()
    @IsOptional()
    isShelvable?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}
