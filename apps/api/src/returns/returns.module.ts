import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { Return } from './entities/return.entity';
import { ReturnItem } from './entities/return-item.entity';
import { Store } from '../stores/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { ShelvesModule } from '../shelves/shelves.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Return, ReturnItem, Store, Product, Order]),
        ShelvesModule,
        forwardRef(() => OrdersModule),
        forwardRef(() => InvoicesModule),
    ],
    controllers: [ReturnsController],
    providers: [ReturnsService],
    exports: [ReturnsService],
})
export class ReturnsModule {}
