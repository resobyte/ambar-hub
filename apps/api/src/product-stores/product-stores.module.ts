import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductStoresService } from './product-stores.service';
import { ProductStoresController } from './product-stores.controller';
import { ProductStore } from './entities/product-store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductStore])],
  controllers: [ProductStoresController],
  providers: [ProductStoresService],
  exports: [ProductStoresService],
})
export class ProductStoresModule {}
