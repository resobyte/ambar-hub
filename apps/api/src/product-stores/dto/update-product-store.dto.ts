import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class UpdateProductStoreDto {
  @IsString()
  @IsOptional()
  storeSku?: string;

  @IsString()
  @IsOptional()
  storeBarcode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  storeSalePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
