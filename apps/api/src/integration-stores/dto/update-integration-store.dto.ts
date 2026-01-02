import { IsString, IsNumber, IsBoolean, IsNotEmpty, Min, IsOptional, IsUUID } from 'class-validator';

export class UpdateIntegrationStoreDto {
  @IsUUID()
  @IsOptional()
  shippingProviderId?: string;

  // Store-specific credentials
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  apiSecret?: string;

  // Store-specific settings
  @IsNumber()
  @Min(1)
  @IsOptional()
  crawlIntervalMinutes?: number;

  @IsBoolean()
  @IsOptional()
  sendStock?: boolean;

  @IsBoolean()
  @IsOptional()
  sendPrice?: boolean;

  @IsBoolean()
  @IsOptional()
  sendOrderStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
