import { IsString, IsEnum, IsUrl, IsOptional, IsBoolean } from 'class-validator';
import { IntegrationType } from '../entities/integration.entity';

export class CreateIntegrationDto {
  @IsString()
  name: string;

  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsUrl()
  @IsOptional()
  apiUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
