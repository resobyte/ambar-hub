import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductSetItem } from './entities/product-set-item.entity';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { BrandsController } from './brands.controller';
import { CategoriesController } from './categories.controller';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductSetItem, Brand, Category])],
  controllers: [ProductsController, BrandsController, CategoriesController],
  providers: [ProductsService, BrandsService, CategoriesService],
  exports: [ProductsService, BrandsService, CategoriesService],
})
export class ProductsModule { }

