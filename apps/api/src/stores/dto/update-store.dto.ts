import { IsString, IsUUID, IsUrl, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @MaxLength(255)
  proxyUrl?: string;

  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
