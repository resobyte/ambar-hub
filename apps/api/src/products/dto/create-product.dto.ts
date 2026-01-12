import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, MaxLength, IsEnum } from 'class-validator';
import { ProductType } from '../enums/product-type.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  barcode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  sku?: string;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  vatRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desi?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  setPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lastSalePrice?: number;

  @IsOptional()
  isActive?: boolean;
}

