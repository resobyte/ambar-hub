import { IsString, IsUUID, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class CreateProductIntegrationDto {
  @IsUUID()
  productStoreId: string;

  @IsUUID()
  integrationId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  integrationSalePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
