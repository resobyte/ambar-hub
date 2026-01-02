import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateShippingProviderDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
