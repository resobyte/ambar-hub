import { IsString, IsEnum, IsUrl, IsOptional, IsBoolean } from 'class-validator';
import { IntegrationType } from '../entities/integration.entity';

export class UpdateIntegrationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(IntegrationType)
  @IsOptional()
  type?: IntegrationType;

  @IsString()
  @IsOptional()
  apiUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
