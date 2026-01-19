import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ShelvesModule } from '../shelves/shelves.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PurchaseOrder,
            PurchaseOrderItem,
            GoodsReceipt,
            GoodsReceiptItem,
            Product,
            Supplier,
        ]),
        ShelvesModule,
        InvoicesModule,
    ],
    controllers: [PurchasesController],
    providers: [PurchasesService],
    exports: [PurchasesService],
})
export class PurchasesModule { }
