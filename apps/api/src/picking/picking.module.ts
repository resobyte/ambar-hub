import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { PickingService } from './picking.service';
import { PickingController } from './picking.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Route,
            RouteOrder,
            Order,
            OrderItem,
            Product,
            ShelfStock,
        ]),
    ],
    controllers: [PickingController],
    providers: [PickingService],
    exports: [PickingService],
})
export class PickingModule { }
