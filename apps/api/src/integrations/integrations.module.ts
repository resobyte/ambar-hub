import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { Integration } from './entities/integration.entity';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { ProductIntegration } from '../product-integrations/entities/product-integration.entity';
import { Product } from '../products/entities/product.entity';

import { ArasKargoService } from './aras/aras-kargo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      IntegrationStore,
      ProductStore,
      ProductIntegration,
      Product,
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ArasKargoService],
  exports: [IntegrationsService, ArasKargoService],
})
export class IntegrationsModule { }
