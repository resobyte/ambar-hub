import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { ShelvesModule } from '../shelves/shelves.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem]),
        ShelvesModule,
    ],
    controllers: [PurchasesController],
    providers: [PurchasesService],
    exports: [PurchasesService],
})
export class PurchasesModule { }
