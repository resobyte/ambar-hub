import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { ShelfType } from '../enums/shelf-type.enum';

export class CreateShelfDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsEnum(ShelfType)
    @IsOptional()
    type?: ShelfType;

    @IsUUID()
    @IsNotEmpty()
    warehouseId: string;

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
    isShelvable?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}
