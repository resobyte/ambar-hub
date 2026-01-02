import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingProvidersService } from './shipping-providers.service';
import { ShippingProvidersController } from './shipping-providers.controller';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingProvider, IntegrationStore])],
  controllers: [ShippingProvidersController],
  providers: [ShippingProvidersService],
  exports: [ShippingProvidersService],
})
export class ShippingProvidersModule {}
