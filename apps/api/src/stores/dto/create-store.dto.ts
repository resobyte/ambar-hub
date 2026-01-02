import { IsString, IsUUID, MaxLength, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsUrl()
  @MaxLength(255)
  proxyUrl: string;

  @IsUUID()
  warehouseId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
