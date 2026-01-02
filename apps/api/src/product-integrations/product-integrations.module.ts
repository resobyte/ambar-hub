import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductIntegration } from './entities/product-integration.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Integration } from '../integrations/entities/integration.entity';
import { ProductIntegrationsService } from './product-integrations.service';
import { ProductIntegrationsController } from './product-integrations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductIntegration,
      Product,
      ProductStore,
      Integration,
    ]),
  ],
  controllers: [ProductIntegrationsController],
  providers: [ProductIntegrationsService],
  exports: [ProductIntegrationsService],
})
export class ProductIntegrationsModule {}
