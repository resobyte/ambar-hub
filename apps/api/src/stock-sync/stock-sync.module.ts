import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { StockSyncService } from './stock-sync.service';
import { StockSyncController } from './stock-sync.controller';
import { StockUpdateQueue } from './entities/stock-update-queue.entity';
import { StockSyncLog } from './entities/stock-sync-log.entity';
import { Product } from '../products/entities/product.entity';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            StockUpdateQueue,
            StockSyncLog,
            Product,
            ProductSetItem,
            ProductStore,
            Store,
        ]),
        ScheduleModule.forRoot(),
    ],
    controllers: [StockSyncController],
    providers: [StockSyncService],
    exports: [StockSyncService],
})
export class StockSyncModule {}
