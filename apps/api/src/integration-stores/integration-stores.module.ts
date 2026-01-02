import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationStoresService } from './integration-stores.service';
import { IntegrationStoresController } from './integration-stores.controller';
import { IntegrationStore } from './entities/integration-store.entity';
import { Integration } from '../integrations/entities/integration.entity';
import { Store } from '../stores/entities/store.entity';
import { ShippingProvider } from '../shipping-providers/entities/shipping-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationStore, Integration, Store, ShippingProvider])],
  controllers: [IntegrationStoresController],
  providers: [IntegrationStoresService],
  exports: [IntegrationStoresService],
})
export class IntegrationStoresModule {}
