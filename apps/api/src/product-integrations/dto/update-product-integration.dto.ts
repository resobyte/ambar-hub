import { IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export class UpdateProductIntegrationDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  integrationSalePrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
