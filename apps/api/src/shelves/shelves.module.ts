import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShelvesController } from './shelves.controller';
import { ShelvesService } from './shelves.service';
import { Shelf } from './entities/shelf.entity';
import { ShelfStock } from './entities/shelf-stock.entity';
import { ShelfConsumableStock } from './entities/shelf-consumable-stock.entity';
import { ShelfStockMovement } from './entities/shelf-stock-movement.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { StockSyncModule } from '../stock-sync/stock-sync.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Shelf, ShelfStock, ProductStore, ShelfConsumableStock, ShelfStockMovement]),
        forwardRef(() => StockSyncModule),
    ],
    controllers: [ShelvesController],
    providers: [ShelvesService],
    exports: [ShelvesService],
})
export class ShelvesModule { }
