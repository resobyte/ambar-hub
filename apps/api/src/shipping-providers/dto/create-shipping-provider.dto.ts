import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ShippingType } from '../entities/shipping-provider.entity';

export class CreateShippingProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: ShippingType;

  @IsBoolean()
  isActive?: boolean;
}
