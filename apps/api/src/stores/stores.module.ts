import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Product } from '../products/entities/product.entity';
import { ArasKargoService } from './providers/aras-kargo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, ProductStore, Product]),
    WarehousesModule,
  ],
  controllers: [StoresController],
  providers: [StoresService, ArasKargoService],
  exports: [StoresService, ArasKargoService],
})
export class StoresModule {}
