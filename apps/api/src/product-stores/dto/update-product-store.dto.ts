import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class UpdateProductStoreDto {
  @IsString()
  @IsOptional()
  storeSku?: string;

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
