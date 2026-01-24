import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RouteFilterDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value.split(',').filter(Boolean);
        }
        if (Array.isArray(value)) {
            return value;
        }
        return value;
    })
    productBarcodes?: string[];

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    type?: string; // 'single_product' | 'single_product_multi' | 'mixed'

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    integrationId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minOrderCount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxOrderCount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minTotalQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxTotalQuantity?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    overdue?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    micro?: boolean;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsDateString()
    orderDateStart?: string;

    @IsOptional()
    @IsDateString()
    orderDateEnd?: string;

    @IsOptional()
    @IsDateString()
    agreedDeliveryDateStart?: string;

    @IsOptional()
    @IsDateString()
    agreedDeliveryDateEnd?: string;
}
