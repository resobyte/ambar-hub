import { IsString, IsUUID, IsNumber, IsBoolean, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateIntegrationStoreDto {
  @IsUUID()
  @IsNotEmpty()
  integrationId: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsUUID()
  @IsOptional()
  shippingProviderId?: string;

  // Store-specific credentials
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  apiSecret: string;

  // Store-specific settings
  @IsNumber()
  @Min(1)
  crawlIntervalMinutes: number;

  @IsBoolean()
  sendStock: boolean;

  @IsBoolean()
  sendPrice: boolean;

  @IsBoolean()
  sendOrderStatus: boolean;

  @IsBoolean()
  isActive: boolean;
}
