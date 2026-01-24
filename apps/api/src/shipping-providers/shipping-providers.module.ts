import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingProvidersService } from './shipping-providers.service';
import { ShippingProvidersController } from './shipping-providers.controller';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingProvider, Store])],
  controllers: [ShippingProvidersController],
  providers: [ShippingProvidersService],
  exports: [ShippingProvidersService],
})
export class ShippingProvidersModule {}
