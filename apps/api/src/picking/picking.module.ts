import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { Shelf } from '../shelves/entities/shelf.entity';
import { PickingService } from './picking.service';
import { PickingController } from './picking.controller';
import { OrdersModule } from '../orders/orders.module';
import { ShelvesModule } from '../shelves/shelves.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Route,
            RouteOrder,
            Order,
            OrderItem,
            Product,
            ShelfStock,
            Shelf,
        ]),
        forwardRef(() => OrdersModule),
        ShelvesModule,
    ],
    controllers: [PickingController],
    providers: [PickingService],
    exports: [PickingService],
})
export class PickingModule { }
