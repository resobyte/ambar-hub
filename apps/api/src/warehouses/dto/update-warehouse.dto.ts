import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
