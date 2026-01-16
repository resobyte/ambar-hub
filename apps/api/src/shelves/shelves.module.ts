import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShelvesController } from './shelves.controller';
import { ShelvesService } from './shelves.service';
import { Shelf } from './entities/shelf.entity';
import { ShelfStock } from './entities/shelf-stock.entity';

import { ProductStore } from '../product-stores/entities/product-store.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Shelf, ShelfStock, ProductStore])],
    controllers: [ShelvesController],
    providers: [ShelvesService],
    exports: [ShelvesService],
})
export class ShelvesModule { }
